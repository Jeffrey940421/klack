from .db import db, environment, SCHEMA, add_prefix_for_prod
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from sqlalchemy.sql import func
from sqlalchemy.ext.associationproxy import association_proxy


class User(db.Model, UserMixin):
    __tablename__ = 'users'

    if environment == "production":
        __table_args__ = {'schema': SCHEMA}

    id = db.Column(
        db.Integer,
        primary_key=True
    )
    email = db.Column(
        db.String(255),
        nullable=False,
        unique=True
    )
    hashed_password = db.Column(
        db.String(255),
        nullable=False
    )
    # Workspace that the user is currently viewing or last viewed during the previous session
    active_workspace_id = db.Column(
        db.Integer,
        db.ForeignKey(add_prefix_for_prod("workspaces.id"))
    )
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=func.now()
    )

    active_workspace = db.relationship(
        "Workspace",
        foreign_keys="User.active_workspace_id",
        back_populates="active_users"
    )
    owned_workspaces = db.relationship(
        "Workspace",
        foreign_keys="Workspace.owner_id",
        back_populates="owner"
    )
    owned_channels = db.relationship(
        "Channel",
        foreign_keys="Channel.creator_id",
        back_populates="creator"
    )
    workspace_associations = db.relationship(
        "WorkspaceUser",
        foreign_keys="WorkspaceUser.user_id",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    workspaces = association_proxy(
        "workspace_associations",
        "workspace"
    )
    channel_associations = db.relationship(
        "ChannelUser",
        foreign_keys="ChannelUser.user_id",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    channels = association_proxy(
        "channel_associations",
        "channel"
    )
    sent_workspace_invitations = db.relationship(
        "WorkspaceInvitation",
        foreign_keys="WorkspaceInvitation.sender_id",
        back_populates="sender",
        cascade="all, delete-orphan"
    )
    received_workspace_invitations = db.relationship(
        "WorkspaceInvitation",
        foreign_keys="WorkspaceInvitation.recipient_id",
        back_populates="recipient",
        cascade="all, delete-orphan"
    )
    sent_channel_messages = db.relationship(
        "ChannelMessage",
        foreign_keys="ChannelMessage.sender_id",
        back_populates="sender",
        cascade="all, delete-orphan"
    )
    sent_channel_message_replies = db.relationship(
        "ChannelMessageReply",
        foreign_keys="ChannelMessageReply.sender_id",
        back_populates="sender",
        cascade="all, delete-orphan"
    )
    sent_channel_message_reactions = db.relationship(
        "ChannelMessageReaction",
        foreign_keys="ChannelMessageReaction.sender_id",
        back_populates="sender",
        cascade="all, delete-orphan"
    )

    @property
    def password(self):
        return self.hashed_password

    @password.setter
    def password(self, password):
        self.hashed_password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'activeWorkspaceId': self.active_workspace_id,
        }
