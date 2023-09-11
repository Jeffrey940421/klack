from flask import Blueprint, jsonify, session, request
from app.models import Workspace, Channel, WorkspaceUser, WorkspaceInvitation, db
from flask_login import current_user, login_user, logout_user, login_required
from app.forms import WorkspaceForm, WorkspaceUserForm

invitation_routes = Blueprint('invitation', __name__)

def validation_errors_to_error_messages(validation_errors):
    """
    Simple function that turns the WTForms validation errors into a simple list
    """
    errorMessages = []
    for field in validation_errors:
        for error in validation_errors[field]:
            errorMessages.append(f'{field} : {error}')
    return errorMessages

@invitation_routes.route('/current', methods=['GET'])
@login_required
def invitations():
    """
    Query for all the invitations sent to the current user
    """
    return {'receivedWorkspaceInvitations': current_user.to_dict_detail()["receivedWorkspaceInvitations"]}

@invitation_routes.route('/<int:id>/ignore', methods=['PUT'])
@login_required
def ignore_invitation(id):
    """
    Ignore a pending invitation so that it won't appear in the notification list anymore
    """
    invitation = WorkspaceInvitation.query.get(id)
    if not invitation:
        return {"errors": ["Invitation is not found"]}, 404
    if invitation.recipient != current_user:
        return {"errors": ["User is not the recipient of invitation and is not allowed to ignore it"]}, 403
    invitation.status = "ignored"
    db.session.commit()
    return {'receivedWorkspaceInvitations': current_user.to_dict_detail()["receivedWorkspaceInvitations"]}

@invitation_routes.route('/<int:id>/accept', methods=['PUT'])
@login_required
def accept_invitation(id):
    """
    Accept a pending invitation so that it won't appear in the notification list anymore
    """
    invitation = WorkspaceInvitation.query.get(id)
    if not invitation:
        return {"errors": ["Invitation is not found"]}, 404
    if invitation.recipient != current_user:
        return {"errors": ["User is not the recipient of invitation and is not allowed to ignore it"]}, 403
    invitation.status = "accepted"
    db.session.commit()
    return {'receivedWorkspaceInvitations': current_user.to_dict_detail()["receivedWorkspaceInvitations"]}
