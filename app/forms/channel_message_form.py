from flask_wtf import FlaskForm
from wtforms import StringField, MultipleFileField
from wtforms.validators import DataRequired

class ChannelMessageForm(FlaskForm):
  content = StringField('content', validators=[DataRequired()])
  attachments = MultipleFileField("attachments")
