from .db import db, environment, SCHEMA, add_prefix_for_prod
from sqlalchemy.sql import func

class ChannelMessageReply(db.Model):
    __tablename__ = 'channel_message_replies'

    if environment == "production":
       __table_args__ = ({'schema': SCHEMA}, )

    id = db.Column(
      db.Integer,
      primary_key=True
    )
    message_id = db.Column(
      db.Integer,
      db.ForeignKey(add_prefix_for_prod("channel_messages.id")),
      nullable=False
    )
    sender_id = db.Column(
      db.Integer,
      db.ForeignKey(add_prefix_for_prod("users.id")),
      nullable=False
    )
    content = db.Column(
      db.Text,
      nullable=False
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

    message = db.relationship(
      "ChannelMessage",
      foreign_keys="ChannelMessageReply.message_id",
      back_populates="replies",
    )
    sender = db.relationship(
      "User",
      foreign_keys="ChannelMessageReply.sender_id",
      back_populates="sent_channel_message_replies",
    )

    def to_dict(self):
       return {
          'id': self.id,
          'messageId': self.message_id,
          'senderId': self.sender_id,
          'senderEmail': self.sender.email,
          'content': self.content,
          'createdAt': self.created_at,
          'updatedAt': self.updated_at
       }
