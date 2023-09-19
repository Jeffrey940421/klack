from .db import db, environment, SCHEMA, add_prefix_for_prod
from sqlalchemy.orm import validates
from sqlalchemy.sql import func


class ChannelUser(db.Model):
    __tablename__ = 'channel_users'

    if environment == "production":
        __table_args__ = {'schema': SCHEMA}

    channel_id = db.Column(
        db.Integer,
        db.ForeignKey(add_prefix_for_prod('channels.id')),
        primary_key=True
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey(add_prefix_for_prod('users.id')),
        primary_key=True
    )
    last_viewed_at = db.Column(
        db.DateTime,
        nullable=False,
        default=func.now()
    )

    channel = db.relationship(
        "Channel",
        foreign_keys="ChannelUser.channel_id",
        back_populates="user_associations"
    )
    user = db.relationship(
        "User",
        foreign_keys="ChannelUser.user_id",
        back_populates="channel_associations"
    )
