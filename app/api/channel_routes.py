from flask import Blueprint, jsonify, session, request
from app.models import Workspace, Channel, WorkspaceUser, WorkspaceInvitation, User, db
from flask_login import current_user, login_user, logout_user, login_required
from app.forms import WorkspaceForm, WorkspaceUserForm, NewInvitationForm
from random import choice
from app.socket import socketio

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
    return channel.to_dict_detail()

@channel_routes.route('/current', methods=['GET'])
@login_required
def current_channel():
    """
    Query for all the channels in the active workspace that the current user is in
    """
    return {"channels": [channel.to_dict_summary() for channel in current_user.channels if channel.workspace_id == current_user.active_workspace_id]}
