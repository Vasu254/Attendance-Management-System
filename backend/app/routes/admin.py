import csv
from datetime import date, datetime
from io import StringIO

from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from app.extensions import bcrypt, db
from app.models import Attendance, AttendancePermission, Student, User
from app.utils.attendance import eligible_students_query, latest_permission_for, student_is_eligible
from app.utils.auth import role_required
from app.utils.location import parse_coordinate, validate_geofence

admin_bp = Blueprint("admin", __name__)


def parse_date(value, fallback=None):
    if not value:
        return fallback
    return datetime.strptime(value, "%Y-%m-%d").date()


def parse_time(value):
    return datetime.strptime(value, "%H:%M").time()


def apply_student_filters(query):
    search = (request.args.get("search") or "").strip()
    course = (request.args.get("course") or "").strip()
    batch = (request.args.get("batch") or "").strip()
    section = (request.args.get("section") or "").strip()
    if search:
        like = f"%{search}%"
        query = query.filter(or_(Student.full_name.ilike(like), Student.student_id.ilike(like)))
    if course:
        query = query.filter(Student.course == course)
    if batch:
        query = query.filter(Student.batch == batch)
    if section:
        query = query.filter(Student.section == section)
    return query


def attendance_summary(target_date, permission=None):
    eligible_query = eligible_students_query(permission)
    eligible_ids = [student.id for student in eligible_query.all()]
    total = len(eligible_ids)
    present = 0
    if eligible_ids:
        present = Attendance.query.filter(
            Attendance.attendance_date == target_date,
            Attendance.student_id.in_(eligible_ids),
        ).count()
    percentage = round((present / total) * 100, 2) if total else 0
    return total, present, max(total - present, 0), percentage


def student_progress(student, target_date=None):
    target_date = target_date or date.today()
    permissions = AttendancePermission.query.all()
    eligible_dates = {
        permission.attendance_date
        for permission in permissions
        if student_is_eligible(student, permission)
    }
    total_sessions = len(eligible_dates)
    present_days = 0
    if eligible_dates:
        present_days = Attendance.query.filter(
            Attendance.student_id == student.id,
            Attendance.attendance_date.in_(eligible_dates),
            Attendance.status == "PRESENT",
        ).count()
    today_attendance = Attendance.query.filter_by(student_id=student.id, attendance_date=target_date).first()
    last_attendance = (
        Attendance.query.filter_by(student_id=student.id)
        .order_by(Attendance.attendance_date.desc(), Attendance.marked_time.desc())
        .first()
    )
    percentage = round((present_days / total_sessions) * 100, 2) if total_sessions else 0
    return {
        "present_days": present_days,
        "total_sessions": total_sessions,
        "attendance_percentage": percentage,
        "below_75": percentage < 75 if total_sessions else False,
        "today_status": today_attendance.status if today_attendance else "NOT MARKED",
        "last_marked_date": last_attendance.attendance_date.isoformat() if last_attendance else None,
        "last_marked_time": last_attendance.marked_time.strftime("%H:%M") if last_attendance else None,
    }


@admin_bp.get("/students")
@role_required("ADMIN")
def list_students():
    students = apply_student_filters(Student.query.join(Student.user)).order_by(Student.created_at.desc()).all()
    return jsonify([{**student.to_dict(), "progress": student_progress(student)} for student in students])


@admin_bp.post("/students")
@role_required("ADMIN")
def create_student():
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
    missing = [field for field in required if not str(data.get(field, "")).strip()]
    if missing:
        return jsonify({"message": f"Missing fields: {', '.join(missing)}"}), 400

    user = User(
        username=data["username"].strip(),
        password_hash=bcrypt.generate_password_hash(data["password"]).decode("utf-8"),
        role="STUDENT",
        is_active=bool(data.get("is_active", True)),
    )
    student = Student(
        user=user,
        student_id=data["student_id"].strip(),
        full_name=data["full_name"].strip(),
        email=data["email"].strip(),
        mobile_number=data["mobile_number"].strip(),
        course=data["course"].strip(),
        batch=data["batch"].strip(),
        section=data["section"].strip(),
    )
    db.session.add(student)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Username, Student ID, or Email already exists"}), 409
    return jsonify(student.to_dict()), 201


