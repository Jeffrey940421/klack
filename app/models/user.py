from .db import db, environment, SCHEMA, add_prefix_for_prod
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from sqlalchemy.sql import func
from .channel_user import channel_users
from .workspace_users import WorkspaceUser
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
    # The last workspace that the user worked on before logging out
    active_workspace_id = db.Column(
        db.Integer,
        db.ForeignKey(add_prefix_for_prod("workspaces.id"))
    )
    created_at = db.Column(
        db.Date,
        nullable=False,
        default=func.now()
    )

    # The last workspace that the user worked on before logging out
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
    channels = db.relationship(
        "Channel",
        secondary=channel_users,
        back_populates="users"
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

    @property
    def password(self):
        return self.hashed_password

    @password.setter
    def password(self, password):
        self.hashed_password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def to_dict_summary(self):
        return {
            'id': self.id,
            'email': self.email,
            'activeWorkspace': self.active_workspace.to_dict_summary(),
        }

    def to_dict_detail(self):
        workspace_association = WorkspaceUser.query.get((self.active_workspace_id, self.id))
        return {
            'id': self.id,
            'email': self.email,
            'activeWorkspace': self.active_workspace.to_dict_summary() if self.active_workspace else None,
            'activeChannel': workspace_association.active_channel.to_dict_summary() if workspace_association and workspace_association.active_channel else None,
            'createdAt': self.created_at,
            'workspaces': [workspace.to_dict_summary() for workspace in self.workspaces],
            'receivedWorkspaceInvitations': [invitation.to_dict() for invitation in self.received_workspace_invitations]
        }

    def to_dict_workspace(self, workspace_id):
        workspace_association = WorkspaceUser.query.get((workspace_id, self.id))
        return {
            'id': self.id,
            'email': self.email,
            'nickname': workspace_association.nickname if workspace_association else None,
            'profileImageUrl': workspace_association.profile_image_url if workspace_association else None,
            'role': workspace_association.role if workspace_association else None,
        }
