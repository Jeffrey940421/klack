from flask import Blueprint, request
from sqlalchemy.orm import joinedload
from app.models import Channel, ChannelMessageReply, ChannelMessage, db
from flask_login import current_user, login_required
from app.forms import ReplyForm
from app.socket import socketio
import json

reply_routes = Blueprint('reply', __name__)


def validation_errors_to_error_messages(validation_errors):
    """
    Simple function that turns the WTForms validation errors into a simple list
    """
    errorMessages = []
    for field in validation_errors:
        for error in validation_errors[field]:
            errorMessages.append(f'{field} : {error}')
    return errorMessages


@reply_routes.route('/<int:id>', methods=['PUT'])
@login_required
def current_messages(id):
    """
    Edit a reply and return the reply's information
    """
    form = ReplyForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    reply = ChannelMessageReply.query.options(
        joinedload(ChannelMessageReply.sender),
        joinedload(ChannelMessageReply.message)
        .joinedload(ChannelMessage.channel)
        .joinedload(Channel.active_users)
    ).filter(ChannelMessageReply.id == id).first()
    if not reply:
        return {'errors': 'Reply is not found'}, 404
    if reply.sender_id != current_user.id:
        return {'errors': 'User is only authorized to edit the reply sent by themselves'}, 403
    if current_user.active_workspace_id != reply.message.channel.workspace_id or current_user.id not in [workspace_user.user_id for workspace_user in reply.message.channel.active_users]:
        return {"errors": "User must set the channel as active channel and the workspace as active workspace before editing reply"}, 403
    if form.validate_on_submit():
        reply.content = form.data['content']
        db.session.commit()
        socketio.emit('edit_reply', {
            "senderId": current_user.id,
            "reply": json.dumps(reply.to_dict(), default=str),
        }, room=f"channel{reply.message.channel_id}")
        return {'reply': reply.to_dict()}
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401

@reply_routes.route('/<int:id>', methods=['DELETE'])
@login_required
def delete_reply(id):
    """
    Delete a reply and return the deleted reply's id and message's id
    """
    reply = ChannelMessageReply.query.options(
        joinedload(ChannelMessageReply.message)
        .joinedload(ChannelMessage.channel)
        .joinedload(Channel.active_users)
    ).filter(ChannelMessageReply.id == id).first()
    if not reply:
        return {'errors': 'Reply is not found'}, 404
    message = reply.message
    message_id = message.id
    if reply.sender_id != current_user.id:
        return {'errors': 'User is only authorized to delete the reply sent by themselves'}, 403
    if current_user.active_workspace_id != message.channel.workspace_id or current_user.id not in [workspace_user.user_id for workspace_user in message.channel.active_users]:
        return {"errors": "User must set the channel as active channel and the workspace as active workspace before deleting reply"}, 401
    db.session.delete(reply)
    db.session.commit()
    socketio.emit('delete_reply', {
        "senderId": current_user.id,
        "messageId": message_id,
        "replyId": id,
    }, room=f"channel{message.channel_id}")
    return {'replyId': id, 'messageId': message_id}
