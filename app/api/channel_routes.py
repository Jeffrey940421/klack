from flask import Blueprint, request
from sqlalchemy.orm import joinedload
from sqlalchemy import insert
from app.models import Workspace, Channel, WorkspaceUser, ChannelUser, ChannelMessage, ChannelMessageReply, ChannelMessageAttachment, db
from flask_login import current_user, login_required
from app.forms import  ChannelForm, ChannelMessageForm
from app.socket import socketio
from .aws_helper import upload_file_to_s3, get_unique_filename
import json

channel_routes = Blueprint('channel', __name__)

def validation_errors_to_error_messages(validation_errors):
    """
    Simple function that turns the WTForms validation errors into a simple list
    """
    errorMessages = []
    for field in validation_errors:
        for error in validation_errors[field]:
            errorMessages.append(f'{field} : {error}')
    return errorMessages

@channel_routes.route('/<int:id>', methods=['GET'])
@login_required
def channel(id):
    """
    Query for a channel by id and return channel's information
    """
    channel = Channel.query.options(
        joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user),
        joinedload(Channel.creator),
        joinedload(Channel.messages)
    ).filter(Channel.id == id).first()
    if not channel:
      return {"errors": ["Channel is not found"]}, 404
    channel_user = next(
        (channel_user for channel_user in channel.user_associations if channel_user.user_id == current_user.id), None
    )
    if not channel_user:
        return {"errors": ["User is not in the channel"]}, 403
    return channel.to_dict(channel_user)

@channel_routes.route('/current', methods=['GET'])
@login_required
def current_channel():
    """
    Query for all the channels that the user has joined and return channels' information
    """
    channel_users = ChannelUser.query.options(
        joinedload(ChannelUser.channel)
        .joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user),
        joinedload(ChannelUser.channel)
        .joinedload(Channel.creator),
        joinedload(ChannelUser.channel)
        .joinedload(Channel.messages)
    ).filter(
        ChannelUser.user_id == current_user.id
    ).order_by(
        ChannelUser.created_at.asc()
    ).all()
    return {"channels": [channel_user.channel.to_dict(channel_user) for channel_user in channel_users]}

@channel_routes.route('/<int:id>/messages', methods=['GET'])
@login_required
def channel_messages(id):
    """
    Query for messaages in the channel and return messages' information
    """
    size = int(request.args.get('size')) if request.args.get('size') and request.args.get('size').isdigit() and int(request.args.get('size')) > 0 else 50
    page = int(request.args.get('page')) if request.args.get('page') and request.args.get('page').isdigit() and int(request.args.get('page')) > 0 else 1
    channel = Channel.query.get(id)
    if not channel:
        return {"errors": ["Channel is not found"]}, 404
    messages = ChannelMessage.query.options(
        joinedload(ChannelMessage.attachments),
        joinedload(ChannelMessage.sender),
        joinedload(ChannelMessage.channel),
        joinedload(ChannelMessage.replies)
        .joinedload(ChannelMessageReply.sender)
    ).filter(ChannelMessage.channel_id == id).order_by(ChannelMessage.created_at.desc(), ChannelMessage.id.desc()).limit(size).offset((page - 1) * size).all()
    return {
        'messages': [message.to_dict() for message in messages],
        'size': size,
        'page': page
    }

