from flask_socketio import SocketIO, emit, join_room
import os

if os.environ.get("FLASK_ENV") == "production":
    origins = []
else:
    origins = "*"

socketio = SocketIO(cors_allowed_origins=origins)

@socketio.on('join_room')
def on_join(data):
    room = data['room']
    join_room(room)
    print("joined room")
