from flask import Blueprint, jsonify, session, request
from app.models import Workspace, Channel, WorkspaceUser, WorkspaceInvitation, User, db
from flask_login import current_user, login_user, logout_user, login_required
from app.forms import WorkspaceForm, WorkspaceUserForm, NewInvitationForm, ChannelForm
from random import choice
from app.socket import socketio

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
    Query for a workspace by id and returns that workspace in a dictionary
    """
    workspace = Workspace.query.get(id)
    if not workspace:
      return {"errors": ["Workspace is not found"]}, 404
    return workspace.to_dict_detail()

@workspace_routes.route('/current', methods=['GET'])
@login_required
def current_workspace():
    """
    Query for all the workspaces that the current user is in
    """
    return {"workspaces": [workspace.to_dict_summary() for workspace in current_user.workspaces]}

@workspace_routes.route('/<int:id>/messages', methods=['GET'])
@login_required
def workspace_messages(id):
    """
    Query for all the messages in the given workspace
    """
    workspace = Workspace.query.get(id)
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    messages = {"messages": []}
    for channel in workspace.channels:
        messages["messages"] += [message.to_dict_summary() for message in channel.messages]
    return messages

@workspace_routes.route('/new', methods=['POST'])
@login_required
def create_workspace():
    """
    Create a workspace and a general channel in it. Join both the workspace and channel
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
            workspace=workspace,
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
        workspace_user.active_channel = channel
        db.session.add(workspace)
        db.session.add(workspace_user)
        db.session.add(channel)
        db.session.commit()
        current_user.active_workspace_id = workspace.id
        db.session.commit()
        return workspace.to_dict_detail()
    return {'errors': validation_errors_to_error_messages(workspace_form.errors) + validation_errors_to_error_messages(workspace_user_form.errors)}, 401

@workspace_routes.route('/<int:id>/channels/new', methods=['POST'])
@login_required
def create_channel(id):
    """
    Create a channel in the workspace and join it
    """
    form = ChannelForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    workspace = Workspace.query.get(id)
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    if current_user not in workspace.users:
        return {"errors": ["Only users in the workspace are allowed to create channel"]}, 403
    if form.validate_on_submit():
        duplicate_channel = Channel.query.filter(Channel.workspace_id == id, Channel.name == form.data["name"]).first()
        if duplicate_channel:
            return {"errors": ["Cannot create channels with duplicate names in the same workspace"]}, 403
        channel = Channel(
            name=form.data["name"],
            description=form.data["description"],
            creator=current_user,
            workspace=workspace,
            users=[current_user]
        )
        db.session.add(channel)
        db.session.commit()
        workspace_user = WorkspaceUser.query.get((workspace.id, current_user.id))
        workspace_user.active_channel_id = channel.id
        db.session.commit()
        return channel.to_dict_detail()
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401


@workspace_routes.route('/<int:id>', methods=['PUT'])
@login_required
def edit_workspace(id):
    """
    Edit a workspace
    """
    form = WorkspaceForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    workspace = Workspace.query.get(id)
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    if workspace.owner_id != current_user.id:
        return {"errors": ["Only workspace owner is authorized to edit the workspace"]}, 403
    if form.validate_on_submit():
        workspace.name=form.data["name"]
        if form.data["icon_url"]:
          workspace.icon_url=form.data["icon_url"]
        db.session.commit()
        return workspace.to_dict_detail()
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401

@workspace_routes.route('/<int:workspace_id>/users/<int:user_id>', methods=['PUT'])
@login_required
def edit_profile(workspace_id, user_id):
    """
    Edit the user profile in a workspace
    """
    form = WorkspaceUserForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    workspace_user = WorkspaceUser.query.get((workspace_id, user_id))
    if not workspace_user:
        return {"errors": ["Either workspace or user is not found or the user is not in the workspace"]}, 404
    if user_id != current_user.id:
        return {"errors": ["Users are only allowed to edit their own profiles"]}, 403
    if form.validate_on_submit():
        workspace_user.nickname=form.data["nickname"]
        if form.data["profile_image_url"]:
          workspace_user.profile_image_url=form.data["profile_image_url"]
        db.session.commit()
        return workspace_user.workspace.to_dict_detail()
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401

