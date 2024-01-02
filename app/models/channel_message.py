from .db import db, environment, SCHEMA, add_prefix_for_prod
from sqlalchemy.sql import func
import itertools


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
    replies = db.relationship(
        "ChannelMessageReply",
        foreign_keys="ChannelMessageReply.message_id",
        back_populates="message",
        cascade="all, delete-orphan"
    )
    attachments = db.relationship(
        "ChannelMessageAttachment",
        foreign_keys="ChannelMessageAttachment.message_id",
        back_populates="message",
        cascade="all, delete-orphan"
    )
    reactions = db.relationship(
        "ChannelMessageReaction",
        foreign_keys="ChannelMessageReaction.message_id",
        back_populates="message",
        cascade="all, delete-orphan"
    )

    channel_id_index = db.Index(
        'ix_channel_messages_channel_id',
        channel_id
    )
    created_at_index = db.Index(
        'ix_channel_messages_created_at',
        created_at
    )

    def to_dict(self):
        return {
            'id': self.id,
            'senderId': self.sender_id,
            'senderEmail': self.sender.email,
            'channelId': self.channel_id,
            'workspaceId': self.channel.workspace_id,
            'content': self.content,
            'systemMessage': self.system_message,
            'replies': {
                reply.id: reply.to_dict() for reply in self.replies
            } if not self.system_message else {},
            'attachments': [attachment.url for attachment in self.attachments] if not self.system_message else [],
            'reactions': {
                reaction_code: {
                    reaction_skin: [reaction.to_dict() for reaction in reactions] for reaction_skin, reactions in itertools.groupby(
                        reactions, key=lambda x: x.reaction_skin)
                } for reaction_code, reactions in itertools.groupby(
                    sorted(self.reactions, key=lambda x: (
                        x.reaction_code, x.reaction_skin)),
                    key=lambda x: x.reaction_code
                )
            } if not self.system_message else {},
            'createdAt': self.created_at.strftime("%a, %d %b %Y %H:%M:%S GMT"),
            'updatedAt': self.updated_at.strftime("%a, %d %b %Y %H:%M:%S GMT")
        }
