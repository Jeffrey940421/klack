from flask import Blueprint, jsonify, session, request
from app.models import Workspace, Channel, WorkspaceUser, WorkspaceInvitation, ChannelUser, User, ChannelMessage, db
from flask_login import current_user, login_user, logout_user, login_required
from app.forms import WorkspaceForm, WorkspaceUserForm, NewInvitationForm, ChannelForm, ChannelMessageForm
from random import choice
from app.socket import socketio
import json
import datetime

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
    Query for a channel by id and returns that channel in a dictionary
    """
    channel = Channel.query.get(id)
    if not channel:
      return {"errors": ["Channel is not found"]}, 404
    return channel.to_dict_detail(current_user.id)

@channel_routes.route('/current', methods=['GET'])
@login_required
def current_channel():
    """
    Query for all the channels in the active workspace that the current user is in
    """
    return {"channels": [channel.to_dict_summary(current_user.id) for channel in current_user.channels if channel.workspace_id == current_user.active_workspace_id]}

@channel_routes.route('/<int:id>/messages', methods=['GET'])
@login_required
def channel_messages(id):
    """
    Query for all the messaages in the given channel
    """
    channel = Channel.query.get(id)
    if not channel:
        return {"errors": ["Channel is not found"]}, 404
    return {"messages": [message.to_dict_summary() for message in channel.messages]}

@channel_routes.route('/<int:id>', methods=['PUT'])
@login_required
def edit_channel(id):
    """
    Edit a channel
    """
    form = ChannelForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    channel = Channel.query.get(id)
    if not channel:
        return {"errors": ["Channel is not found"]}, 404
    if channel.creator_id != current_user.id:
        return {"errors": ["Only channel creator is authorized to edit the channel"]}, 403
    if form.validate_on_submit():
        duplicate_channel = Channel.query.filter(Channel.workspace_id == channel.workspace_id, Channel.id != id, Channel.name == form.data["name"]).first()
        if duplicate_channel:
            return {"errors": ["Workspace already had a channel with the same name"]}, 403
        if channel.name == "general" and form.data["name"] != "general":
            return {"errors": ["Cannot edit the name of general channel"]}, 403
        name_message = None
        description_message = None
        if form.data["name"] != channel.name:
            name_message = ChannelMessage(
                sender=current_user,
                channel=channel,
                content="Set channel name",
                system_message=True
            )
            db.session.add(name_message)
        channel.name=form.data["name"]
        if form.data["description"] and form.data["description"] != channel.description:
            description_message = ChannelMessage(
                sender=current_user,
                channel=channel,
                content="Set channel description",
                system_message=True
            )
            db.session.add(description_message)
            channel.description=form.data["description"]
        db.session.commit()
        if name_message:
            socketio.emit("send_message", {"message": json.dumps(name_message.to_dict_summary(), default=str)}, to=f"channel{id}")
        if description_message:
            socketio.emit("send_message", {"message": json.dumps(description_message.to_dict_summary(), default=str)}, to=f"channel{id}")
        socketio.emit("edit_channel", {"channel": json.dumps(channel.to_dict_detail(current_user.id), default=str)}, to=f"channel{id}")
        return channel.to_dict_detail(current_user.id)
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401

@channel_routes.route('/<int:channel_id>/users/<int:user_id>', methods=['PUT'])
@login_required
def add_to_channel(channel_id, user_id):
    """
    Add someone in the workspace to the channel
    """
    channel = Channel.query.get(channel_id)
    user = User.query.get(user_id)
    if not channel:
        return {"errors": ["Channel is not found"]}, 404
    if not user:
        return {"errors": ["User is not found"]}, 404
    if user not in channel.workspace.users:
        return {"errors": ["User must be in the workspace to be added to the channel"]}, 403
    if user == current_user:
        return {"errors": ["Users are not allowed to add themselves to the channel"]}, 403
    if user in channel.users:
        return {"errors": ["Only users that are not in the channel are allowed to be added"]}, 403
    message = ChannelMessage(
        sender=user,
        channel=channel,
        content="Joined",
        system_message= True
    )
    channel_user = ChannelUser(
        channel=channel,
        user=user
    )
    db.session.add(channel_user)
    db.session.add(message)
    db.session.commit()
    socketio.emit("send_message", {"message": json.dumps(message.to_dict_summary(), default=str)}, to=f"channel{channel_id}")
    socketio.emit("edit_channel", {"channel": json.dumps(channel.to_dict_detail(current_user.id), default=str)}, to=f"user{user_id}")
    socketio.emit("edit_channel", {"channel": json.dumps(channel.to_dict_detail(current_user.id), default=str)}, to=f"channel{channel_id}")
    return channel.to_dict_detail(current_user.id)

@channel_routes.route('/<int:id>/leave', methods=['PUT'])
@login_required
def leave_channel(id):
    """
    Leave a channel
    """
    channel = Channel.query.get(id)
    if not channel:
        return {"errors": ["Channel is not found"]}, 404
    if current_user not in channel.users:
        return {"errors": ["Only users that are in the channel can leave the channel"]}, 404
    if current_user == channel.creator:
        return {"errors": ["Channel creator cannot leave the channel"]}, 403
    if channel.name == "general":
        return {"errors": ["User is not allowed leave general channel"]}, 403
    channel_user = ChannelUser.query.get((channel.id, current_user.id))
    workspace = channel.workspace
    workspace_user = WorkspaceUser.query.get((workspace.id, current_user.id))
    channels = [channel for channel in current_user.channels if channel.workspace_id == workspace.id]
    workspace_user.active_channel = channels[0]
    message = ChannelMessage(
        sender=current_user,
        channel=channel,
        content="Left",
        system_message= True
    )
    db.session.add(message)
    db.session.delete(channel_user)
    db.session.commit()
    socketio.emit("send_message", {"message": json.dumps(message.to_dict_summary(), default=str)}, to=f"channel{id}")
    socketio.emit("edit_channel", {"channel": json.dumps(channel.to_dict_detail(current_user.id), default=str)}, to=f"channel{id}")
    return {'activeChannel': workspace_user.active_channel.to_dict_detail(current_user.id)}

@channel_routes.route('/<int:id>', methods=['DELETE'])
@login_required
def delete_channel(id):
    """
    Delete a channel
    """
    channel = Channel.query.get(id)
    workspace = channel.workspace
    if not channel:
        return {"errors": ["Channel is not found"]}, 404
    if current_user != channel.creator:
        return {"errors": ["Only channel creator can delete the channel"]}, 403
    if channel.name == "general":
        return {"errors": ["Cannot delete general channel"]}, 403
    db.session.delete(channel)
    db.session.commit()
    workspace_user = WorkspaceUser.query.get((workspace.id, current_user.id))
    channels = [channel for channel in current_user.channels if channel.workspace_id == workspace.id]
    workspace_user.active_channel = channels[0]
    db.session.commit()
    socketio.emit("delete_channel", {"channel": json.dumps(workspace_user.active_channel.to_dict_detail(current_user.id), default=str), "id": id}, to=f"channel{id}")
    return {'activeChannel': workspace_user.active_channel.to_dict_detail(current_user.id)}

@channel_routes.route('/<int:id>/messages/new', methods=['POST'])
@login_required
def create_channel(id):
    """
    Create a message in the channel
    """
    form = ChannelMessageForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    channel = Channel.query.get(id)
    if not channel:
        return {"errors": ["Channel is not found"]}, 404
    if current_user not in channel.users:
        return {"errors": ["Only users in the channel are allowed to create message"]}, 403
    if form.validate_on_submit():
        message = ChannelMessage(
            sender=current_user,
            channel=channel,
            content=form.data["content"]
        )
        db.session.add(message)
        db.session.commit()
        socketio.emit("send_message", {"message": json.dumps(message.to_dict_summary(), default=str)}, to=f"channel{id}")
        return message.to_dict_summary()
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401
