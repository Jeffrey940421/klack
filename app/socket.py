from flask_socketio import SocketIO, emit, join_room, leave_room
from engineio.payload import Payload
import os

if os.environ.get("FLASK_ENV") == "production":
    origins = []
else:
    origins = "*"


Payload.max_decode_packets = 50
socketio = SocketIO(cors_allowed_origins=origins)

@socketio.on('join_room')
def on_join(data):
    rooms = data['rooms']
    for room in rooms:
        join_room(room)
        print(f'----------------------------------------------------->user joined room ' + room)

@socketio.on('leave_room')
def on_leave(data):
    rooms = data['rooms']
    for room in rooms:
        leave_room(room)
        print('----------------------------------------------------->user left room ' + + room)
