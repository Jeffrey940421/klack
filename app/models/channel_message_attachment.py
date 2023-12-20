from .db import db, environment, SCHEMA, add_prefix_for_prod

class ChannelMessageAttachment(db.Model):
    __tablename__ = 'channel_message_attachments'

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
    url = db.Column(
        db.String(255),
        nullable=False
    )

    message = db.relationship(
        "ChannelMessage",
        foreign_keys="ChannelMessageAttachment.message_id",
        back_populates="attachments",
    )
