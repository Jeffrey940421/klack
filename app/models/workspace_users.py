from .db import db, environment, SCHEMA, add_prefix_for_prod
from sqlalchemy.orm import validates

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

    @validates("role")
    def validate_role(self, key, value):
      if value != "admin" and value != "guest":
        raise ValueError("Role must be either 'admin' or 'guest'")
      return value
