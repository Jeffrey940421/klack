from app.models import db, User, environment, SCHEMA
from sqlalchemy.sql import text
from faker import Faker
from random import randint, choice

faker = Faker()

def fake_users(user_num):
  existing_name = set()
  users = []
  for i in range(0, user_num):
    name = faker.name()
    while name in existing_name:
      name = faker.name()
    existing_name.add(name)
    first_name = name.split(" ")[0].lower()
    last_name = name.split(" ")[1].lower()
    email = f"{first_name}.{last_name}@klack.com"
    password = f"password{i + 1}"
    users.append(User(
      email = email,
      password = password
    ))
  return users

users = fake_users(10)

# Adds a demo user, you can add other users here if you want
def seed_users():
    _ = [db.session.add(user) for user in users]
    db.session.commit()


# Uses a raw SQL query to TRUNCATE or DELETE the users table. SQLAlchemy doesn't
# have a built in function to do this. With postgres in production TRUNCATE
# removes all the data from the table, and RESET IDENTITY resets the auto
# incrementing primary key, CASCADE deletes any dependent entities.  With
# sqlite3 in development you need to instead use DELETE to remove all data and
# it will reset the primary keys for you as well.
def undo_users():
    if environment == "production":
        db.session.execute(f"TRUNCATE table {SCHEMA}.users RESTART IDENTITY CASCADE;")
    else:
        db.session.execute(text("DELETE FROM users"))

    db.session.commit()
