from flask.cli import AppGroup
from .users import seed_users, undo_users
from .workspaces import seed_workspaces, undo_workspaces
from .workspace_users import seed_workspace_users, undo_workspace_users
from .channels import seed_channels, undo_channels
from app.models import db, Workspace, environment, SCHEMA

from app.models.db import db, environment, SCHEMA

# Creates a seed group to hold our commands
# So we can type `flask seed --help`
seed_commands = AppGroup('seed')


# Creates the `flask seed all` command
@seed_commands.command('all')
def seed():
    if environment == 'production':
        # Before seeding in production, you want to run the seed undo
        # command, which will  truncate all tables prefixed with
        # the schema name (see comment in users.py undo_users function).
        # Make sure to add all your other model's undo functions below
        undo_users()
        undo_workspaces()
        undo_workspace_users()
        undo_channels()
    seed_users()
    seed_workspaces()
    seed_workspace_users()
    seed_channels()

    # Add other seed functions here


# Creates the `flask seed undo` command
@seed_commands.command('undo')
def undo():
    undo_users()
    undo_workspaces()
    undo_workspace_users()
    undo_channels()
    # Add other undo functions here