@admin_bp.get("/students/<int:student_pk>")
@role_required("ADMIN")
def get_student(student_pk):
    student = Student.query.get_or_404(student_pk)
    return jsonify({**student.to_dict(), "progress": student_progress(student)})


@admin_bp.put("/students/<int:student_pk>")
@role_required("ADMIN")
def update_student(student_pk):
    student = Student.query.get_or_404(student_pk)
    data = request.get_json() or {}
    for field in ["student_id", "full_name", "email", "mobile_number", "course", "batch", "section"]:
        if field in data:
            setattr(student, field, str(data[field]).strip())
    if "username" in data:
        student.user.username = str(data["username"]).strip()
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Username, Student ID, or Email already exists"}), 409
    return jsonify(student.to_dict())


@admin_bp.delete("/students/<int:student_pk>")
@role_required("ADMIN")
def delete_student(student_pk):
    student = Student.query.get_or_404(student_pk)
    db.session.delete(student.user)
    db.session.commit()
    return jsonify({"message": "Student deleted"})


@admin_bp.put("/students/<int:student_pk>/status")
@role_required("ADMIN")
def update_student_status(student_pk):
    student = Student.query.get_or_404(student_pk)
    data = request.get_json() or {}
    student.user.is_active = bool(data.get("is_active", True))
    db.session.commit()
    return jsonify(student.to_dict())


@admin_bp.put("/students/<int:student_pk>/reset-password")
@role_required("ADMIN")
def reset_student_password(student_pk):
    student = Student.query.get_or_404(student_pk)
    data = request.get_json() or {}
    password = data.get("password") or ""
    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400
    student.user.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    db.session.commit()
    return jsonify({"message": "Password reset successfully"})


@admin_bp.post("/attendance-permissions")
@role_required("ADMIN")
def create_attendance_permission():
    data = request.get_json() or {}
    try:
        latitude = parse_coordinate(data.get("latitude"))
        longitude = parse_coordinate(data.get("longitude"))
        radius_meters = parse_coordinate(data.get("radius_meters"))
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid location coordinates"}), 400

    geofence_error = validate_geofence(latitude, longitude, radius_meters)
    if geofence_error:
        return jsonify({"message": geofence_error}), 400

    try:
        permission = AttendancePermission(
            attendance_date=parse_date(data.get("attendance_date")),
            start_time=parse_time(data.get("start_time")),
            end_time=parse_time(data.get("end_time")),
            status=data.get("status", "OPEN"),
            batch=(data.get("batch") or None),
            section=(data.get("section") or None),
            location_name=(data.get("location_name") or None),
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_meters,
            created_by=int(get_jwt_identity()),
        )
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid date or time"}), 400
    if permission.end_time <= permission.start_time:
        return jsonify({"message": "End time must be after start time"}), 400
    db.session.add(permission)
    db.session.commit()
    return jsonify(permission.to_dict()), 201


@admin_bp.get("/attendance-permissions/today")
@role_required("ADMIN")
def get_today_permission():
    target_date = parse_date(request.args.get("date"), date.today())
    permission = latest_permission_for(target_date)
    return jsonify(permission.to_dict() if permission else None)


@admin_bp.put("/attendance-permissions/<int:permission_id>/open")
@role_required("ADMIN")
def open_permission(permission_id):
    permission = AttendancePermission.query.get_or_404(permission_id)
    permission.status = "OPEN"
    db.session.commit()
    return jsonify(permission.to_dict())


@admin_bp.put("/attendance-permissions/<int:permission_id>/close")
@role_required("ADMIN")
def close_permission(permission_id):
    permission = AttendancePermission.query.get_or_404(permission_id)
    permission.status = "CLOSED"
    db.session.commit()
    return jsonify(permission.to_dict())


