from flask_wtf import FlaskForm
from wtforms import StringField
from wtforms.validators import DataRequired, Length, Optional, URL, ValidationError
from app.models import Channel

class ChannelMessageForm(FlaskForm):
  content = StringField('content', validators=[DataRequired()])
