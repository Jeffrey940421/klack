from app.models import db, WorkspaceUser, Workspace, Channel, ChannelMessage, environment, SCHEMA
from sqlalchemy.sql import text
from faker import Faker
from random import randint, choice
from .users import users
from .workspaces import profile_images, emailToName, workspaces, workspace_users, channels

def fake_workspace_users(workspace_user_num):
    existing_workspace_user = set()
    workspace_users = []
    channel_messages = []
    for i in range(0, workspace_user_num):
        user = choice(users)
        workspace = choice(workspaces)
        while user.id == workspace.owner_id or (user.id, workspace.id) in existing_workspace_user:
            user = choice(users)
            workspace = choice(workspaces)
        existing_workspace_user.add((user.id, workspace.id))
        nickname = emailToName(user.email) + " - " + workspace.name
        profile_image_url = choice(profile_images)
        workspace_users.append(WorkspaceUser(
            workspace = workspace,
            user = user,
            nickname = nickname,
            profile_image_url = profile_image_url,
            role = "guest"
        ))
        generalChannel = Channel.query.filter(Channel.workspace_id == workspace.id).first()
        generalChannel.users.append(user)
        channel_messages.append(ChannelMessage(
            sender = user,
            channel = generalChannel,
            content = "Joined",
            system_message = True
        ))
        channel_messages.append(ChannelMessage(
            sender = user,
            channel = generalChannel,
            content = "Hello everyone"
        ))
    return {"workspace_users": workspace_users, "channel_messages": channel_messages}


# Adds a demo user, you can add other users here if you want
def seed_workspace_users():
    result = fake_workspace_users(10)
    workspace_users = result["workspace_users"]
    channel_messages = result["channel_messages"]
    _ = [db.session.add(workspace_user) for workspace_user in workspace_users]
    _ = [db.session.add(channel_message) for channel_message in channel_messages]
    db.session.commit()


# Uses a raw SQL query to TRUNCATE or DELETE the users table. SQLAlchemy doesn't
# have a built in function to do this. With postgres in production TRUNCATE
# removes all the data from the table, and RESET IDENTITY resets the auto
# incrementing primary key, CASCADE deletes any dependent entities.  With
# sqlite3 in development you need to instead use DELETE to remove all data and
# it will reset the primary keys for you as well.
def undo_workspace_users():
    if environment == "production":
        db.session.execute(f"TRUNCATE table {SCHEMA}.workspace_users RESTART IDENTITY CASCADE;")
        db.session.execute(f"TRUNCATE table {SCHEMA}.channels RESTART IDENTITY CASCADE;")
        db.session.execute(f"TRUNCATE table {SCHEMA}.channel_users RESTART IDENTITY CASCADE;")
        db.session.execute(f"TRUNCATE table {SCHEMA}.channel_messages RESTART IDENTITY CASCADE;")
    else:
        db.session.execute(text("DELETE FROM workspace_users"))
        db.session.execute(text("DELETE FROM channels"))
        db.session.execute(text("DELETE FROM channel_users"))
        db.session.execute(text("DELETE FROM channel_messages"))

    db.session.commit()
