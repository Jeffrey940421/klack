from flask import Blueprint, request
from sqlalchemy.orm import joinedload
from sqlalchemy import func
from app.models import Channel, ChannelMessageReply, ChannelUser, ChannelMessage, db
from flask_login import current_user, login_required
from app.forms import ChannelMessageForm, ReplyForm
from app.socket import socketio
import json

message_routes = Blueprint('message', __name__)


def validation_errors_to_error_messages(validation_errors):
    """
    Simple function that turns the WTForms validation errors into a simple list
    """
    errorMessages = []
    for field in validation_errors:
        for error in validation_errors[field]:
            errorMessages.append(f'{field} : {error}')
    return errorMessages


@message_routes.route('/current', methods=['GET'])
@login_required
def current_messages():
    """
    Query for latest messages in the channels that the current user has joined and return the messages' information
    """
    size = int(request.args.get('size')) if request.args.get('size') and request.args.get(
        'size').isdigit() and int(request.args.get('size')) > 0 else 50
    # Subquery to rank the messages in each channel by creation time
    subquery = db.session.query(
        ChannelMessage,
        func.row_number().over(
            partition_by=ChannelMessage.channel_id,
            order_by=ChannelMessage.created_at.desc()
        ).label('rank')
    ).join(Channel).join(ChannelUser).filter(
        ChannelUser.user_id == current_user.id).subquery()
    # Query to get the latest messages in each channel
    query = db.session.query(subquery).filter(
        subquery.c.rank <= size)
    # Query to get the messages that the current user has not viewed
    query2 = db.session.query(subquery).join(
        Channel, subquery.c.channel_id == Channel.id).join(
        ChannelUser, Channel.id == ChannelUser.channel_id).filter(
        ChannelUser.last_viewed_at < subquery.c.created_at)
    # Union the two queries and get the message ids
    message_ids = db.session.scalars(query.union(query2)).all()
    # Query for the messages and return the messages' information
    messages = ChannelMessage.query.options(
        joinedload(ChannelMessage.sender),
        joinedload(ChannelMessage.attachments),
        joinedload(ChannelMessage.channel),
        joinedload(ChannelMessage.replies)
        .joinedload(ChannelMessageReply.sender)
    ).filter(ChannelMessage.id.in_(message_ids)).order_by(
        ChannelMessage.channel_id, ChannelMessage.created_at.desc(), ChannelMessage.id.desc()).all()
    return {"messages": [message.to_dict() for message in messages]}

@message_routes.route('/<int:id>', methods=['PUT'])
@login_required
def edit_message(id):
    """
    Edit a message and return the edited message's information
    """
    form = ChannelMessageForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    message = ChannelMessage.query.options(
        joinedload(ChannelMessage.sender),
        joinedload(ChannelMessage.attachments),
        joinedload(ChannelMessage.channel)
        .joinedload(Channel.active_users)
    ).filter(ChannelMessage.id == id).first()
    if not message:
        return {'errors': ['Message not found']}, 404
    if message.sender_id != current_user.id:
        return {'errors': ['User is only authorized to edit the messages sent by themselves']}, 403
    if current_user.active_workspace_id != message.channel.workspace_id or current_user.id not in [workspace_user.user_id for workspace_user in message.channel.active_users]:
        return {"errors": ["User must set the channel as active channel and the workspace as active workspace before editing message"]}, 403
    if form.validate_on_submit():
        message.content = form.data['content']
        db.session.commit()
        socketio.emit('edit_message', {
            "senderId": current_user.id,
            "message": json.dumps(message.to_dict(), default=str),
        }, room=f"channel{message.channel_id}")
        return {'message': message.to_dict()}
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401

@message_routes.route('/<int:id>', methods=['DELETE'])
@login_required
def delete_message(id):
    """
    Delete a message and return the deleted message's id and channel's information
    """
    message = ChannelMessage.query.options(
        joinedload(ChannelMessage.sender),
        joinedload(ChannelMessage.attachments),
        joinedload(ChannelMessage.replies),
        joinedload(ChannelMessage.reactions),
        joinedload(ChannelMessage.channel)
        .joinedload(Channel.active_users),
        joinedload(ChannelMessage.channel)
        .joinedload(Channel.user_associations)
    ).filter(ChannelMessage.id == id).first()
    channel = message.channel
    channel_user = next(
        (channel_user for channel_user in channel.user_associations if channel_user.user_id == current_user.id), None)
    if not message:
        return {'errors': ['Message not found']}, 404
    if message.sender_id != current_user.id:
        return {'errors': ['User is only authorized to delete the messages sent by themselves']}, 403
    if current_user.active_workspace_id != channel.workspace_id or current_user.id not in [workspace_user.user_id for workspace_user in channel.active_users]:
        return {"errors": ["User must set the channel as active channel and the workspace as active workspace before deleting message"]}, 403
    db.session.delete(message)
    db.session.commit()
    socketio.emit('delete_message', {
        "senderId": current_user.id,
        "messageId": message.id,
        "channel": json.dumps(channel.to_dict(None), default=str),
    }, room=f"channel{message.channel_id}")
    return {
        'messageId': message.id,
        'channel': channel.to_dict(channel_user),
    }

@message_routes.route('/<int:id>/replies/new', methods=['POST'])
@login_required
def create_reply(id):
    """
    Reply to a message and return the reply's information
    """
    form = ReplyForm()
    form['csrf_token'].data = request.cookies['csrf_token']
    message = ChannelMessage.query.options(
        joinedload(ChannelMessage.channel)
        .joinedload(Channel.active_users)
    ).filter(ChannelMessage.id == id).first()
    if not message:
        return {'errors': ['Message not found']}, 404
    if current_user.active_workspace_id != message.channel.workspace_id or current_user.id not in [workspace_user.user_id for workspace_user in message.channel.active_users]:
        return {"errors": ["User must set the channel as active channel and the workspace as active workspace before replying to message"]}, 403
    print(form.data)
    if form.validate_on_submit():
        reply = ChannelMessageReply(
            sender_id=current_user.id,
            message_id=message.id,
            content=form.data['content']
        )
        db.session.add(reply)
        db.session.commit()
        socketio.emit('send_reply', {
            "senderId": current_user.id,
            "reply": json.dumps(reply.to_dict(), default=str),
        }, room=f"channel{message.channel_id}")
        return {'reply': reply.to_dict()}
    return {'errors': validation_errors_to_error_messages(form.errors)}, 401