@workspace_routes.route('/<int:id>/join', methods=['PUT'])
@login_required
def join_workspace(id):
    """
    Join a workspace and the general channel in the workspace
    """
    form = WorkspaceUserForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    workspace = Workspace.query.get(id)
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    if current_user in workspace.users:
        return {"errors": ["Only users that are not in the workspace can join the workspace"]}, 403
    invitation = WorkspaceInvitation.query.filter(WorkspaceInvitation.recipient_id == current_user.id, WorkspaceInvitation.workspace_id == id, WorkspaceInvitation.status == "pending").first()
    if not invitation:
        return {"errors": ["Only users that receives the invitation can join the workspace"]}, 403
    if form.validate_on_submit():
        workspace_user = WorkspaceUser(
            workspace_id = id,
            user=current_user,
            nickname=form.data['nickname'],
            profile_image_url=form.data['profile_image_url'] if form.data['profile_image_url'] else choice(profile_images),
            role="guest"
        )
        channel = Channel.query.filter(Channel.workspace_id == id, Channel.name == "general").first()
        channel.users.append(current_user)
        current_user.active_workspace_id = id
        workspace_user.active_channel = channel
        db.session.add(workspace_user)
        db.session.commit()
        return workspace.to_dict_detail()
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401

@workspace_routes.route('/<int:id>/leave', methods=['PUT'])
@login_required
def leave_workspace(id):
    """
    Leave a workspace and all the channels in the workspace
    """
    workspace = Workspace.query.get(id)
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    if current_user not in workspace.users:
        return {"errors": ["Only users that are in the workspace can leave the workspace"]}, 403
    if current_user == workspace.owner:
        return {"errors": ["Workspace owner cannot leave the workspace"]}, 403
    workspace_user = WorkspaceUser.query.get((id, current_user.id))
    channels = workspace.channels
    _ = [channel.users.remove(current_user) for channel in channels if current_user in channel.users]
    db.session.delete(workspace_user)
    db.session.commit()
    if len(current_user.workspaces):
        current_user.active_workspace = current_user.workspaces[0]
    else:
        current_user.active_workspace = None
    db.session.commit()
    return {"activeWorkspace": current_user.active_workspace.to_dict_detail() if current_user.active_workspace else None}

@workspace_routes.route('/<int:id>', methods=['DELETE'])
@login_required
def delete_workspace(id):
    """
    Delete a workspace
    """
    workspace = Workspace.query.get(id)
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    if current_user != workspace.owner:
        return {"errors": ["Only workspace owner can delete the workspace"]}, 403
    db.session.delete(workspace)
    db.session.commit()
    if len(current_user.workspaces):
        current_user.active_workspace = current_user.workspaces[0]
    else:
        current_user.active_workspace = None
    db.session.commit()
    socketio.emit("delete_workspace", {"id": id}, to=f"workspace{id}")
    return {"activeWorkspace": current_user.active_workspace.to_dict_detail() if current_user.active_workspace else None}

@workspace_routes.route('/<int:id>/invitations/new', methods=['POST'])
@login_required
def send_invitation(id):
    """
    Invite a user to join the workspace
    """
    form = NewInvitationForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    workspace = Workspace.query.get(id)
    if not workspace:
        return {"errors": ["Workspace is not found"]}, 404
    if current_user != workspace.owner:
        return {"errors": ["Users must be the owner of workspace to send the invitation"]}, 403
    if form.validate_on_submit():
      user = User.query.filter(User.email == form.data["recipient_email"]).first()
      if user == current_user:
          return {"errors": ["Users are not allowed to send invitations to themselves"]}, 403
      if user in workspace.users:
          return {"errors": [f"User {user.email} is already in the workspace"]}, 403
      sent_invitation = WorkspaceInvitation.query.filter(WorkspaceInvitation.recipient_id == user.id, WorkspaceInvitation.workspace_id == id, WorkspaceInvitation.status == "pending").first()
      if sent_invitation:
          return {"errors": [f"User {user.email} has already received a invitation to join the workspace and the invitation is still pending"]}, 403
      invitation = WorkspaceInvitation(
          sender=current_user,
          recipient=user,
          workspace=workspace
      )
      db.session.add(invitation)
      db.session.commit()
      return invitation.to_dict()
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401
