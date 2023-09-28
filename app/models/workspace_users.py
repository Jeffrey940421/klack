from .db import db, environment, SCHEMA, add_prefix_for_prod
from sqlalchemy.orm import validates
from sqlalchemy.sql import func

class WorkspaceUser(db.Model):
    __tablename__ = 'workspace_users'

    if environment == "production":
        __table_args__ = {'schema': SCHEMA}

    workspace_id = db.Column(
      db.Integer,
      db.ForeignKey(add_prefix_for_prod("workspaces.id")),
      primary_key=True
    )
    user_id = db.Column(
      db.Integer,
      db.ForeignKey(add_prefix_for_prod("users.id")),
      primary_key=True
    )
    nickname = db.Column(
      db.String(80),
      nullable=False
    )
    profile_image_url = db.Column(
      db.String(255),
      nullable=False
    )
    role = db.Column(
      db.String(30),
      nullable=False
    )
    last_viewed_at = db.Column(
        db.DateTime,
        nullable=False,
        default=func.now()
    )

    active_channel_id = db.Column(
       db.Integer,
       db.ForeignKey(add_prefix_for_prod("channels.id"))
    )
    workspace = db.relationship(
      "Workspace",
      foreign_keys="WorkspaceUser.workspace_id",
      back_populates="user_associations"
    )
    user = db.relationship(
      "User",
      foreign_keys="WorkspaceUser.user_id",
      back_populates="workspace_associations"
    )
    active_channel = db.relationship(
       "Channel",
       foreign_keys="WorkspaceUser.active_channel_id",
       back_populates="active_users"
    )

    @validates("role")
    def validate_role(self, key, value):
      if value != "admin" and value != "guest":
        raise ValueError("Role must be either 'admin' or 'guest'")
      return value

    def to_dict(self):
       return {
          'workspaceId': self.workspace_id,
          'userId': self.user_id,
          'nickname': self.nickname,
          'profileImageUrl': self.profile_image_url,
          'role': self.role
       }
