from flask import Blueprint, request
from sqlalchemy.orm import joinedload
from app.models import ChannelMessage, ChannelMessageReaction, Channel, db
from flask_login import current_user, login_required
from app.forms import ReplyForm
from app.socket import socketio
import json

reaction_routes = Blueprint('reaction', __name__)


def validation_errors_to_error_messages(validation_errors):
    """
    Simple function that turns the WTForms validation errors into a simple list
    """
    errorMessages = []
    for field in validation_errors:
        for error in validation_errors[field]:
            errorMessages.append(f'{field} : {error}')
    return errorMessages


@reaction_routes.route('/<int:id>', methods=['DELETE'])
@login_required
def delete_reaction(id):
    """
    Delete a reaction and return the deleted reaction's reaction code, reaction skin, id, and message's id
    """
    reaction = ChannelMessageReaction.query.options(
        joinedload(ChannelMessageReaction.message)
        .joinedload(ChannelMessage.channel)
        .joinedload(Channel.active_users)
    ).filter(ChannelMessageReaction.id == id).first()
    if not reaction:
        return {'errors': 'Reaction is not found'}, 404
    message = reaction.message
    message_id = message.id
    reaction_code = reaction.reaction_code
    reaction_skin = reaction.reaction_skin
    if reaction.sender_id != current_user.id:
        return {'errors': 'User is only authorized to delete the reaction sent by themselves'}, 403
    if current_user.active_workspace_id != message.channel.workspace_id or current_user.id not in [workspace_user.user_id for workspace_user in message.channel.active_users]:
        return {"errors": "User must set the channel as active channel and the workspace as active workspace before deleting reaction"}, 403
    db.session.delete(reaction)
    db.session.commit()
    socketio.emit('delete_reaction', {
        "senderId": current_user.id,
        "reactionId": id,
        "reactionCode": reaction_code,
        "reactionSkin": reaction_skin,
        "messageId": message_id
    }, room=f"channel{message.channel_id}")
    return {
        "reactionId": id,
        "reactionCode": reaction_code,
        "reactionSkin": reaction_skin,
        "messageId": message_id
    }
