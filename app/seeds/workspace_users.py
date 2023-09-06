from app.models import db, WorkspaceUser, Workspace, environment, SCHEMA
from sqlalchemy.sql import text


# Adds a demo user, you can add other users here if you want
def seed_workspace_users():
    relationship1 = WorkspaceUser(
        workspace_id=1,
        user_id=1,
        nickname="Demo",
        profile_image_url="/images/profile_images/profile_image_1.png",
        role="admin"
    )
    relationship2 = WorkspaceUser(
        workspace_id=2,
        user_id=2,
        nickname="Marnie",
        profile_image_url="/images/profile_images/profile_image_2.png",
        role="admin"
    )
    relationship3 = WorkspaceUser(
        workspace_id=1,
        user_id=3,
        nickname="Bobbie",
        profile_image_url="/images/profile_images/profile_image_3.png",
        role="guest"
    )

    db.session.add(relationship1)
    db.session.add(relationship2)
    db.session.add(relationship3)

    db.session.commit()


# Uses a raw SQL query to TRUNCATE or DELETE the users table. SQLAlchemy doesn't
# have a built in function to do this. With postgres in production TRUNCATE
# removes all the data from the table, and RESET IDENTITY resets the auto
# incrementing primary key, CASCADE deletes any dependent entities.  With
# sqlite3 in development you need to instead use DELETE to remove all data and
# it will reset the primary keys for you as well.
def undo_workspace_users():
    if environment == "production":
        db.session.execute(f"TRUNCATE table {SCHEMA}.workspace_users RESTART IDENTITY CASCADE;")
    else:
        db.session.execute(text("DELETE FROM workspace_users"))

    db.session.commit()
