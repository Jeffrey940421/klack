from flask_wtf import FlaskForm
from wtforms import IntegerField
from wtforms.validators import ValidationError

def input_valid(form, field):
  if field.data != 0 and not field.data:
    raise ValidationError('This field is required')

class ActiveWorkspaceForm(FlaskForm):
  active_workspace_id = IntegerField('active workspace id', validators=[input_valid])
