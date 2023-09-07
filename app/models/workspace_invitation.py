from .db import db, environment, SCHEMA, add_prefix_for_prod
from sqlalchemy.sql import func
from sqlalchemy.orm import validates

class WorkspaceInvitation(db.Model):
    __tablename__ = 'workspace_invitations'

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
    recipient_id = db.Column(
      db.Integer,
      db.ForeignKey(add_prefix_for_prod("users.id")),
      nullable=False
    )
    workspace_id = db.Column(
      db.Integer,
      db.ForeignKey(add_prefix_for_prod("workspaces.id")),
      nullable=False
    )
    status = db.Column(
      db.String(30),
      default="pending",
      nullable=False
    )
    created_at = db.Column(
      db.Date,
      nullable=False,
      default=func.now()
    )

    sender = db.relationship(
      "User",
      foreign_keys="WorkspaceInvitation.sender_id",
      back_populates="sent_workspace_invitations"
    )
    recipient = db.relationship(
      "User",
      foreign_keys="WorkspaceInvitation.recipient_id",
      back_populates="received_workspace_invitations"
    )
    workspace = db.relationship(
      "Workspace",
      foreign_keys="WorkspaceInvitation.workspace_id",
      back_populates="associated_invitations"
    )

    @validates("status")
    def validate_role(self, key, value):
      if value != "pending" and value != "accepted" and value != "ignored":
        raise ValueError("Status must be 'pending', 'accepted', or 'ignored'")
      return value
