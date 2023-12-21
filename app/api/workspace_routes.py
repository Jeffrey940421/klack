from flask import Blueprint, request
from sqlalchemy.orm import joinedload
from sqlalchemy import delete, insert
from app.models import Workspace, Channel, ChannelMessageReply, WorkspaceUser, WorkspaceInvitation, ChannelUser, User, ChannelMessage, db
from flask_login import current_user, login_required
from app.forms import WorkspaceForm, WorkspaceUserForm, WorkspaceInvitationForm, ChannelForm, ActiveChannelForm
from random import choice
from app.socket import socketio
import json
from datetime import datetime

workspace_routes = Blueprint('workspace', __name__)

workspace_icons = [
    "/images/workspace_icons/workspace_icon_1.webp",
    "/images/workspace_icons/workspace_icon_2.webp",
    "/images/workspace_icons/workspace_icon_3.webp"
]

profile_images = [
    "/images/profile_images/profile_images_1.png",
    "/images/profile_images/profile_images_2.png",
    "/images/profile_images/profile_images_3.png",
    "/images/profile_images/profile_images_4.png",
    "/images/profile_images/profile_images_5.png",
    "/images/profile_images/profile_images_6.png",
    "/images/profile_images/profile_images_7.png",
]


def validation_errors_to_error_messages(validation_errors):
    """
    Simple function that turns the WTForms validation errors into a simple list
    """
    errorMessages = []
    for field in validation_errors:
        for error in validation_errors[field]:
            errorMessages.append(f'{field} : {error}')
    return errorMessages

@workspace_routes.route('/<int:id>', methods=['GET'])
@login_required
def workspace(id):
    """
    Query for a workspace by id and returns workspace's information
    """
    workspace = Workspace.query.options(
        joinedload(Workspace.user_associations)
    ).filter(Workspace.id == id).first()
    user_association = next(
        (user_association for user_association in workspace.user_associations if user_association.user_id == current_user.id), None)
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    return workspace.to_dict(user_association)


@workspace_routes.route('/current', methods=['GET'])
@login_required
def current_workspace():
    """
    Query for all the workspaces that the current user is in and return workspaces' information
    """
    workspace_users = WorkspaceUser.query.options(
        joinedload(WorkspaceUser.workspace)
    ).filter(
        WorkspaceUser.user_id == current_user.id
    ).order_by(
        WorkspaceUser.created_at.asc()
    ).all()
    return {
        "workspaces": [workspace_user.workspace.to_dict(workspace_user) for workspace_user in workspace_users]
    }


