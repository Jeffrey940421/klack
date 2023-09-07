from flask_wtf import FlaskForm
from wtforms import StringField
from wtforms.validators import DataRequired, Length, Optional, URL, ValidationError
from app.models import Workspace

class WorkspaceForm(FlaskForm):
  name = StringField('name', validators=[DataRequired(), Length(max=80)])
  icon_url = StringField('icon url', validators=[Optional(), Length(max=255), URL()])
