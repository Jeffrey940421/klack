from app.models import db, Workspace, WorkspaceUser, Channel, ChannelMessage, ChannelUser, environment, SCHEMA
from sqlalchemy.sql import text
from faker import Faker
from random import randint, choice
from .users import users

faker = Faker()

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

def emailToName(email):
  nameList = email.split("@")[0].split(".")
  fullName = " ".join(nameList)
  return fullName.title()

def fake_workspaces(workspace_num):
  existing_workspace = set()
  workspaces = []
  workspace_users = []
  channels = []
  channel_messages = []
  channel_users = []
  for i in range(0, workspace_num):
    name = faker.company()
    while name in existing_workspace:
      name = faker.company()
    existing_workspace.add(name)
    icon_url = choice(workspace_icons)
    owner = choice(users)
    workspace = Workspace(
      name = name,
      icon_url = icon_url,
      owner = owner
    )
    workspaces.append(workspace)
    workspace_users.append(WorkspaceUser(
      workspace = workspace,
      user = owner,
      nickname = emailToName(owner.email) + " - " + name,
      profile_image_url = choice(profile_images),
      role = "admin"
    ))
    channel = Channel(
      name = "general",
      description = "This is the one channel that will always include everyone. It’s a great spot for announcements and team-wide conversations.",
      creator = owner,
      workspace = workspace
    )
    channel_user = ChannelUser(
      channel = channel,
      user = owner
    )
    channels.append(channel)
    channel_users.append(channel_user)
    channel_messages.append(ChannelMessage(
      sender = owner,
      channel = channel,
      content = "Joined",
      system_message=True
    ))
    channel_messages.append(ChannelMessage(
      sender = owner,
      channel = channel,
      content = "Welcome on board"
    ))
  return {"workspaces": workspaces, "workspace_users": workspace_users, "channels": channels, "channel_messages": channel_messages, "channel_users": channel_users}

result = fake_workspaces(3)
workspaces = result["workspaces"]
workspace_users = result["workspace_users"]
channels = result["channels"]
channel_messages = result["channel_messages"]
channel_users = result["channel_users"]


# Adds a demo user, you can add other users here if you want
def seed_workspaces():
    _ = [db.session.add(workspace) for workspace in workspaces]
    _ = [db.session.add(workspace_user) for workspace_user in workspace_users]
    _ = [db.session.add(channel) for channel in channels]
    _ = [db.session.add(channel_user) for channel_user in channel_users]
    _ = [db.session.add(channel_message) for channel_message in channel_messages]
    db.session.commit()


# Uses a raw SQL query to TRUNCATE or DELETE the users table. SQLAlchemy doesn't
# have a built in function to do this. With postgres in production TRUNCATE
# removes all the data from the table, and RESET IDENTITY resets the auto
# incrementing primary key, CASCADE deletes any dependent entities.  With
# sqlite3 in development you need to instead use DELETE to remove all data and
# it will reset the primary keys for you as well.
def undo_workspaces():
    if environment == "production":
        db.session.execute(
            f"TRUNCATE table {SCHEMA}.workspaces RESTART IDENTITY CASCADE;")
    else:
        db.session.execute(text("DELETE FROM workspaces"))

    db.session.commit()
