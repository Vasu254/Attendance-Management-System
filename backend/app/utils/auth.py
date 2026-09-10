from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models import User


def get_current_user():
    identity = get_jwt_identity()
    if identity is None:
        return None
    return User.query.get(int(identity))


def role_required(role):
    allowed_roles = {role} if isinstance(role, str) else set(role)
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user or user.role not in allowed_roles:
                return jsonify({"message": "Access denied"}), 403
            if not user.is_active:
                return jsonify({"message": "Account is inactive"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
