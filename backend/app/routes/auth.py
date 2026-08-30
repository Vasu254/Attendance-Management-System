from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required
from sqlalchemy.exc import IntegrityError

from app.extensions import bcrypt, db
from app.models import Student, User
from app.utils.auth import get_current_user

auth_bp = Blueprint("auth", __name__)


def clean(value):
    return str(value or "").strip()


def auth_payload(user):
    payload = user.to_dict()
    if user.student:
        payload["student"] = user.student.to_dict()
    return payload


def login_for_role(role):
    data = request.get_json() or {}
    username = clean(data.get("username"))
    password = data.get("password") or ""
    user = User.query.filter_by(username=username, role=role).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid username or password"}), 401
    if not user.is_active:
        message = "Your account has been deactivated. Please contact the administrator."
        return jsonify({"message": message}), 403
    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return jsonify({"token": token, "user": auth_payload(user)})


@auth_bp.post("/admin/login")
def admin_login():
    return login_for_role("ADMIN")


@auth_bp.post("/student/login")
def student_login():
    return login_for_role("STUDENT")


@auth_bp.post("/student/register")
def student_register():
    data = request.get_json() or {}
    required = [
        "student_id",
        "full_name",
        "email",
        "mobile_number",
        "course",
        "batch",
        "section",
        "username",
        "password",
    ]
    missing = [field for field in required if not clean(data.get(field))]
    if missing:
        return jsonify({"message": f"Missing fields: {', '.join(missing)}"}), 400

    password = data.get("password") or ""
    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    email = clean(data.get("email")).lower()
    if "@" not in email:
        return jsonify({"message": "Enter a valid email address"}), 400

    user = User(
        username=clean(data.get("username")),
        password_hash=bcrypt.generate_password_hash(password).decode("utf-8"),
        role="STUDENT",
        is_active=True,
    )
    student = Student(
        user=user,
        student_id=clean(data.get("student_id")),
        full_name=clean(data.get("full_name")),
        email=email,
        mobile_number=clean(data.get("mobile_number")),
        course=clean(data.get("course")),
        batch=clean(data.get("batch")),
        section=clean(data.get("section")),
    )
    db.session.add(student)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Username, Student ID, or Email already exists"}), 409

    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return jsonify({"message": "Registration successful", "token": token, "user": auth_payload(user)}), 201


@auth_bp.get("/me")
@jwt_required()
def me():
    user = get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify(auth_payload(user))
