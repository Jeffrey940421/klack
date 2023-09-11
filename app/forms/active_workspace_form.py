from flask_wtf import FlaskForm
from wtforms import IntegerField
from wtforms.validators import DataRequired, Length, Optional, URL, ValidationError
from app.models import Workspace

def workspace_exists(form, field):
  workspace = Workspace.query.get(field.data)
  if not workspace:
    raise ValidationError('Workspace is not found')

class ActiveWorkspaceForm(FlaskForm):
  active_workspace_id = IntegerField('active workspace id', validators=[DataRequired(), workspace_exists])