@channel_routes.route('/<int:id>', methods=['PUT'])
@login_required
def edit_channel(id):
    """
    Edit a channel and return channel's information
    """
    form = ChannelForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    channel = Channel.query.options(
        joinedload(Channel.workspace)
        .joinedload(Workspace.user_associations)
        .joinedload(WorkspaceUser.user),
        joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user),
        joinedload(Channel.workspace)
        .joinedload(Workspace.channels),
        joinedload(Channel.messages),
        joinedload(Channel.creator)
    ).filter(Channel.id == id).first()
    if not channel:
        return {"errors": ["Channel is not found"]}, 404
    workspace = channel.workspace
    workspace_user = next(
        (workspace_user for workspace_user in workspace.user_associations if workspace_user.user_id == current_user.id), None)
    channel_user = next(
        (channel_user for channel_user in channel.user_associations if channel_user.user_id == current_user.id), None)
    if not channel_user:
        return {"errors": ["User is not in the channel"]}, 403
    if channel.creator_id != current_user.id and workspace_user.role != "admin":
        return {"errors": ["User is not authorized to edit channel"]}, 403
    if workspace_user.user.active_workspace_id != workspace.id or workspace_user.active_channel_id != channel.id:
        return {"errors": ["User must set the channel as active channel and the workspace as active workspace before editing channel"]}, 403
    if form.validate_on_submit():
        duplicate_channel = next(
            (channel for channel in workspace.channels if channel.name == form.data["name"] and channel.id != id), None)
        if duplicate_channel:
            return {"errors": ["Channel with the same name already existed in the workspace"]}, 403
        if channel.name == "general" and form.data["name"] != "general":
            return {"errors": ["User is not authorized to edit the general channel"]}, 403
        message_values = []
        if form.data["name"] != channel.name:
            message_values.append(
                {
                    "sender_id": current_user.id,
                    "channel_id": id,
                    "content": "Changed channel name",
                    "system_message": True
                }
            )
            channel.name=form.data["name"]
        if form.data["description"] != channel.description:
            message_values.append(
                {
                    "sender_id": current_user.id,
                    "channel_id": id,
                    "content": "Changed channel description",
                    "system_message": True
                }
            )
            channel.description=form.data["description"]
        messages = None
        if len(message_values):
            messageIds = db.session.scalars(insert(ChannelMessage).returning(ChannelMessage.id), message_values).all()
            db.session.commit()
            messages = ChannelMessage.query.options(
                joinedload(ChannelMessage.attachments),
                joinedload(ChannelMessage.sender),
                joinedload(ChannelMessage.channel),
                joinedload(ChannelMessage.replies)
                .joinedload(ChannelMessageReply.sender)
            ).filter(ChannelMessage.id.in_(messageIds)).all()
            for message in messages:
                socketio.emit("send_message", {
                    "senderId": current_user.id,
                    "message": json.dumps(message.to_dict(), default=str)
                }, to=f"channel{id}")
            socketio.emit("edit_channel", {
                "senderId": current_user.id,
                "channel": json.dumps(channel.to_dict(), default=str)
            }, to=f"channel{id}")
        return {
            "channel": channel.to_dict(channel_user),
            "messages": [message.to_dict() for message in messages] if messages else None
        }
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401

@channel_routes.route('/<int:channel_id>/users/<int:user_id>', methods=['PUT'])
@login_required
def add_to_channel(channel_id, user_id):
    """
    Add a user in the workspace to the channel and return the channel's information
    """
    channel = Channel.query.options(
        joinedload(Channel.workspace)
        .joinedload(Workspace.user_associations)
        .joinedload(WorkspaceUser.user),
        joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user),
        joinedload(Channel.workspace)
        .joinedload(Workspace.channels),
        joinedload(Channel.messages),
        joinedload(Channel.creator)
    ).filter(Channel.id == channel_id).first()
    if not channel:
        return {"errors": ["Channel is not found"]}, 404
    workspace = channel.workspace
    target_workspace_user = next(
        (workspace_user for workspace_user in workspace.user_associations if workspace_user.user_id == user_id), None)
    workspace_user = next(
        (workspace_user for workspace_user in workspace.user_associations if workspace_user.user_id == current_user.id), None)
    if not target_workspace_user:
        return {"errors": ["Target user is not in the workspace"]}, 404
    target_user = target_workspace_user.user
    if target_user == current_user:
        return {"errors": ["User is not authorized to add themselves to the channel"]}, 403
    user = next(
        (user for user in channel.users if user.id == current_user.id), None)
    channel_user = next(
        (channel_user for channel_user in channel.user_associations if channel_user.user_id == current_user.id), None)
    if not user:
        return {"errors": ["User is not in the channel"]}, 403
    if target_user in channel.users:
        return {"errors": ["Target user is already in the channel"]}, 403
    if user.active_workspace_id != workspace.id or workspace_user.active_channel_id != channel_id:
        return {"errors": ["User must set the channel as active channel and the workspace as active workspace before adding other users to the channel"]}, 403
    # Create new channel user and message
    message = ChannelMessage(
        sender=target_user,
        channel=channel,
        content="Joined",
        system_message= True
    )
    target_channel_user = ChannelUser(
        channel=channel,
        user=target_user
    )
    db.session.add(target_channel_user)
    db.session.add(message)
    db.session.commit()
    # Emit the system message and the updated channel to all the users in the channel
    socketio.emit("send_message", {
        "senderId": target_user.id,
        "message": json.dumps(message.to_dict(), default=str)
    }, to=f"channel{channel_id}")
    socketio.emit("edit_channel", {
        "senderId": target_user.id,
        "channel": json.dumps(channel.to_dict(), default=str)
    }, to=f"channel{channel_id}")
    # Emite the updated channel and channel messages to the target user
    size = int(request.args.get('size')) if request.args.get('size') and request.args.get('size').isdigit() and int(request.args.get('size')) > 0 else 50
    messages = ChannelMessage.query.options(
        joinedload(ChannelMessage.attachments),
        joinedload(ChannelMessage.sender),
        joinedload(ChannelMessage.channel),
        joinedload(ChannelMessage.replies)
        .joinedload(ChannelMessageReply.sender)
    ).filter(ChannelMessage.channel_id == channel_id).order_by(ChannelMessage.created_at.desc(), ChannelMessage.id.desc()).limit(size).all()
    socketio.emit("join_channel", {
        "channel": json.dumps(channel.to_dict(target_channel_user), default=str),
        "messages": json.dumps([message.to_dict() for message in messages], default=str)
    }, to=f"user{user_id}")
    return {
        "channel": channel.to_dict(channel_user),
        "message": message.to_dict()
    }

