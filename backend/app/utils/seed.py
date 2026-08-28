from flask import current_app

from app.extensions import bcrypt, db
from app.models import User


def seed_admin():
    username = current_app.config["ADMIN_USERNAME"]
    password = current_app.config["ADMIN_PASSWORD"]
    user = User.query.filter_by(username=username, role="ADMIN").first()
    if user:
        return user

    user = User(
        username=username,
        password_hash=bcrypt.generate_password_hash(password).decode("utf-8"),
        role="ADMIN",
        is_active=True,
    )
    db.session.add(user)
    db.session.commit()
    return user
