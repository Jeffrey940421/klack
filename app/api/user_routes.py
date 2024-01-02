from flask import Blueprint, request
from sqlalchemy.orm import joinedload
from flask_login import login_required, current_user
from app.models import User, Workspace, Channel, db, WorkspaceUser
from app.forms import ActiveWorkspaceForm
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


@user_routes.route('/current')
@login_required
def users():
    """
    Query for all the users that are in the same workspaces as the current user and return users' profiles
    """
    user = User.query.options(
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace)
        .joinedload(Workspace.user_associations)
        .joinedload(WorkspaceUser.user)
    ).filter(User.id == current_user.id).first()
    workspace_users = [
        workspace_user for workspace in user.workspaces for workspace_user in workspace.user_associations]

    return {'users': [workspace_user.to_dict() for workspace_user in workspace_users]}


@user_routes.route('/<int:id>')
@login_required
def user(id):
    """
    Query for a user by id and return user's information
    """
    user = User.query.get(id)
    if not user:
        return {"errors": ["User is not found"]}, 404
    return user.to_dict()


@user_routes.route('/<int:id>/active_workspace', methods=["PUT"])
@login_required
def update_active_workspace(id):
    """
    Update the last viewed time of the active channel of the active workspace, update the active workspace, and return the updated user information
    """
    form = ActiveWorkspaceForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    user = User.query.options(
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.workspace),
        joinedload(User.workspace_associations)
        .joinedload(WorkspaceUser.active_channel)
        .joinedload(Channel.user_associations)
    ).filter(User.id == id).first()
    if not user:
        return {"errors": ["User is not found"]}, 404
    if user != current_user:
        return {"errors": ["User is only authorized to update their own active workspaces"]}, 403
    if form.validate_on_submit():
        new_active_workspace_id = form.data["active_workspace_id"]
        current_active_workspace_id = user.active_workspace_id
        if new_active_workspace_id not in [workspace.id for workspace in user.workspaces] and new_active_workspace_id != 0:
            return {"errors": "User must join the workspace before setting it as active workspace"}, 403
        # Update the last viewed time of the active channel of the current active workspace if the current user has an active workspace and the active workspace has an active channel
        current_workspace_user = next(
            (workspace_user for workspace_user in user.workspace_associations if workspace_user.workspace_id == current_active_workspace_id), None)
        if current_workspace_user:
            current_active_channel = current_workspace_user.active_channel
            if current_active_channel:
                current_channel_user = next(
                    (channel_user for channel_user in current_active_channel.user_associations if channel_user.user_id == id), None)
                if current_channel_user:
                    current_channel_user.last_viewed_at = datetime.utcnow()
        # Update the active workspace of the current user
        if new_active_workspace_id == 0:
            user.active_workspace_id = None
        else:
            user.active_workspace_id = new_active_workspace_id
        db.session.commit()
        return {
            'user': user.to_dict(),
            'prevActiveChannel': current_active_channel.to_dict(current_channel_user) if current_workspace_user and current_active_channel and current_channel_user else None
        }
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401
