from app.models import db, WorkspaceUser
from .users import users

# For each user, set the first workspace in the workspace list as active workspace, and the first channel in each workspace as the active channel of the workspace
def seed_active_workspace():
    for user in users:
        if user.workspaces:
            user.active_workspace = user.workspaces[0]
            for workspace in user.workspaces:
                workspace_user = WorkspaceUser.query.get((workspace.id, user.id))
                workspace_user.active_channel = workspace.channels[0]
    db.session.commit()


# Uses a raw SQL query to TRUNCATE or DELETE the users table. SQLAlchemy doesn't
# have a built in function to do this. With postgres in production TRUNCATE
# removes all the data from the table, and RESET IDENTITY resets the auto
# incrementing primary key, CASCADE deletes any dependent entities.  With
# sqlite3 in development you need to instead use DELETE to remove all data and
# it will reset the primary keys for you as well.
def undo_active_workspace():
    db.session.commit()
