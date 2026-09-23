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
    """Students log in with their email address and password."""
    data = request.get_json() or {}
    email = clean(data.get("email") or data.get("username") or "").lower()
    password = data.get("password") or ""
    if not email:
        return jsonify({"message": "Email and password are required"}), 400
    # Look up student by email, then authenticate via the linked User account.
    student = Student.query.filter_by(email=email).first()
    user = student.user if student else None
    if not user or user.role != "STUDENT" or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid email or password"}), 401
    if not user.is_active:
        return jsonify({"message": "Your account has been deactivated. Please contact the administrator."}), 403
    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return jsonify({"token": token, "user": auth_payload(user)})


@auth_bp.post("/mentor/login")
def mentor_login():
    return login_for_role("MENTOR")


@auth_bp.post("/student/register")
def student_register():
    """Register a new student. Full Name, Email, Enrollment Number, Batch, Password are required."""
    data = request.get_json() or {}
    required = ["full_name", "student_id", "email", "batch", "password"]
    missing = [field for field in required if not clean(data.get(field))]
    if missing:
        return jsonify({"message": f"Missing fields: {', '.join(missing)}"}), 400

    password = data.get("password") or ""
    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    email = clean(data.get("email")).lower()
    if "@" not in email:
        return jsonify({"message": "Enter a valid email address"}), 400

    full_name = clean(data.get("full_name"))
    enrollment = clean(data.get("student_id"))

    # Username is set to the email so that the email-based login lookup works
    # for both new and existing students. Enrollment number is preserved in
    # student_id for attendance records and admin views.
    user = User(
        username=email,
        password_hash=bcrypt.generate_password_hash(password).decode("utf-8"),
        role="STUDENT",
        is_active=True,
    )
    student = Student(
        user=user,
        student_id=enrollment,
        full_name=full_name or enrollment,
        email=email,
        mobile_number="",
        course="N/A",
        batch=clean(data.get("batch")),
        section="N/A",
    )
    db.session.add(student)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Enrollment Number or Email already exists"}), 409

    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return jsonify({"message": "Registration successful", "token": token, "user": auth_payload(user)}), 201


@auth_bp.post("/student/forgot-password")
def student_forgot_password():
    """Reset password using email only. No enrollment ID required."""
    data = request.get_json() or {}
    email = clean(data.get("email")).lower()
    new_password = data.get("new_password") or ""
    confirm_password = data.get("confirm_password") or ""

    if not email:
        return jsonify({"message": "Email is required"}), 400
    if len(new_password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400
    if new_password != confirm_password:
        return jsonify({"message": "Passwords do not match"}), 400

    student = Student.query.filter_by(email=email).first()
    if not student or not student.user:
        return jsonify({"message": "No account found with this email address"}), 404

    student.user.password_hash = bcrypt.generate_password_hash(new_password).decode("utf-8")
    db.session.commit()
    return jsonify({"message": "Password has been reset successfully. You can now login with your email and new password."})


@auth_bp.get("/me")
@jwt_required()
def me():
    user = get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify(auth_payload(user))
