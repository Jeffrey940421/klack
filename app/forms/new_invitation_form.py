from flask_wtf import FlaskForm
from wtforms import StringField
from wtforms.validators import DataRequired, Email, ValidationError
from app.models import User

def user_exists(form, field):
  user = User.query.filter(User.email == field.data).first()
  if not user:
    raise ValidationError(f'User {field.data} is not found')

class NewInvitationForm(FlaskForm):
  recipient_email = StringField('recipient email', validators=[DataRequired(), Email(), user_exists])
