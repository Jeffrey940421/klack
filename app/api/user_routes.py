from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app.models import User, Workspace, Channel, db, WorkspaceUser, ChannelUser
from app.forms import ActiveWorkspaceForm, ActiveChannelForm
from datetime import datetime

user_routes = Blueprint('users', __name__)

def validation_errors_to_error_messages(validation_errors):
    """
    Simple function that turns the WTForms validation errors into a simple list
    """
    errorMessages = []
    for field in validation_errors:
        for error in validation_errors[field]:
            errorMessages.append(f'{field} : {error}')
    return errorMessages

def has_read_messages(workspace, user):
    """
    Return a boolean indicating wheather users have read all the messages in the channels that they are in in the given workspace
    """
    channels = [channel for channel in workspace.channels if user in channel.users]
    workspace_user = WorkspaceUser.query.get((workspace.id, user.id))
    active_channel = workspace_user.active_channel
    for channel in channels:
        if channel != active_channel:
            channel_user = ChannelUser.query.get((channel.id, user.id))
            for message in channel.messages:
                if message.created_at > channel_user.last_viewed_at:
                    return False
    return True

@user_routes.route('/')
@login_required
def users():
    """
    Query for all users and returns them in a list of user dictionaries
    """
    users = User.query.all()
    return {'users': [user.to_dict_summary() for user in users]}


@user_routes.route('/<int:id>')
@login_required
def user(id):
    """
    Query for a user by id and returns that user in a dictionary
    """
    user = User.query.get(id)
    if not user:
        return {"errors": ["User is not found"]}, 404
    return user.to_dict_detail()

@user_routes.route('/<int:id>/active_workspace', methods=["PUT"])
@login_required
def update_active_workspace(id):
    """
    Update the active workspace of current user
    """
    form = ActiveWorkspaceForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    user = User.query.get(id)
    if not user:
        return {"errors": ["User is not found"]}, 404
    if user != current_user:
        return {"errors": ["Users are only allowed to update their own active workspaces"]}, 403
    if form.validate_on_submit():
        workspace_id = form.data["active_workspace_id"]
        if workspace_id in [workspace.id for workspace in user.workspaces]:
            prev_workspace_user = WorkspaceUser.query.get((user.active_workspace.id, user.id))
            if prev_workspace_user:
                if has_read_messages(user.active_workspace, user):
                    prev_workspace_user.last_viewed_at = datetime.utcnow()
                prev_active_channel = prev_workspace_user.active_channel
                if prev_active_channel:
                    prev_channel_user = ChannelUser.query.get((prev_active_channel.id, current_user.id))
                    if prev_channel_user:
                        prev_channel_user.last_viewed_at = datetime.utcnow()
            user.active_workspace_id = workspace_id
            db.session.commit()
            return user.to_dict_detail()
        else:
            return {"errors": "Users are only allowed to set the workspaces that they have joined as active"}
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401

@user_routes.route('/<int:id>/active_channel', methods=["PUT"])
@login_required
def update_active_channel(id):
    """
    Update the active channel of current user in the active workspace
    """
    form = ActiveChannelForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    user = User.query.get(id)
    if not user:
        return {"errors": ["User is not found"]}, 404
    if user != current_user:
        return {"errors": ["Users are only allowed to update their own active channels"]}, 403
    if form.validate_on_submit():
        channel_id = form.data["active_channel_id"]
        channel = Channel.query.get(channel_id)
        if current_user not in channel.users:
            return {"errors": "Users are only allowed to set the channels that they have joined as active"}, 403
        if channel not in current_user.active_workspace.channels:
            return {"errors": "Users are only allowed to set the channels that are in the active workspace as active"}, 403
        workspace_user = WorkspaceUser.query.get((user.active_workspace.id, user.id))
        if workspace_user:
            prev_active_channel = workspace_user.active_channel
            if prev_active_channel:
                channel_user = ChannelUser.query.get((prev_active_channel.id, current_user.id))
                if channel_user:
                    channel_user.last_viewed_at = datetime.utcnow()
            workspace_user.active_channel = channel
        db.session.commit()
        return user.to_dict_detail()
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401
