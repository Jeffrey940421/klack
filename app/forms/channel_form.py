from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField
from wtforms.validators import DataRequired, Length, Optional, URL, ValidationError
from app.models import Channel

class ChannelForm(FlaskForm):
  name = StringField('name', validators=[DataRequired(), Length(max=80)])
  description = StringField('description', validators=[Optional()])