@channel_routes.route('/<int:id>/leave', methods=['PUT'])
@login_required
def leave_channel(id):
    """
    Leave a channel and return the updated workspace's information
    """
    channel = Channel.query.options(
        joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user),
        joinedload(Channel.workspace)
        .joinedload(Workspace.channels),
        joinedload(Channel.workspace)
        .joinedload(Workspace.user_associations)
        .joinedload(WorkspaceUser.user),
        joinedload(Channel.messages),
        joinedload(Channel.creator)
    ).filter(Channel.id == id).first()
    if not channel:
        return {"errors": ["Channel is not found"]}, 404
    channel_user = next(
        (channel_user for channel_user in channel.user_associations if channel_user.user_id == current_user.id), None)
    if not channel_user:
        return {"errors": ["User is not in the channel"]}, 403
    if channel.creator_id == current_user.id:
        return {"errors": ["User is not authorized to leave the channel as the channel creator"]}, 403
    if channel.name == "general":
        return {"errors": ["User is not authorized to leave the general channel"]}, 403
    workspace = channel.workspace
    workspace_user = next(
        (workspace_user for workspace_user in workspace.user_associations if workspace_user.user_id == current_user.id), None)
    if current_user.active_workspace_id != workspace.id or workspace_user.active_channel_id != id:
        return {"errors": ["User must set the channel as active channel and the workspace as active workspace before leaving the channel"]}, 403
    # Set the active channel of workspace to the general channel
    general_channel = next(
        (channel for channel in workspace.channels if channel.name == "general"), None)
    workspace_user.active_channel = general_channel
    # Create a new system message
    message = ChannelMessage(
        sender=current_user,
        channel=channel,
        content="Left",
        system_message= True
    )
    db.session.add(message)
    # Delete the channel user
    db.session.delete(channel_user)
    db.session.commit()
    # Emit the system message and the updated channel to all the users in the channel
    socketio.emit("send_message", {
        "senderId": current_user.id,
        "message": json.dumps(message.to_dict(), default=str)
    }, to=f"channel{id}")
    socketio.emit("edit_channel", {
        "senderId": current_user.id,
        "channel": json.dumps(channel.to_dict(None), default=str)
    }, to=f"channel{id}")
    return {'workspace': workspace.to_dict(workspace_user)}

