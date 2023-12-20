from .db import db, environment, SCHEMA, add_prefix_for_prod
from sqlalchemy.sql import func
from sqlalchemy.ext.associationproxy import association_proxy

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
      db.DateTime,
      nullable=False,
      default=func.now()
    )
    description = db.Column(
      db.Text
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
    user_associations = db.relationship(
      "ChannelUser",
      foreign_keys="ChannelUser.channel_id",
      back_populates="channel",
      cascade="all, delete-orphan"
    )
    users = association_proxy(
      "user_associations",
      "user"
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

    def to_dict(self, channel_user=None):
       return {
          'id': self.id,
          'name': self.name,
          'description': self.description,
          'creatorId': self.creator_id,
          'creatorEmail': self.creator.email,
          'workspaceId': self.workspace_id,
          'users': [user.id for user in self.users],
          'messageNum': len(self.messages),
          'joinedAt': channel_user.created_at.strftime("%a, %d %b %Y %H:%M:%S GMT") if channel_user else None,
          'createdAt': self.created_at.strftime("%a, %d %b %Y %H:%M:%S GMT"),
          'lastViewedAt': channel_user.last_viewed_at.strftime("%a, %d %b %Y %H:%M:%S GMT") if channel_user else None
       }
