from flask import Blueprint
from sqlalchemy.orm import joinedload
from app.models import WorkspaceInvitation, db
from flask_login import current_user, login_required
from app.socket import socketio
import json

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

@invitation_routes.route('/received', methods=['GET'])
@login_required
def invitations_received():
    """
    Query for all the invitations that the current user received
    """
    received_invitations = WorkspaceInvitation.query.options(
        joinedload(WorkspaceInvitation.sender),
        joinedload(WorkspaceInvitation.recipient),
        joinedload(WorkspaceInvitation.workspace)
    ).filter(
        WorkspaceInvitation.recipient_id == current_user.id
    ).order_by(
        WorkspaceInvitation.created_at.asc()
    ).all()
    return {'receivedInvitations': [received_invitation.to_dict() for received_invitation in received_invitations]}

@invitation_routes.route('/sent', methods=['GET'])
@login_required
def invitations_sent():
    """
    Query for all the invitations that the current user sent
    """
    sent_invitations = WorkspaceInvitation.query.options(
        joinedload(WorkspaceInvitation.sender),
        joinedload(WorkspaceInvitation.recipient),
        joinedload(WorkspaceInvitation.workspace)
    ).filter(
        WorkspaceInvitation.sender_id == current_user.id
    ).order_by(
        WorkspaceInvitation.created_at.asc()
    ).all()
    return {'sentInvitations': [sent_invitation.to_dict() for sent_invitation in sent_invitations]}

@invitation_routes.route('/<int:id>/ignore', methods=['PUT'])
@login_required
def ignore_invitation(id):
    """
    Ignore a pending invitation
    """
    invitation = WorkspaceInvitation.query.options(
        joinedload(WorkspaceInvitation.sender),
        joinedload(WorkspaceInvitation.recipient),
        joinedload(WorkspaceInvitation.workspace)
    ).filter(WorkspaceInvitation.id == id).first()
    if not invitation:
        return {"errors": ["Invitation is not found"]}, 404
    if invitation.recipient != current_user:
        return {"errors": ["User is not authorized to ignore the invitation"]}, 403
    if invitation.status != "pending":
        return {"errors": ["Invitation is not pending"]}, 403
    invitation.status = "ignored"
    db.session.commit()
    socketio.emit("edit_invitation", {"invitation": json.dumps(
        invitation.to_dict(), default=str)}, to=f"user{invitation.sender_id}")
    return invitation.to_dict()

@invitation_routes.route('/<int:id>/accept', methods=['PUT'])
@login_required
def accept_invitation(id):
    """
    Accept a pending invitation
    """
    invitation = WorkspaceInvitation.query.options(
        joinedload(WorkspaceInvitation.sender),
        joinedload(WorkspaceInvitation.recipient),
        joinedload(WorkspaceInvitation.workspace)
    ).filter(WorkspaceInvitation.id == id).first()
    if not invitation:
        return {"errors": ["Invitation is not found"]}, 404
    if invitation.recipient != current_user:
        return {"errors": ["User is not authorized to accept the invitation"]}, 403
    if invitation.status != "pending":
        return {"errors": ["Invitation is not pending"]}, 403
    invitation.status = "accepted"
    db.session.commit()
    socketio.emit("edit_invitation", {"invitation": json.dumps(
        invitation.to_dict(), default=str)}, to=f"user{invitation.sender_id}")
    return invitation.to_dict()