@admin_bp.get("/dashboard")
@role_required("ADMIN")
def dashboard():
    today = date.today()
    permission = latest_permission_for(today)
    total_students = Student.query.count()
    active_students = Student.query.join(Student.user).filter(User.is_active.is_(True), User.role == "STUDENT").count()
    inactive_students = total_students - active_students
    eligible_total, present, not_marked, percentage = attendance_summary(today, permission)
    return jsonify(
        {
            "total_students": total_students,
            "active_students": active_students,
            "inactive_students": inactive_students,
            "eligible_students": eligible_total,
            "present_today": present,
            "not_marked_today": not_marked,
            "attendance_percentage": percentage,
            "attendance_status": permission.status if permission else "CLOSED",
            "permission": permission.to_dict() if permission else None,
        }
    )


@admin_bp.get("/attendance/monitoring")
@role_required("ADMIN")
def attendance_monitoring():
    target_date = parse_date(request.args.get("date"), date.today())
    permission = latest_permission_for(target_date)
    query = apply_student_filters(eligible_students_query(permission))
    students = query.order_by(Student.full_name.asc()).all()
    attendance_rows = Attendance.query.filter_by(attendance_date=target_date).all()
    attendance_by_student = {row.student_id: row for row in attendance_rows}
    rows = []
    for student in students:
        attendance = attendance_by_student.get(student.id)
        rows.append(
            {
                **student.to_dict(),
                "marked_time": attendance.marked_time.strftime("%H:%M") if attendance else None,
                "status": attendance.status if attendance else "NOT MARKED",
            }
        )
    total = len(rows)
    present = sum(1 for row in rows if row["status"] == "PRESENT")
    return jsonify(
        {
            "date": target_date.isoformat(),
            "permission": permission.to_dict() if permission else None,
            "total_eligible_students": total,
            "students_present": present,
            "students_not_marked": max(total - present, 0),
            "attendance_percentage": round((present / total) * 100, 2) if total else 0,
            "students": rows,
        }
    )


def report_rows(start_date, end_date):
    query = apply_student_filters(Student.query.join(Student.user).filter(User.role == "STUDENT"))
    students = query.order_by(Student.full_name.asc()).all()
    permissions = AttendancePermission.query.filter(
        AttendancePermission.attendance_date >= start_date,
        AttendancePermission.attendance_date <= end_date,
    ).all()
    rows = []
    for student in students:
        eligible_dates = {
            permission.attendance_date
            for permission in permissions
            if student_is_eligible(student, permission)
        }
        total_sessions = len(eligible_dates)
        present_days = 0
        if eligible_dates:
            present_days = Attendance.query.filter(
                Attendance.student_id == student.id,
                Attendance.attendance_date.in_(eligible_dates),
            ).count()
        percentage = round((present_days / total_sessions) * 100, 2) if total_sessions else 0
        rows.append(
            {
                "student_id": student.student_id,
                "full_name": student.full_name,
                "batch": student.batch,
                "section": student.section,
                "present_days": present_days,
                "total_sessions": total_sessions,
                "percentage": percentage,
                "below_75": percentage < 75 if total_sessions else False,
            }
        )
    return rows


@admin_bp.get("/reports")
@role_required("ADMIN")
def reports():
    start_date = parse_date(request.args.get("start_date"), date.today())
    end_date = parse_date(request.args.get("end_date"), date.today())
    return jsonify({"start_date": start_date.isoformat(), "end_date": end_date.isoformat(), "rows": report_rows(start_date, end_date)})


@admin_bp.get("/reports/export")
@role_required("ADMIN")
def export_reports():
    start_date = parse_date(request.args.get("start_date"), date.today())
    end_date = parse_date(request.args.get("end_date"), date.today())
    output = StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["student_id", "full_name", "batch", "section", "present_days", "total_sessions", "percentage", "below_75"],
    )
    writer.writeheader()
    writer.writerows(report_rows(start_date, end_date))
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance_report.csv"},
    )
