from flask_wtf import FlaskForm
from wtforms import StringField
from wtforms.validators import DataRequired, Length, Optional, URL, ValidationError
from app.models import WorkspaceUser

class WorkspaceUserForm(FlaskForm):
  nickname = StringField('nickname', validators=[DataRequired(), Length(max=80)])
  profile_image_url = StringField('profile image url', validators=[Optional(), Length(max=255)])