@workspace_routes.route('/new', methods=['POST'])
@login_required
def create_workspace():
    """
    Create a workspace and a general channel in it, join both the workspace and channel, and return the workspace's information
    """
    workspace_form = WorkspaceForm()
    workspace_user_form = WorkspaceUserForm()
    workspace_form['csrf_token'].data = request.cookies['csrf_token']
    workspace_user_form['csrf_token'].data = request.cookies['csrf_token']
    if workspace_form.validate_on_submit() and workspace_user_form.validate_on_submit():
        user = User.query.options(
            joinedload(User.workspace_associations)
            .joinedload(WorkspaceUser.workspace),
            joinedload(User.workspace_associations)
            .joinedload(WorkspaceUser.active_channel)
            .joinedload(Channel.user_associations)
            .joinedload(ChannelUser.user)
        ).filter(User.id == current_user.id).first()
        current_active_workspace_id = user.active_workspace_id
        # Update the last viewed time of the active channel of the current active workspace if the current user has an active workspace and the active workspace has an active channel
        current_workspace_user = next(
            (workspace_user for workspace_user in user.workspace_associations if workspace_user.workspace_id == current_active_workspace_id), None)
        if current_workspace_user:
            current_active_channel = current_workspace_user.active_channel
            if current_active_channel:
                current_channel_user = next(
                    (channel_user for channel_user in current_active_channel.user_associations if channel_user.user_id == current_user.id), None)
                if current_channel_user:
                    current_channel_user.last_viewed_at = datetime.utcnow()
        # Create new workspace, workspace user, channel, channel user, and message
        workspace = Workspace(
            name=workspace_form.data["name"],
            icon_url=workspace_form.data["icon_url"] if workspace_form.data["icon_url"] else choice(
                workspace_icons),
            owner=current_user
        )
        workspace_user = WorkspaceUser(
            workspace=workspace,
            user=current_user,
            nickname=workspace_user_form.data['nickname'],
            profile_image_url=workspace_user_form.data['profile_image_url'] if workspace_user_form.data['profile_image_url'] else choice(
                profile_images),
            role="admin",
            # Set active channel later
            active_channel=None
        )
        channel = Channel(
            name="general",
            description="This is the one channel that will always include everyone. It's a great spot for announcements and team-wide conversations.",
            creator=current_user,
            workspace=workspace
        )
        message = ChannelMessage(
            sender=current_user,
            channel=channel,
            content="Joined",
            system_message=True
        )
        channel_user = ChannelUser(
            channel=channel,
            user=current_user
        )
        # Set the new channel as the active channel of the new workspace
        workspace_user.active_channel = channel
        db.session.add(workspace)
        db.session.add(workspace_user)
        db.session.add(channel)
        db.session.add(message)
        db.session.add(channel_user)
        db.session.commit()
        # Update the active workspace
        user.active_workspace_id = workspace.id
        db.session.commit()
        return {
            'workspace': workspace.to_dict(workspace_user),
            'workspaceUser': workspace_user.to_dict(),
            'channel': channel.to_dict(channel_user),
            'message': message.to_dict(),
            'prevActiveChannel': current_active_channel.to_dict(current_channel_user) if current_workspace_user and current_active_channel and current_channel_user else None
        }
    return {'errors': validation_errors_to_error_messages(workspace_form.errors) + validation_errors_to_error_messages(workspace_user_form.errors)}, 401


@workspace_routes.route('/<int:id>/channels/new', methods=['POST'])
@login_required
def create_channel(id):
    """
    Create a channel in the workspace, join the channel, and return channel's information
    """
    form = ChannelForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    user = User.query.options(
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace)
        .joinedload(Workspace.channels)
        .joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user),
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.active_channel)
        .joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user)
    ).filter(User.id == current_user.id).first()
    workspace = next(
        (workspace for workspace in user.workspaces if workspace.id == id), None)
    workspace_user = next(
        (workspace_user for workspace_user in user.workspace_associations if workspace_user.workspace_id == id), None)
    if not workspace_user:
        return {"errors": ["User must join the workspace before creating channel"]}, 403
    if user.active_workspace_id != id:
        return {"errors": ["User must set the workspace as active workspace before creating channel"]}, 403
    if form.validate_on_submit():
        duplicate_channel = next(
            (channel for channel in workspace.channels if channel.name ==form.data["name"]), None)
        if duplicate_channel:
            return {"errors": ["Channel with the same name already existed in the workspace"]}, 403
        # Update the last viewed time of the current active channel of active workspace
        current_active_channel = workspace_user.active_channel
        if current_active_channel:
            current_channel_user = next(
                (channel_user for channel_user in current_active_channel.user_associations if channel_user.user_id == current_user.id), None)
            if current_channel_user:
                current_channel_user.last_viewed_at = datetime.utcnow()
        # Create new channel, channel user, and message
        channel = Channel(
            name=form.data["name"],
            description=form.data["description"],
            creator=current_user,
            workspace=workspace,
        )
        message = ChannelMessage(
            sender=current_user,
            channel=channel,
            content="Joined",
            system_message=True
        )
        channel_user = ChannelUser(
            channel=channel,
            user=current_user
        )
        db.session.add(channel)
        db.session.add(message)
        db.session.add(channel_user)
        workspace_user.active_channel = channel
        db.session.commit()
        return {
            'workspace': workspace.to_dict(workspace_user),
            'channel': channel.to_dict(channel_user),
            'message': message.to_dict(),
            'prevActiveChannel': current_active_channel.to_dict(current_channel_user) if current_active_channel and current_channel_user else None
        }
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401


