from app.models import db, Workspace, environment, SCHEMA
from sqlalchemy.sql import text


# Adds a demo user, you can add other users here if you want
def seed_workspaces():
    google = Workspace(
        name="Google",
        icon_url="/images/workspace_icons/workspace_icon_1.webp",
        owner_id=1
    )
    apple = Workspace(
        name="Apple",
        icon_url="/images/workspace_icons/workspace_icon_2.webp",
        owner_id=2
    )

    db.session.add(google)
    db.session.add(apple)
    db.session.commit()


# Uses a raw SQL query to TRUNCATE or DELETE the users table. SQLAlchemy doesn't
# have a built in function to do this. With postgres in production TRUNCATE
# removes all the data from the table, and RESET IDENTITY resets the auto
# incrementing primary key, CASCADE deletes any dependent entities.  With
# sqlite3 in development you need to instead use DELETE to remove all data and
# it will reset the primary keys for you as well.
def undo_workspaces():
    if environment == "production":
        db.session.execute(
            f"TRUNCATE table {SCHEMA}.workspaces RESTART IDENTITY CASCADE;")
    else:
        db.session.execute(text("DELETE FROM workspaces"))

    db.session.commit()
