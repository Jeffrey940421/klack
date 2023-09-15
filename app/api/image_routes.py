from flask import Blueprint, request
from flask_login import current_user, login_required
from .aws_helper import upload_file_to_s3, get_unique_filename
from app.forms.image_form import ImageForm

image_routes = Blueprint("images", __name__)

def validation_errors_to_error_messages(validation_errors):
    """
    Simple function that turns the WTForms validation errors into a simple list
    """
    errorMessages = []
    for field in validation_errors:
        for error in validation_errors[field]:
            errorMessages.append(f'{field} : {error}')
    return errorMessages

@image_routes.route("/new", methods=["POST"])
@login_required
def upload_image():
    form = ImageForm()
    form['csrf_token'].data = request.cookies['csrf_token']

    if form.validate_on_submit():

        image = form.data["image"]
        print(image.filename)
        image.filename = get_unique_filename(image.filename)
        upload = upload_file_to_s3(image)

        if "url" not in upload:
        # if the dictionary doesn't have a url key
        # it means that there was an error when you tried to upload
        # so you send back that error message (and you printed it above)
            return {"errors": [upload["errors"]]}, 400

        url = upload["url"]
        return {"url": url}

    if form.errors:
        return {"errors": validation_errors_to_error_messages(form.errors)}, 400