@workspace_routes.route('/<int:id>', methods=['PUT'])
@login_required
def edit_workspace(id):
    """
    Edit a workspace and return the workspace's information
    """
    form = WorkspaceForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    user = User.query.options(
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace)
    ).filter(User.id == current_user.id).first()
    workspace_user = next(
        (workspace_user for workspace_user in user.workspace_associations if workspace_user.workspace_id == id), None)
    workspace = next(
        (workspace for workspace in user.workspaces if workspace.id == id), None)
    if not workspace_user:
        return {"errors": ["User is not in the workspace"]}, 403
    if workspace_user.role != "admin":
        return {"errors": ["User is not authorized to edit workspace"]}, 403
    if user.active_workspace_id != id:
        return {"errors": ["User must set the workspace as active workspace before editing workspace"]}, 403
    if form.validate_on_submit():
        # Update workspace's information
        workspace.name = form.data["name"]
        if form.data["icon_url"]:
            workspace.icon_url = form.data["icon_url"]
        db.session.commit()
        # Emit the updated workspace information to all the users in the workspace
        socketio.emit("edit_workspace", {
            "senderId": current_user.id,
            "workspace": json.dumps(workspace.to_dict(None), default=str)
        }, to=f"workspace{id}")
        return workspace.to_dict(workspace_user)
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401


@workspace_routes.route('/<int:workspace_id>/users/<int:user_id>', methods=['PUT'])
@login_required
def edit_profile(workspace_id, user_id):
    """
    Edit the user profile in a workspace and return the user's profile
    """
    form = WorkspaceUserForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    workspace_user = WorkspaceUser.query.get((workspace_id, user_id))
    if not workspace_user:
        return {"errors": ["User is not in the workspace"]}, 403
    if user_id != current_user.id:
        return {"errors": ["User is only authorized to edit their own profiles"]}, 403
    if current_user.active_workspace_id != workspace_id:
        return {"errors": ["User must set the workspace as active workspace before editing profile"]}, 403
    if form.validate_on_submit():
        # Update user's profile
        workspace_user.nickname = form.data["nickname"]
        if form.data["profile_image_url"]:
            workspace_user.profile_image_url = form.data["profile_image_url"]
        db.session.commit()
        # Emit the updated user profile to all the users in the workspace
        socketio.emit("edit_profile", {
            "senderId": current_user.id,
            "workspaceUser": json.dumps(workspace_user.to_dict(), default=str)
        }, to=f"workspace{workspace_id}")
        return workspace_user.to_dict()
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401


