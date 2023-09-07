from flask import Blueprint, jsonify, session, request
from app.models import Workspace, Channel, WorkspaceUser, WorkspaceInvitation, db
from flask_login import current_user, login_user, logout_user, login_required
from app.forms import WorkspaceForm, WorkspaceUserForm
from random import choice

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
    Query for a workplace by id and returns that user in a dictionary
    """
    workplace = Workspace.query.get(id)
    if not workplace:
      return {"errors": ["Workspace is not found"]}, 404
    return workplace.to_dict_detail()

@workspace_routes.route('/new', methods=['POST'])
@login_required
def create_workspace():
    """
    Create a workplace and a general channel in it. Join both the workplace and channel
    """
    workspace_form = WorkspaceForm()
    workspace_user_form = WorkspaceUserForm()
    workspace_form['csrf_token'].data = request.cookies['csrf_token']
    workspace_user_form['csrf_token'].data = request.cookies['csrf_token']
    if workspace_form.validate_on_submit() and workspace_user_form.validate_on_submit():
        workspace = Workspace(
            name=workspace_form.data["name"],
            icon_url=workspace_form.data["icon_url"] if workspace_form.data["icon_url"] else choice(workspace_icons),
            owner=current_user
        )
        workspace_user = WorkspaceUser(
            workspace = workspace,
            user=current_user,
            nickname=workspace_user_form.data['nickname'],
            profile_image_url=workspace_user_form.data['profile_image_url'] if workspace_user_form.data['profile_image_url'] else choice(profile_images),
            role="admin"
        )
        channel = Channel(
            name="general",
            description="This is the one channel that will always include everyone. It’s a great spot for announcements and team-wide conversations.",
            creator=current_user,
            workspace=workspace,
            users=[current_user]
        )
        db.session.add(workspace)
        db.session.add(workspace_user)
        db.session.add(channel)
        db.session.commit()
        return workspace.to_dict_detail()
    return {'errors': validation_errors_to_error_messages(workspace_form.errors) + validation_errors_to_error_messages(workspace_user_form.errors)}, 401

@workspace_routes.route('/<int:id>', methods=['PUT'])
@login_required
def edit_workspace(id):
    """
    Edit a workplace
    """
    form = WorkspaceForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    workspace = Workspace.query.get(id)
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    if workspace.owner_id != current_user.id:
        return {"errors": ["Only workplace owner is authorized to edit the workplace"]}, 403
    if form.validate_on_submit():
        workspace.name=form.data["name"]
        if form.data["icon_url"]:
          workspace.icon_url=form.data["icon_url"]
        db.session.commit()
        return workspace.to_dict_detail()
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401

@workspace_routes.route('/<int:id>/join', methods=['PUT'])
@login_required
def join_workplace(id):
    """
    Join a workplace
    """
    form = WorkspaceUserForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    workspace = Workspace.query.get(id)
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    if current_user in workspace.users:
        return {"errors": ["Only users that are not in the workspace can join the workspace"]}, 403
    invitation = WorkspaceInvitation.query.filter(WorkspaceInvitation.recipient_id == current_user.id and WorkspaceInvitation.workspace_id == id and WorkspaceInvitation.status == "pending").first()
    if not invitation:
        return {"errors": ["Only users that receives and accepts the invitation can join the workspace"]}, 403
    if form.validate_on_submit():
        workspace_user = WorkspaceUser(
            workspace_id = id,
            user=current_user,
            nickname=form.data['nickname'],
            profile_image_url=form.data['profile_image_url'] if form.data['profile_image_url'] else choice(profile_images),
            role="guest"
        )
        invitation.status = "accepted"
        db.session.add(workspace_user)
        db.commit()
        return workspace.to_dict_detail()
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401

@workspace_routes.route('/<int:id>/leave', methods=['PUT'])
@login_required
def leave_workplace(id):
    """
    leave a workplace
    """
    workspace = Workspace.query.get(id)
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    if current_user not in workspace.users:
        return {"errors": ["Only users that are in the workspace can leave the workspace"]}, 403
    if current_user == workspace.owner:
        return {"errors": ["Workspace owner cannot leave the workspace"]}, 403
    workspace_user = WorkspaceUser.query.get((id, current_user.id))
    db.session.delete(workspace_user)
    db.session.commit()
    return {"message": "Successfully left the workspace"}

@workspace_routes.route('/<int:id>', methods=['DELETE'])
@login_required
def disassemble_workspace(id):
    """
    disassemble a workplace
    """
    workspace = Workspace.query.get(id)
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    if current_user != workspace.owner:
        return {"errors": ["Only workspace owner can disassemble the workspace"]}, 403
    db.session.delete(workspace)
    db.session.commit()
    return {"message": "Successfully disassemble the workspace"}