@channel_routes.route('/<int:id>', methods=['DELETE'])
@login_required
def delete_channel(id):
    """
    Delete a channel
    """
    channel = Channel.query.options(
        joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user),
        joinedload(Channel.workspace)
        .joinedload(Workspace.channels)
        .joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user),
        joinedload(Channel.workspace)
        .joinedload(Workspace.user_associations)
        .joinedload(WorkspaceUser.user),
        joinedload(Channel.messages)
        .joinedload(ChannelMessage.attachments),
        joinedload(Channel.messages)
        .joinedload(ChannelMessage.reactions),
        joinedload(Channel.messages)
        .joinedload(ChannelMessage.replies)
    ).filter(Channel.id == id).first()
    if not channel:
        return {"errors": ["Channel is not found"]}, 404
    workspace = channel.workspace
    workspace_user = next(
        (workspace_user for workspace_user in workspace.user_associations if workspace_user.user_id == current_user.id), None)
    if channel.creator_id != current_user.id and workspace_user.role != "admin":
        return {"errors": ["User is not authorized to delete the channel"]}, 403
    if channel.name == "general":
        return {"errors": ["User is not authorized to delete the general channel"]}, 403
    if current_user.active_workspace_id != workspace.id or workspace_user.active_channel_id != id:
        return {"errors": ["User must set the channel as active channel and the workspace as active workspace before deleting the channel"]}, 403
    # Set the active channel of workspace to the general channel
    general_channel = next(
        (channel for channel in workspace.channels if channel.name == "general"), None)
    workspace_user.active_channel = general_channel
    # Delete the channel
    db.session.delete(channel)
    db.session.commit()
    socketio.emit("delete_channel", {
        "senderId": current_user.id,
        "activeChannel": json.dumps(general_channel.to_dict(None), default=str),
        "deletedChannelId": id
    }, to=f"channel{id}")
    return {'workspace': workspace.to_dict(workspace_user)}

@channel_routes.route('/<int:id>/messages/new', methods=['POST'])
@login_required
def create_channel(id):
    """
    Create a message in the channel and return message's information
    """
    form = ChannelMessageForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    channel = Channel.query.options(
        joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user),
        joinedload(Channel.workspace)
        .joinedload(Workspace.user_associations)
        .joinedload(WorkspaceUser.user)
    ).filter(Channel.id == id).first()
    if not channel:
        return {"errors": ["Channel is not found"]}, 404
    workspace = channel.workspace
    channel_user = next(
        (channel_user for channel_user in channel.user_associations if channel_user.user_id == current_user.id), None)
    if not channel_user:
        return {"errors": ["User must join the channel before sending messages"]}, 403
    workspace_user = next(
        (workspace_user for workspace_user in workspace.user_associations if workspace_user.user_id == current_user.id), None)
    if current_user.active_workspace_id != workspace.id or workspace_user.active_channel_id != id:
        return {"errors": ["User must set the channel as active channel and the workspace as active workspace before sending messages"]}, 403
    if form.validate_on_submit():
        # Create the new message
        message = ChannelMessage(
            sender=current_user,
            channel=channel,
            content=form.data["content"]
        )
        db.session.add(message)
        db.session.commit()
        message_id = message.id
        # Create attachments
        attachment_values = []
        for attachment in form.data["attachments"]:
            attachment.filename = get_unique_filename(attachment.filename)
            upload = upload_file_to_s3(attachment)
            if "url" not in upload:
                return {"errors": [upload["errors"]]}, 400
            url = upload["url"]
            attachment_values.append({
                "message_id": message_id,
                "url": url
            })
        if len(attachment_values):
            db.session.execute(insert(ChannelMessageAttachment), attachment_values)
        db.session.commit()
        # Emit the new message to all the users in the channel
        message = ChannelMessage.query.options(
            joinedload(ChannelMessage.attachments),
            joinedload(ChannelMessage.sender),
            joinedload(ChannelMessage.channel),
            joinedload(ChannelMessage.replies)
            .joinedload(ChannelMessageReply.sender)
        ).filter(ChannelMessage.id == message_id).first()
        socketio.emit("send_message", {
            "senderId": current_user.id,
            "message": json.dumps(message.to_dict(), default=str),
            "channel": json.dumps(channel.to_dict(None), default=str)
        }, to=f"channel{id}")
        return {
            "message": message.to_dict(),
            "channel": channel.to_dict(channel_user)
        }
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401