@workspace_routes.route('/<int:id>/join', methods=['PUT'])
@login_required
def join_workspace(id):
    """
    Join a workspace and the general channel in the workspace
    """
    form = WorkspaceUserForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    workspaces = Workspace.query.options(
        joinedload(Workspace.associated_invitations),
        joinedload(Workspace.channels)
        .joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user),
        joinedload(Workspace.user_associations)
        .joinedload(WorkspaceUser.user),
        joinedload(Workspace.user_associations)
        .joinedload(WorkspaceUser.active_channel)
        .joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user)
    )
    workspace = workspaces.filter(Workspace.id == id).first()
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    if current_user in workspace.users:
        return {"errors": ["User is already in the workpsace"]}, 403
    invitation = next((invitation for invitation in workspace.associated_invitations if invitation.recipient_id == current_user.id and invitation.status == "pending"), None)
    if not invitation:
        return {"errors": ["User is not authorized to join the workspace without a pending invitation"]}, 403
    if form.validate_on_submit():
        current_active_workspace = workspaces.filter(Workspace.id == current_user.active_workspace_id).first()
        # Update the last viewed time of the active channel of the current active workspace if the current user has an active workspace and the active workspace has an active channel
        if current_active_workspace:
            current_workspace_user = next(
                (workspace_user for workspace_user in current_active_workspace.user_associations if workspace_user.user_id == current_user.id), None)
            if current_workspace_user:
                current_active_channel = current_workspace_user.active_channel
                if current_active_channel:
                    current_channel_user = next(
                        (channel_user for channel_user in current_active_channel.user_associations if channel_user.user_id == current_user.id), None)
                    if current_channel_user:
                        current_channel_user.last_viewed_at = datetime.utcnow()
        # Create new workspace user, channel user, and message
        workspace_user = WorkspaceUser(
            workspace_id=id,
            user=current_user,
            nickname=form.data['nickname'],
            profile_image_url=form.data['profile_image_url'] if form.data['profile_image_url'] else choice(
                profile_images),
            role="guest",
            # Set active channel later
            active_channel=None
        )
        channel = next(
            (channel for channel in workspace.channels if channel.name == "general"), None)
        channel_id = channel.id
        channel_user = ChannelUser(
            channel=channel,
            user=current_user
        )
        message = ChannelMessage(
            sender=current_user,
            channel=channel,
            content="Joined",
            system_message=True
        )
        current_user.active_workspace_id = id
        workspace_user.active_channel = channel
        db.session.add(workspace_user)
        db.session.add(message)
        db.session.add(channel_user)
        db.session.commit()
        socketio.emit("send_message", {
            "senderId": current_user.id,
            "message": json.dumps(message.to_dict(), default=str),
            "channel": json.dumps(channel.to_dict(None), default=str)
        }, to=f"channel{channel_id}")
        socketio.emit("join_workspace", {
            "senderId": current_user.id,
            "profile": json.dumps(workspace_user.to_dict(), default=str)
        }, to=f"workspace{id}")
        size = request.args.get('size') if request.args.get('size') and request.args.get('size').isdigit() and int(request.args.get('size')) > 0 else 50
        messages = ChannelMessage.query.options(
            joinedload(ChannelMessage.attachments),
            joinedload(ChannelMessage.sender),
            joinedload(ChannelMessage.channel),
            joinedload(ChannelMessage.replies)
            .joinedload(ChannelMessageReply.sender)
        ).filter(ChannelMessage.channel_id == channel_id).order_by(ChannelMessage.created_at.desc(), ChannelMessage.id.desc()).limit(size).all()
        return {
            'workspace': workspace.to_dict(workspace_user),
            'workspaceUsers': [workspace_user.to_dict() for workspace_user in workspace.user_associations],
            'channel': channel.to_dict(channel_user),
            'messages': [message.to_dict() for message in messages],
            'messageSize': size,
            'prevActiveChannel': current_active_channel.to_dict(current_channel_user) if current_active_workspace and current_workspace_user and current_active_channel and current_channel_user else None
        }
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401


