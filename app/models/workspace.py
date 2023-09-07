from .db import db, environment, SCHEMA, add_prefix_for_prod
from sqlalchemy.sql import func
from sqlalchemy.ext.associationproxy import association_proxy

class Workspace(db.Model):
    __tablename__ = 'workspaces'

    if environment == "production":
        __table_args__ = {'schema': SCHEMA}

    id = db.Column(
      db.Integer,
      primary_key=True
    )
    name = db.Column(
      db.String(80),
      nullable=False
    )
    icon_url = db.Column(
      db.String(255),
      nullable=False
    )
    owner_id = db.Column(
      db.Integer,
      db.ForeignKey(add_prefix_for_prod("users.id")),
      nullable=False
    )
    created_at = db.Column(
      db.Date,
      nullable=False,
      default=func.now()
    )

    # Users that is viewing this workspace or were viewing this workspace before logging out
    active_users = db.relationship(
      "User",
      foreign_keys="User.active_workspace_id",
      back_populates="active_workspace"
    )
    owner = db.relationship(
      "User",
      foreign_keys="Workspace.owner_id",
      back_populates="owned_workspaces"
    )
    channels = db.relationship(
      "Channel",
      foreign_keys="Channel.workspace_id",
      back_populates="workspace",
      cascade="all, delete-orphan"
    )
    user_associations = db.relationship(
      "WorkspaceUser",
      foreign_keys="WorkspaceUser.workspace_id",
      back_populates="workspace",
      cascade="all, delete-orphan"
    )
    users = association_proxy(
        "user_associations",
        "user"
    )
    associated_invitations = db.relationship(
      "WorkspaceInvitation",
      foreign_keys="WorkspaceInvitation.workspace_id",
      back_populates="workspace",
      cascade="all, delete-orphan"
    )

    def to_dict_summary(self):
        return {
            'id': self.id,
            'name': self.name,
            'icon_url': self.icon_url,
            'owner': self.owner.to_dict_summary(),
            'created_at': self.created_at
        }
    def to_dict_detail(self):
        return {
            'id': self.id,
            'name': self.name,
            'icon_url': self.icon_url,
            'owner': self.owner.to_dict_summary(),
            'created_at': self.created_at,
            'users': [user_association.to_dict() for user_association in self.user_associations],
            'channels': [channel.to_dict_detail() for channel in self.channels]
        }
