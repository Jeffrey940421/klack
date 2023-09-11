from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app.models import User, Workspace, db
from app.forms import ActiveWorkspaceForm

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
            user.active_workspace_id=workspace_id
            db.session.commit()
            return user.to_dict_detail()
        else:
            return {"errors": "Users are only allowed to set the workspace that they have joined as active"}
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401