@workspace_routes.route('/<int:id>/leave', methods=['PUT'])
@login_required
def leave_workspace(id):
    """
    Leave a workspace and all the channels that the user has joined in the workspace
    """
    workspace = Workspace.query.options(
        joinedload(Workspace.channels)
        .joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user),
        joinedload(Workspace.user_associations)
    ).filter(Workspace.id == id).first()
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    workspace_user = next(
        (workspace_user for workspace_user in workspace.user_associations if workspace_user.user_id == current_user.id), None)
    if not workspace_user:
        return {"errors": ["User is not in the workspace"]}, 403
    if workspace.owner_id == current_user.id:
        return {"errors": ["User is not authorized to leave the workspace as the workspace owner"]}, 403
    if current_user.active_workspace_id != id:
        return {"errors": ["User must set the workspace as active workspace before leaving workspace"]}, 403
    # Channels the user has joined in the workspace
    channels = [channel for channel in workspace.channels if current_user in channel.users]
    channel_ids = [channel.id for channel in channels]
    # Channels where the user is the only member
    channels_to_delete = [channel for channel in channels if len(channel.users) == 1]
    channel_to_delete_ids = [channel.id for channel in channels_to_delete]
    # Send system message to all the channels that the user has joined in the workspace
    message_values = [
        {
            "sender_id": current_user.id,
            "channel_id": channel.id,
            "content": "Left",
            "system_message": True
        } for channel in channels if channel not in channels_to_delete
    ]
    messageIds = db.session.scalars(insert(ChannelMessage).returning(ChannelMessage.id), message_values).all()
    # Remove the user from all the channels that the user has joined in the workspace
    db.session.execute(delete(ChannelUser).where(
        ChannelUser.channel_id.in_(channel_ids), ChannelUser.user_id == current_user.id))
    # Remove the channels where the user is the only member
    db.session.execute(delete(Channel).where(
        Channel.id.in_(channel_to_delete_ids)))
    # Remove the user from the workspace
    db.session.delete(workspace_user)
    db.session.commit()
    user = User.query.options(
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace),
    ).filter(User.id == current_user.id).first()
    # Update the active workspace of user
    user.active_workspace_id = user.workspaces[0].id if len(user.workspaces) else None
    db.session.commit()
    # Emit the updated user profile and system messages to all the users in the workspace
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
            "message": json.dumps(message.to_dict(), default=str),
            "channel": json.dumps(message.channel.to_dict(None), default=str)
        }, to=f"channel{message.channel_id}")
    socketio.emit("leave_workspace", {
        "senderId": current_user.id,
        "profile": json.dumps(workspace_user.to_dict(), default=str)
    }, to=f"workspace{id}")
    return user.to_dict()

@workspace_routes.route('/<int:id>', methods=['DELETE'])
@login_required
def delete_workspace(id):
    """
    Delete a workspace
    """
    user = User.query.options(
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace)
        .joinedload(Workspace.channels)
        .joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user),
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace)
        .joinedload(Workspace.channels)
        .joinedload(Channel.messages)
        .joinedload(ChannelMessage.replies),
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace)
        .joinedload(Workspace.channels)
        .joinedload(Channel.messages)
        .joinedload(ChannelMessage.attachments),
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace)
        .joinedload(Workspace.channels)
        .joinedload(Channel.messages)
        .joinedload(ChannelMessage.reactions),
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace)
        .joinedload(Workspace.associated_invitations),
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace)
        .joinedload(Workspace.active_users),
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.active_channel)
        .joinedload(Channel.active_users)
    ).filter(User.id == current_user.id).first()
    workspace_user = next(
        (workspace_user for workspace_user in user.workspace_associations if workspace_user.workspace_id == id), None)
    workspace = next(
        (workspace for workspace in user.workspaces if workspace.id == id), None)
    if not workspace_user:
        return {"errors": ["User is not in the workspace"]}, 403
    if workspace_user.role != "admin":
        return {"errors": ["User is not authorized to delete the workspace"]}, 403
    if user.active_workspace_id != id:
        return {"errors": ["User must set the workspace as active workspace before deleting workspace"]}, 403
    # Delete the workspace
    db.session.delete(workspace)
    db.session.commit()
    # Update the active workspace of user
    user.active_workspace_id = user.workspaces[0].id if len(user.workspaces) else None
    db.session.commit()
    socketio.emit("delete_workspace", {
        "senderId": current_user.id,
        "workspaceId": id}, to=f"workspace{id}"
    )
    return user.to_dict()


