from flask_wtf import FlaskForm
from wtforms import StringField
from wtforms.validators import DataRequired

class ReactionForm(FlaskForm):
  reaction_code = StringField('reaction code', validators=[DataRequired()])
  reaction_skin = StringField('reaction skin', validators=[DataRequired()])
