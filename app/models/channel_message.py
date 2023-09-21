from .db import db, environment, SCHEMA, add_prefix_for_prod
from sqlalchemy.sql import func

class ChannelMessage(db.Model):
    __tablename__ = 'channel_messages'

    if environment == "production":
      __table_args__ = {'schema': SCHEMA}

    id = db.Column(
      db.Integer,
      primary_key=True
    )
    sender_id = db.Column(
      db.Integer,
      db.ForeignKey(add_prefix_for_prod("users.id")),
      nullable=False
    )
    channel_id = db.Column(
      db.Integer,
      db.ForeignKey(add_prefix_for_prod("channels.id")),
      nullable=False
    )
    content = db.Column(
      db.Text,
      nullable=False
    )
    system_message = db.Column(
       db.Boolean,
       nullable=False,
       default=False
    )
    created_at = db.Column(
      db.DateTime,
      nullable=False,
      default=func.now()
    )
    updated_at = db.Column(
      db.DateTime,
      nullable=False,
      default=func.now(),
      onupdate=func.now()
    )

    sender = db.relationship(
      "User",
      foreign_keys="ChannelMessage.sender_id",
      back_populates="sent_channel_messages",
    )
    channel = db.relationship(
      "Channel",
      foreign_keys="ChannelMessage.channel_id",
      back_populates="messages",
    )

    def to_dict_summary(self):
       return {
          'id': self.id,
          'sender': self.sender.to_dict_workspace(self.channel.workspace_id),
          'channelId': self.channel_id,
          'workspaceId': self.channel.workspace_id,
          'content': self.content,
          'systemMessage': self.system_message,
          'createdAt': self.created_at.strftime("%a, %d %b %Y %H:%M:%S GMT"),
          'updatedAt': self.updated_at.strftime("%a, %d %b %Y %H:%M:%S GMT")
       }
