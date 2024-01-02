from .db import db, environment, SCHEMA, add_prefix_for_prod

class ChannelMessageReaction(db.Model):
    __tablename__ = 'channel_message_reactions'
    __table_args__ = (
      db.UniqueConstraint("sender_id", "message_id", "reaction_code"),
    )

    if environment == "production":
        __table_args__ += ({'schema': SCHEMA}, )

    id = db.Column(
      db.Integer,
      primary_key=True
    )
    sender_id = db.Column(
      db.Integer,
      db.ForeignKey(add_prefix_for_prod("users.id")),
      nullable=False
    )
    message_id = db.Column(
      db.Integer,
      db.ForeignKey(add_prefix_for_prod("channel_messages.id")),
      nullable=False
    )
    reaction_code = db.Column(
      db.String(255),
      nullable=False
    )
    reaction_skin = db.Column(
      db.String(255),
      nullable=False
    )

    sender = db.relationship(
      "User",
      foreign_keys="ChannelMessageReaction.sender_id",
      back_populates="sent_channel_message_reactions",
    )
    message = db.relationship(
      "ChannelMessage",
      foreign_keys="ChannelMessageReaction.message_id",
      back_populates="reactions",
    )

    def to_dict(self):
       return {
          'id': self.id,
          'senderId': self.sender_id,
          'senderEmail': self.sender.email,
          'messageId': self.message_id,
          'channelId': self.message.channel_id,
          'workspaceId': self.message.channel.workspace_id,
          'reactionCode': self.reaction_code,
          'reactionSkin': self.reaction_skin,
       }
