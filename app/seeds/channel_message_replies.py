from app.models import db, ChannelMessageReply, environment, SCHEMA
from sqlalchemy.sql import text
from .users import users

# For each user, reply to all the messages that is not sent by the user
def seed_channel_message_replies():
    for user in users:
        channels = user.channels
        for channel in channels:
            messages = channel.messages
            for message in messages:
                if message.sender_id != user.id:
                    reply = ChannelMessageReply(
                        sender = user,
                        message = message,
                        content = "Hello, my friend"
                    )
                    db.session.add(reply)
    db.session.commit()

# Uses a raw SQL query to TRUNCATE or DELETE the users table. SQLAlchemy doesn't
# have a built in function to do this. With postgres in production TRUNCATE
# removes all the data from the table, and RESET IDENTITY resets the auto
# incrementing primary key, CASCADE deletes any dependent entities.  With
# sqlite3 in development you need to instead use DELETE to remove all data and
# it will reset the primary keys for you as well.
def undo_channel_message_replies():
    if environment == "production":
        db.session.execute(
            f"TRUNCATE table {SCHEMA}.channel_message_replies RESTART IDENTITY CASCADE;")
    else:
        db.session.execute(text("DELETE FROM channel_message_replies"))

    db.session.commit()