@workspace_routes.route('/<int:id>/invitations/new', methods=['POST'])
@login_required
def send_invitation(id):
    """
    Invite a user to join the workspace and return the invitation's information
    """
    form = WorkspaceInvitationForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    users = User.query.options(
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace)
        .joinedload(Workspace.user_associations),
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace)
        .joinedload(Workspace.associated_invitations)
    )
    user = next(
        (user for user in users if user.id == current_user.id), None)
    workspace_user = next(
        (workspace_user for workspace_user in user.workspace_associations if workspace_user.workspace_id == id), None)
    workspace = next(
        (workspace for workspace in user.workspaces if workspace.id == id), None)
    if not workspace_user:
        return {"errors": ["User is not in the workspace"]}, 403
    if workspace_user.role != "admin":
        return {"errors": ["User is not authorized to send invitations"]}, 403
    if user.active_workspace_id != id:
        return {"errors": ["User must set the workspace as active workspace before sending invitations"]}, 403
    if form.validate_on_submit():
        recipient = next(
            (user for user in users if user.email == form.data["recipient_email"]), None)
        recipient_id = recipient.id if recipient else None
        workspace_recipient = next(
            (workspace_user for workspace_user in recipient.workspace_associations if workspace_user.workspace_id == id), None)
        if recipient == current_user:
            return {"errors": ["User is not authorized to send invitations to themselves"]}, 403
        if workspace_recipient:
            return {"errors": [f"User {recipient.email} is already in the workspace"]}, 403
        sent_invitation = next(
            (invitation for invitation in workspace.associated_invitations if invitation.recipient_id == recipient.id and invitation.status == "pending"), None)
        if sent_invitation:
            return {"errors": [f"User {recipient.email} has already received a invitation"]}, 403
        # Create new invitation
        invitation = WorkspaceInvitation(
            sender=current_user,
            recipient_id=recipient_id,
            workspace_id=id
        )
        db.session.add(invitation)
        db.session.commit()
        # Emit the new invitation to the recipient
        socketio.emit("send_invitation", {"invitation": json.dumps(
            invitation.to_dict(), default=str)}, to=f"user{recipient_id}")
        return invitation.to_dict()
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401


@workspace_routes.route('/<int:id>/active_channel', methods=["PUT"])
@login_required
def update_active_channel(id):
    """
    Update the active channel of workspace
    """
    form = ActiveChannelForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    user = User.query.options(
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace)
        .joinedload(Workspace.channels)
        .joinedload(Channel.user_associations)
        .joinedload(ChannelUser.user),
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.active_channel)
        .joinedload(Channel.user_associations)
    ).filter(User.id == current_user.id).first()
    workspace_user = next(
        (workspace_user for workspace_user in user.workspace_associations if workspace_user.workspace_id == id), None)
    workspace = next(
        (workspace for workspace in user.workspaces if workspace.id == id), None)
    if not workspace_user:
        return {"errors": ["User is not in the workspace"]}, 404
    if user.active_workspace_id != id:
        return {"errors": ["Users must set the workspace as active workspace before updating active channel"]}, 403
    if form.validate_on_submit():
        channel_id = form.data["active_channel_id"]
        channel = next(
            (channel for channel in workspace.channels if channel.id == channel_id), None)
        channels = [channel for channel in workspace.channels if current_user in channel.users]
        if channel not in channels:
            return {"errors": "User is not in the channel or channel is not in the workspace"}, 403
        # Update the last viewed time of the active channel
        current_active_channel = workspace_user.active_channel
        if current_active_channel:
            current_channel_user = next(
                (channel_user for channel_user in current_active_channel.user_associations if channel_user.user_id == current_user.id), None)
            if current_channel_user:
                current_channel_user.last_viewed_at = datetime.utcnow()
        # Update the active channel of the workspace
        workspace_user.active_channel = channel
        db.session.commit()
        return {
            'workspace': workspace.to_dict(workspace_user),
            'prevActiveChannel': current_active_channel.to_dict(current_channel_user) if current_active_channel and current_channel_user else None
        }
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401
