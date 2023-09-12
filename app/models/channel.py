from .db import db, environment, SCHEMA, add_prefix_for_prod
from .workspace_users import WorkspaceUser
from sqlalchemy.sql import func
from .channel_user import channel_users
from datetime import date

def setDefaultDescription(context):
  creator_id = context.get_current_parameters()["creator_id"]
  workspace_id = context.get_current_parameters()["workspace_id"]
  creator_nickname = WorkspaceUser.query.get((workspace_id, creator_id)).nickname
  channel_name = context.get_current_parameters()["name"]
  create_date = date.today().strftime("%B %d, %Y")
  return f"@{creator_nickname} created this channel on {create_date}. This is the very beginning of #{channel_name} channel."

class Channel(db.Model):
    __tablename__ = 'channels'
    __table_args__ = (
      db.UniqueConstraint("name", "workspace_id"),
    )

    if environment == "production":
        __table_args__ += ({'schema': SCHEMA}, )

    id = db.Column(
      db.Integer,
      primary_key=True
    )
    name = db.Column(
      db.String(255),
      nullable=False
    )
    description = db.Column(
      db.Text,
      default=setDefaultDescription,
      nullable=False
    )
    creator_id = db.Column(
      db.Integer,
      db.ForeignKey(add_prefix_for_prod("users.id")),
      nullable=False
    )
    workspace_id = db.Column(
      db.Integer,
      db.ForeignKey(add_prefix_for_prod("workspaces.id")),
      nullable=False
    )
    created_at = db.Column(
      db.Date,
      nullable=False,
      default=func.now()
    )

    creator = db.relationship(
      "User",
      foreign_keys="Channel.creator_id",
      back_populates="owned_channels"
    )
    workspace = db.relationship(
      "Workspace",
      foreign_keys="Channel.workspace_id",
      back_populates="channels"
    )
    users = db.relationship(
      "User",
      secondary=channel_users,
      back_populates="channels"
    )
    messages = db.relationship(
      "ChannelMessage",
      foreign_keys="ChannelMessage.channel_id",
      back_populates="channel",
      cascade="all, delete-orphan"
    )

    active_users = db.relationship(
       "WorkspaceUser",
       foreign_keys="WorkspaceUser.active_channel_id",
       back_populates="active_channel"
    )

    def to_dict_summary(self):
       return {
          'id': self.id,
          'name': self.name,
          'description': self.description,
          'creator_id': self.creator_id,
          'message_num': len(self.messages),
          'created_at': self.created_at
       }

    def to_dict_detail(self):
       return {
          'id': self.id,
          'name': self.name,
          'description': self.description,
          'creator': self.creator.to_dict_workspace(self.workspace_id),
          'workspaceId': self.workspace_id,
          'users': [user.to_dict_workspace(self.workspace_id) for user in self.users],
          'messages': [message.to_dict_summary() for message in self.messages],
          'createdAt': self.created_at
       }
