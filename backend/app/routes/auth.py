from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required

from app.extensions import bcrypt
from app.models import User
from app.utils.auth import get_current_user

auth_bp = Blueprint("auth", __name__)


def login_for_role(role):
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    user = User.query.filter_by(username=username, role=role).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid username or password"}), 401
    if not user.is_active:
        message = "Your account has been deactivated. Please contact the administrator."
        return jsonify({"message": message}), 403
    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    payload = user.to_dict()
    if user.student:
        payload["student"] = user.student.to_dict()
    return jsonify({"token": token, "user": payload})


@auth_bp.post("/admin/login")
def admin_login():
    return login_for_role("ADMIN")


@auth_bp.post("/student/login")
def student_login():
    return login_for_role("STUDENT")


@auth_bp.get("/me")
@jwt_required()
def me():
    user = get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404
    payload = user.to_dict()
    if user.student:
        payload["student"] = user.student.to_dict()
    return jsonify(payload)
