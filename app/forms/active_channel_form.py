from flask_wtf import FlaskForm
from wtforms import IntegerField
from wtforms.validators import DataRequired, Length, Optional, URL, ValidationError
from app.models import Channel

def channel_exists(form, field):
  channel = Channel.query.get(field.data)
  if not channel:
    raise ValidationError('Channel is not found')

class ActiveChannelForm(FlaskForm):
  active_channel_id = IntegerField('active channel id', validators=[DataRequired(), channel_exists])
