import csv
import json
from datetime import date, datetime, timezone, timedelta
from io import StringIO

from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from app.extensions import bcrypt, db
from app.models import ActivityLog, Attendance, AttendancePermission, AttendanceSession, Holiday, PermissionRequest, SessionAttendance, Student, StudentPermission, SystemSetting, User
from app.utils.attendance import eligible_students_query, latest_permission_for, student_is_eligible
from app.utils.attendance_calculations import applicable_sessions, session_status, split_summary, student_summary
from app.utils.auth import get_current_user, role_required
from app.utils.location import parse_coordinate, validate_geofence

admin_bp = Blueprint("admin", __name__)


def log_activity(actor_id, action, entity_type, entity_id=None, previous=None, new=None, reason=None):
    db.session.add(ActivityLog(
        actor_id=int(actor_id) if actor_id else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        previous_value=json.dumps(previous) if previous is not None else None,
        new_value=json.dumps(new) if new is not None else None,
        reason=reason,
    ))


def parse_date(value, fallback=None):
    if not value:
        return fallback
    return datetime.strptime(value, "%Y-%m-%d").date()


def parse_time(value):
    return datetime.strptime(value, "%H:%M").time()


def current_actor_id():
    return int(get_jwt_identity())


def allowed_session_types(value):
    value = str(value or "CLASS").upper()
    if value not in {"CLASS", "MENTORING"}:
        raise ValueError("Session type must be CLASS or MENTORING")
    return value


def can_manage_session(session):
    """Mentors are limited to sessions assigned to their own account."""
    user = get_current_user()
    return user and (user.role == "ADMIN" or (user.role == "MENTOR" and session.mentor_id == user.id))


@admin_bp.get("/sessions")
@role_required(("ADMIN", "MENTOR"))
def list_sessions():
    start_date = parse_date(request.args.get("start_date"))
    end_date = parse_date(request.args.get("end_date"))
    session_type = (request.args.get("session_type") or "").upper()
    query = AttendanceSession.query
    if get_current_user().role == "MENTOR":
        query = query.filter(AttendanceSession.mentor_id == current_actor_id())
    if start_date:
        query = query.filter(AttendanceSession.session_date >= start_date)
    if end_date:
        query = query.filter(AttendanceSession.session_date <= end_date)
    if session_type in {"CLASS", "MENTORING"}:
        query = query.filter_by(session_type=session_type)
    return jsonify([session.to_dict() for session in query.order_by(AttendanceSession.session_date.desc(), AttendanceSession.id.desc()).all()])


@admin_bp.post("/sessions")
@role_required(("ADMIN", "MENTOR"))
def create_session():
    data = request.get_json() or {}
    try:
        session = AttendanceSession(
            session_date=parse_date(data.get("session_date") or data.get("attendance_date")),
            start_time=parse_time(data.get("start_time")), end_time=parse_time(data.get("end_time")),
            session_type=allowed_session_types(data.get("session_type")), status="SCHEDULED",
            batch=(data.get("batch") or None), section=(data.get("section") or None),
            subject=(data.get("subject") or None), room=(data.get("room") or None),
            mentor_id=data.get("mentor_id") or current_actor_id(), created_by=current_actor_id(),
            location_name=(data.get("location_name") or None), latitude=parse_coordinate(data.get("latitude")),
            longitude=parse_coordinate(data.get("longitude")), radius_meters=parse_coordinate(data.get("radius_meters")),
        )
    except (TypeError, ValueError):
        return jsonify({"message": "Enter a valid date, time, session type, and location."}), 400
    if session.end_time <= session.start_time:
        return jsonify({"message": "End time must be after start time"}), 400
    error = validate_geofence(session.latitude, session.longitude, session.radius_meters)
    if error:
        return jsonify({"message": error}), 400
    db.session.add(session)
    db.session.flush()
    log_activity(current_actor_id(), "CREATED", "attendance_session", session.id, new=session.to_dict())
    db.session.commit()
    return jsonify(session.to_dict()), 201


@admin_bp.put("/sessions/<int:session_id>/activate")
@role_required(("ADMIN", "MENTOR"))
def activate_session(session_id):
    session = AttendanceSession.query.get_or_404(session_id)
    if not can_manage_session(session):
        return jsonify({"message": "You can only manage sessions assigned to you."}), 403
    if session.status in {"COMPLETED", "CANCELLED"}:
        return jsonify({"message": "Completed or cancelled sessions cannot be activated."}), 400
    previous = session.status
    session.status, session.activated_at = "ACTIVE", datetime.now(timezone.utc)
    log_activity(current_actor_id(), "ACTIVATED", "attendance_session", session.id, previous={"status": previous}, new={"status": "ACTIVE"})
    db.session.commit()
    return jsonify(session.to_dict())


@admin_bp.put("/sessions/<int:session_id>/close")
@role_required(("ADMIN", "MENTOR"))
def close_session(session_id):
    session = AttendanceSession.query.get_or_404(session_id)
    if not can_manage_session(session):
        return jsonify({"message": "You can only manage sessions assigned to you."}), 403
    previous = session.status
    session.status, session.closed_at = "COMPLETED", datetime.now(timezone.utc)
    log_activity(current_actor_id(), "CLOSED", "attendance_session", session.id, previous={"status": previous}, new={"status": "COMPLETED"})
    db.session.commit()
    return jsonify(session.to_dict())


@admin_bp.put("/sessions/<int:session_id>/attendance/<int:student_pk>")
@role_required(("ADMIN", "MENTOR"))
def correct_session_attendance(session_id, student_pk):
    data = request.get_json() or {}
    status = str(data.get("status") or "").upper()
    if status not in {"PRESENT", "ABSENT", "PERMISSION", "EXCUSED"} or not str(data.get("reason") or "").strip():
        return jsonify({"message": "A valid status and correction reason are required."}), 400
    session = AttendanceSession.query.get_or_404(session_id)
    if not can_manage_session(session):
        return jsonify({"message": "You can only manage sessions assigned to you."}), 403
    student = Student.query.get_or_404(student_pk)
    if not student_is_eligible(student, session):
        return jsonify({"message": "This student is not eligible for the selected session."}), 400
    record = SessionAttendance.query.filter_by(session_id=session.id, student_id=student.id).first()
    old_status = record.status if record else "NOT_MARKED"
    if not record:
        record = SessionAttendance(session_id=session.id, student_id=student.id, marked_by=current_actor_id())
        db.session.add(record)
    record.status, record.correction_reason, record.marked_by = status, str(data["reason"]).strip(), current_actor_id()
    if status == "PRESENT" and not record.marked_time:
        record.marked_time = datetime.now().time()
    db.session.flush()
    log_activity(current_actor_id(), "ATTENDANCE_CORRECTED", "session_attendance", record.id, previous={"status": old_status}, new={"status": status}, reason=record.correction_reason)
    db.session.commit()
    return jsonify(record.to_dict())


@admin_bp.get("/sessions/<int:session_id>/monitoring")
@role_required(("ADMIN", "MENTOR"))
def session_monitoring(session_id):
    session = AttendanceSession.query.get_or_404(session_id)
    if not can_manage_session(session):
        return jsonify({"message": "You can only view sessions assigned to you."}), 403
    students = eligible_students_query(session).order_by(Student.created_at.asc(), Student.id.asc()).all()
    records = {row.student_id: row for row in SessionAttendance.query.filter_by(session_id=session.id).all()}
    rows = [{**student.to_dict(), "status": records[student.id].status if student.id in records else "NOT_MARKED", "marked_time": records[student.id].marked_time.strftime("%H:%M") if student.id in records and records[student.id].marked_time else None} for student in students]
    present = sum(row["status"] == "PRESENT" for row in rows)
    return jsonify({"session": session.to_dict(), "students": rows, "present": present, "not_marked": len(rows) - present})


@admin_bp.post("/holidays")
@role_required(("ADMIN", "MENTOR"))
def create_holiday():
    data = request.get_json() or {}
    try:
        start_date = parse_date(data.get("start_date"))
        end_date = parse_date(data.get("end_date") or data.get("start_date"))
        name = str(data.get("name") or "").strip()
        session_type = (data.get("session_type") or None)
        holiday = Holiday(
            # Populate both schemas for forward and backward compatibility.
            holiday_date=start_date if start_date == end_date else None,
            tracker_type=session_type,
            title=name,
            details=(data.get("reason") or None),
            start_date=start_date,
            end_date=end_date,
            name=name,
            reason=(data.get("reason") or None),
            session_type=session_type,
            batch=(data.get("batch") or None),
            created_by=current_actor_id(),
        )
    except ValueError:
        return jsonify({"message": "Enter valid holiday dates."}), 400
    if not holiday.name or holiday.end_date < holiday.start_date or holiday.session_type not in {None, "CLASS", "MENTORING"}:
        return jsonify({"message": "Enter a holiday name, valid date range, and session type."}), 400
    db.session.add(holiday); db.session.flush(); log_activity(current_actor_id(), "CREATED", "holiday", holiday.id, new=holiday.to_dict()); db.session.commit()
    return jsonify(holiday.to_dict()), 201


@admin_bp.get("/holidays")
@role_required(("ADMIN", "MENTOR"))
def list_holidays():
    return jsonify([holiday.to_dict() for holiday in Holiday.query.order_by(Holiday.start_date.desc()).all()])


@admin_bp.get("/permission-requests")
@role_required(("ADMIN", "MENTOR"))
def list_permission_requests():
    status = (request.args.get("status") or "").upper()
    query = PermissionRequest.query
    if status:
        query = query.filter_by(status=status)
    modern = [item.to_dict() for item in query.order_by(PermissionRequest.created_at.desc()).all()]
    legacy_query = StudentPermission.query
    if status:
        legacy_query = legacy_query.filter_by(status=status)
    legacy = [item.to_dict() for item in legacy_query.order_by(StudentPermission.permission_date.desc(), StudentPermission.id.desc()).all()]
    return jsonify(sorted([*modern, *legacy], key=lambda item: item.get("created_at") or f"{item['date']}T00:00:00", reverse=True))


@admin_bp.put("/permission-requests/<int:request_id>")
@role_required(("ADMIN", "MENTOR"))
def resolve_permission_request(request_id):
    item = PermissionRequest.query.get_or_404(request_id)
    data = request.get_json() or {}
    status = str(data.get("status") or "").upper()
    if status not in {"APPROVED", "REJECTED", "CANCELLED"}:
        return jsonify({"message": "Invalid permission status."}), 400
    previous = item.status; item.status, item.remarks, item.approved_by, item.approved_at = status, data.get("remarks") or item.remarks, current_actor_id(), datetime.now(timezone.utc)
    log_activity(current_actor_id(), "PERMISSION_RESOLVED", "permission_request", item.id, previous={"status": previous}, new={"status": status})
    db.session.commit()
    return jsonify(item.to_dict())


@admin_bp.get("/settings/attendance-policy")
@role_required("ADMIN")
def get_attendance_policy():
    setting = SystemSetting.query.get("permission_policy")
    return jsonify({"permission_policy": setting.value if setting else "EXCLUDE"})


@admin_bp.put("/settings/attendance-policy")
@role_required("ADMIN")
def update_attendance_policy():
    policy = str((request.get_json() or {}).get("permission_policy") or "").upper()
    if policy not in {"EXCLUDE", "EXCUSED"}:
        return jsonify({"message": "Policy must be EXCLUDE or EXCUSED."}), 400
    setting = SystemSetting.query.get("permission_policy") or SystemSetting(key="permission_policy", value=policy)
    setting.value = policy; db.session.add(setting); log_activity(current_actor_id(), "SETTINGS_CHANGED", "attendance_policy", reason=policy); db.session.commit()
    return jsonify({"permission_policy": policy})


@admin_bp.get("/activity")
@role_required(("ADMIN", "MENTOR"))
def activity_feed():
    return jsonify([entry.to_dict() for entry in ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(100).all()])


@admin_bp.get("/backup")
@role_required("ADMIN")
def export_backup():
    # Export is read-only: it does not mutate or remove database data.
    payload = {"students": [student.to_dict() for student in Student.query.order_by(Student.created_at.asc(), Student.id.asc()).all()], "attendance": [row.to_dict() for row in Attendance.query.all()], "session_attendance": [row.to_dict() for row in SessionAttendance.query.all()], "sessions": [row.to_dict() for row in AttendanceSession.query.all()], "holidays": [row.to_dict() for row in Holiday.query.all()], "permissions": [row.to_dict() for row in PermissionRequest.query.all()]}
    return Response(json.dumps(payload, indent=2), mimetype="application/json", headers={"Content-Disposition": "attachment; filename=attendance_backup.json"})


def apply_student_filters(query):
    search = (request.args.get("search") or "").strip()
    course = (request.args.get("course") or "").strip()
    batch = (request.args.get("batch") or "").strip()
    section = (request.args.get("section") or "").strip()
    if search:
        # Keep partial-name search (for example a surname) while the paginated,
        # lightweight response prevents attendance calculations from blocking it.
        like = f"%{search}%"
        query = query.filter(or_(Student.full_name.ilike(like), Student.student_id.ilike(like), Student.email.ilike(like)))
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
        attendance_query = Attendance.query.filter(
            Attendance.attendance_date == target_date,
            Attendance.student_id.in_(eligible_ids),
        )
        if permission:
            tracker_type = permission.tracker_type or "CLASS"
            attendance_query = attendance_query.filter((Attendance.tracker_type == tracker_type) | Attendance.tracker_type.is_(None))
        present = attendance_query.count()
    percentage = round((present / total) * 100, 2) if total else 0
    return total, present, max(total - present, 0), percentage


def student_progress(student, target_date=None):
    # Centralised calculator keeps every dashboard and report consistent.
    summary = split_summary(student)
    active = [s for s in AttendanceSession.query.filter_by(status="ACTIVE").all() if student_is_eligible(student, s)]
    today_status = "NOT_MARKED"
    if active:
        from app.utils.attendance_calculations import session_status
        today_status = session_status(student, active[0])
    class_data = summary["class"]
    return {
        "present_days": class_data["present"], "total_sessions": summary["overall_sessions"],
        "attendance_percentage": summary["overall_percentage"], "class_percentage": class_data["attendance_percentage"],
        "mentoring_percentage": summary["mentoring"]["attendance_percentage"],
        "below_75": summary["overall_percentage"] < 75 if summary["overall_sessions"] else False,
        "today_status": today_status,
        "last_marked_date": None, "last_marked_time": None,
    }


@admin_bp.get("/students")
@role_required("ADMIN")
def list_students():
    try:
        page = max(int(request.args.get("page", 1)), 1)
        per_page = min(max(int(request.args.get("per_page", 25)), 1), 100)
    except ValueError:
        return jsonify({"message": "Page and per_page must be numbers."}), 400
    include_progress = str(request.args.get("include_progress", "false")).lower() in {"1", "true", "yes"}
    query = apply_student_filters(Student.query.join(Student.user)).order_by(Student.created_at.asc(), Student.id.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    students = pagination.items
    records = [{**student.to_dict(), **({"progress": student_progress(student)} if include_progress else {})} for student in students]
    return jsonify({"students": records, "page": page, "pages": pagination.pages, "per_page": per_page, "total": pagination.total, "progress_included": include_progress})


@admin_bp.get("/students/filters")
@role_required("ADMIN")
def student_filter_values():
    batches = [row[0] for row in db.session.query(Student.batch).filter(Student.batch.isnot(None), Student.batch != "").distinct().order_by(Student.batch).all()]
    sections = [row[0] for row in db.session.query(Student.section).filter(Student.section.isnot(None), Student.section != "").distinct().order_by(Student.section).all()]
    return jsonify({"batches": batches, "sections": sections})


@admin_bp.post("/students")
@role_required("ADMIN")
def create_student():
    data = request.get_json() or {}
    required = ["student_id", "email", "batch", "username", "password"]
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
        full_name=str(data.get("full_name") or data["student_id"]).strip(),
        email=data["email"].strip(),
        mobile_number=str(data.get("mobile_number") or "").strip(),
        course=str(data.get("course") or "N/A").strip(),
        batch=data["batch"].strip(),
        section=str(data.get("section") or "N/A").strip(),
    )
    db.session.add(student)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Username, Student ID, or Email already exists"}), 409
    return jsonify(student.to_dict()), 201


@admin_bp.get("/mentors")
@role_required("ADMIN")
def list_mentors():
    return jsonify([mentor.to_dict() for mentor in User.query.filter_by(role="MENTOR").order_by(User.created_at.asc(), User.id.asc()).all()])


@admin_bp.post("/mentors")
@role_required("ADMIN")
def create_mentor():
    data = request.get_json() or {}
    username = str(data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or len(password) < 6:
        return jsonify({"message": "Mentor username and a password of at least 6 characters are required."}), 400
    mentor = User(username=username, password_hash=bcrypt.generate_password_hash(password).decode("utf-8"), role="MENTOR", is_active=True)
    db.session.add(mentor)
    try:
        db.session.flush()
        log_activity(current_actor_id(), "CREATED", "mentor", mentor.id, new={"username": mentor.username})
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "That username is already in use."}), 409
    return jsonify(mentor.to_dict()), 201


@admin_bp.put("/mentors/<int:mentor_id>/status")
@role_required("ADMIN")
def update_mentor_status(mentor_id):
    mentor = User.query.filter_by(id=mentor_id, role="MENTOR").first_or_404()
    mentor.is_active = bool((request.get_json() or {}).get("is_active", True))
    log_activity(current_actor_id(), "MENTOR_STATUS_CHANGED", "mentor", mentor.id, new={"is_active": mentor.is_active})
    db.session.commit()
    return jsonify(mentor.to_dict())


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
    # Preserve student and attendance history: deletion is now an archive action.
    student.user.is_active = False
    log_activity(get_jwt_identity(), "ARCHIVED", "student", student.id, reason="Archive requested from student management")
    db.session.commit()
    return jsonify({"message": "Student archived. Existing attendance has been preserved."})


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
    active_sessions = AttendanceSession.query.filter_by(session_date=today, status="ACTIVE").all()
    if active_sessions:
        eligible_total = present = 0
        session_counts = {"CLASS": {"sessions": 0, "present": 0, "eligible": 0}, "MENTORING": {"sessions": 0, "present": 0, "eligible": 0}}
        for session in active_sessions:
            eligible_ids = [student.id for student in eligible_students_query(session).all()]
            session_present = SessionAttendance.query.filter(SessionAttendance.session_id == session.id, SessionAttendance.student_id.in_(eligible_ids), SessionAttendance.status == "PRESENT").count() if eligible_ids else 0
            eligible_total += len(eligible_ids)
            present += session_present
            session_counts[session.session_type]["sessions"] += 1
            session_counts[session.session_type]["eligible"] += len(eligible_ids)
            session_counts[session.session_type]["present"] += session_present
        not_marked = max(eligible_total - present, 0)
        percentage = round((present / eligible_total) * 100, 2) if eligible_total else 0
        attendance_status = "ACTIVE"
    else:
        eligible_total, present, not_marked, percentage = attendance_summary(today, permission)
        session_counts = {"CLASS": {"sessions": 0, "present": present, "eligible": eligible_total}, "MENTORING": {"sessions": 0, "present": 0, "eligible": 0}}
        attendance_status = permission.status if permission else "CLOSED"
    return jsonify(
        {
            "total_students": total_students,
            "active_students": active_students,
            "inactive_students": inactive_students,
            "eligible_students": eligible_total,
            "present_today": present,
            "not_marked_today": not_marked,
            "attendance_percentage": percentage,
            "attendance_status": attendance_status,
            "permission": permission.to_dict() if permission else None,
            "active_sessions": [session.to_dict() for session in active_sessions],
            "session_counts": session_counts,
            "pending_permissions": PermissionRequest.query.filter_by(status="PENDING").count(),
            "total_mentors": User.query.filter_by(role="MENTOR", is_active=True).count(),
        }
    )


@admin_bp.get("/mentor-dashboard")
@role_required("MENTOR")
def mentor_dashboard():
    mentor_id = current_actor_id()
    sessions = AttendanceSession.query.filter_by(mentor_id=mentor_id).order_by(AttendanceSession.session_date.desc(), AttendanceSession.start_time.desc()).limit(50).all()
    active = [session for session in sessions if session.status == "ACTIVE" and session.session_date == date.today()]
    students = Student.query.join(Student.user).filter(User.role == "STUDENT", User.is_active.is_(True)).all()
    assigned_batches = sorted({session.batch for session in sessions if session.batch})
    if assigned_batches:
        students = [student for student in students if student.batch in assigned_batches]
    low_attendance = [{**student.to_dict(), "progress": student_progress(student)} for student in students if student_progress(student)["below_75"]][:10]
    return jsonify({"assigned_batches": assigned_batches, "total_students": len(students), "active_sessions": [session.to_dict() for session in active], "recent_sessions": [session.to_dict() for session in sessions[:10]], "low_attendance_students": low_attendance})



@admin_bp.get("/attendance/monitoring")
@role_required("ADMIN")
def attendance_monitoring():
    target_date = parse_date(request.args.get("date"), date.today())
    session_type_filter = (request.args.get("session_type") or "").upper().strip()
    permission = latest_permission_for(target_date)
    query = apply_student_filters(Student.query.join(Student.user).filter(User.role == "STUDENT", User.is_active.is_(True)))
    students = query.order_by(Student.created_at.asc(), Student.id.asc()).all()

    attendance_rows = Attendance.query.filter_by(attendance_date=target_date).all()
    class_att_by_student = {r.student_id: r for r in attendance_rows if (r.tracker_type or "CLASS") == "CLASS"}
    mentoring_att_by_student = {r.student_id: r for r in attendance_rows if r.tracker_type == "MENTORING"}

    sessions = AttendanceSession.query.filter_by(session_date=target_date).all()
    class_sessions = [s for s in sessions if s.session_type == "CLASS"]
    mentoring_sessions = [s for s in sessions if s.session_type == "MENTORING"]

    class_s_att = {}
    if class_sessions:
        c_ids = [s.id for s in class_sessions]
        for r in SessionAttendance.query.filter(SessionAttendance.session_id.in_(c_ids)).all():
            class_s_att[r.student_id] = r

    mentoring_s_att = {}
    if mentoring_sessions:
        m_ids = [s.id for s in mentoring_sessions]
        for r in SessionAttendance.query.filter(SessionAttendance.session_id.in_(m_ids)).all():
            mentoring_s_att[r.student_id] = r

    rows = []
    for student in students:
        c_daily = class_att_by_student.get(student.id)
        c_sess = class_s_att.get(student.id)
        m_daily = mentoring_att_by_student.get(student.id)
        m_sess = mentoring_s_att.get(student.id)

        c_status = c_daily.status if c_daily else (c_sess.status if c_sess else "NOT MARKED")
        c_time = (c_daily.marked_time.strftime("%H:%M") if c_daily and c_daily.marked_time else None) or (c_sess.marked_time.strftime("%H:%M") if c_sess and c_sess.marked_time else None)

        m_status = m_daily.status if m_daily else (m_sess.status if m_sess else "NOT MARKED")
        m_time = (m_daily.marked_time.strftime("%H:%M") if m_daily and m_daily.marked_time else None) or (m_sess.marked_time.strftime("%H:%M") if m_sess and m_sess.marked_time else None)

        if session_type_filter == "CLASS":
            primary_status = c_status
            marked_time = c_time
        elif session_type_filter == "MENTORING":
            primary_status = m_status
            marked_time = m_time
        else:
            if c_status == "PRESENT" or m_status == "PRESENT":
                primary_status = "PRESENT"
            elif c_status == "PERMISSION" or m_status == "PERMISSION":
                primary_status = "PERMISSION"
            elif c_status == "ABSENT" and m_status == "ABSENT":
                primary_status = "ABSENT"
            elif c_status != "NOT MARKED" or m_status != "NOT MARKED":
                primary_status = c_status if c_status != "NOT MARKED" else m_status
            else:
                primary_status = "NOT MARKED"
            marked_time = c_time or m_time

        rows.append(
            {
                **student.to_dict(),
                "marked_time": marked_time,
                "status": primary_status,
                "class_status": c_status,
                "class_marked_time": c_time,
                "mentoring_status": m_status,
                "mentoring_marked_time": m_time,
            }
        )

    total = len(rows)

    def calc_summary(status_key):
        pres = sum(1 for r in rows if r[status_key] == "PRESENT")
        absn = sum(1 for r in rows if r[status_key] == "ABSENT")
        perm = sum(1 for r in rows if r[status_key] == "PERMISSION")
        nm = sum(1 for r in rows if r[status_key] in {"NOT MARKED", "NOT_MARKED"})
        pct = round((pres / total) * 100, 2) if total else 0
        return {"present": pres, "absent": absn, "permission": perm, "not_marked": nm, "percentage": pct}

    class_summary = calc_summary("class_status")
    mentoring_summary = calc_summary("mentoring_status")
    overall_summary = calc_summary("status")

    return jsonify(
        {
            "date": target_date.isoformat(),
            "session_type": session_type_filter or "ALL",
            "permission": permission.to_dict() if permission else None,
            "total_eligible_students": total,
            "students_present": overall_summary["present"],
            "students_absent": overall_summary["absent"],
            "students_permission": overall_summary["permission"],
            "students_not_marked": overall_summary["not_marked"],
            "attendance_percentage": overall_summary["percentage"],
            "class_summary": class_summary,
            "mentoring_summary": mentoring_summary,
            "students": rows,
        }
    )


@admin_bp.post("/attendance/manual-mark")
@role_required("ADMIN")
def manual_mark_attendance():
    data = request.get_json() or {}
    student_id = data.get("student_id")
    target_date = parse_date(data.get("date"), date.today())
    status = str(data.get("status") or "").upper().strip()
    target_type = str(data.get("session_type") or data.get("target_type") or "CLASS").upper().strip()

    if not student_id:
        return jsonify({"message": "Student ID is required."}), 400
    if status not in {"PRESENT", "ABSENT", "PERMISSION", "NOT MARKED", "NOT_MARKED"}:
        return jsonify({"message": "Status must be PRESENT, ABSENT, PERMISSION, or NOT MARKED."}), 400

    student = Student.query.get(student_id)
    if not student:
        return jsonify({"message": "Student not found."}), 404

    now_time = datetime.now().time()
    types_to_mark = ["CLASS", "MENTORING"] if target_type in {"BOTH", "ALL", ""} else [target_type]
    sessions = AttendanceSession.query.filter_by(session_date=target_date).all()

    for t_type in types_to_mark:
        attendance = Attendance.query.filter(
            Attendance.student_id == student.id,
            Attendance.attendance_date == target_date,
            Attendance.tracker_type == t_type,
        ).first()

        applicable_sessions = [s for s in sessions if s.session_type == t_type and student_is_eligible(student, s)]

        if status in {"NOT MARKED", "NOT_MARKED"}:
            if attendance:
                db.session.delete(attendance)
            for s in applicable_sessions:
                s_rec = SessionAttendance.query.filter_by(session_id=s.id, student_id=student.id).first()
                if s_rec:
                    db.session.delete(s_rec)
        else:
            if not attendance:
                attendance = Attendance(
                    student_id=student.id,
                    attendance_date=target_date,
                    marked_time=now_time,
                    status=status,
                    tracker_type=t_type,
                )
                db.session.add(attendance)
            else:
                attendance.status = status
                if status in {"PRESENT", "PERMISSION"} and not attendance.marked_time:
                    attendance.marked_time = now_time

            for s in applicable_sessions:
                s_rec = SessionAttendance.query.filter_by(session_id=s.id, student_id=student.id).first()
                if not s_rec:
                    s_rec = SessionAttendance(
                        session_id=s.id,
                        student_id=student.id,
                        status=status,
                        marked_time=now_time if status in {"PRESENT", "PERMISSION"} else None,
                        marked_by=current_actor_id(),
                    )
                    db.session.add(s_rec)
                else:
                    s_rec.status = status
                    s_rec.marked_by = current_actor_id()
                    if status in {"PRESENT", "PERMISSION"} and not s_rec.marked_time:
                        s_rec.marked_time = now_time

    db.session.flush()
    label_type = "Class & Mentoring" if len(types_to_mark) > 1 else types_to_mark[0].title()
    log_activity(
        current_actor_id(),
        "ATTENDANCE_MANUALLY_MARKED",
        "attendance",
        student.id,
        new={"status": status, "session_type": target_type},
        reason=f"Manually marked {label_type} as {status} for {student.full_name} on {target_date}",
    )
    db.session.commit()

    return jsonify({
        "message": f"{label_type} attendance marked as {status} for {student.full_name}.",
        "status": status,
    })


@admin_bp.post("/attendance/bulk-manual-mark")
@role_required("ADMIN")
def bulk_manual_mark_attendance():
    data = request.get_json() or {}
    student_ids = data.get("student_ids") or []
    target_date = parse_date(data.get("date"), date.today())
    status = str(data.get("status") or "").upper().strip()
    target_type = str(data.get("session_type") or data.get("target_type") or "CLASS").upper().strip()

    if not student_ids:
        return jsonify({"message": "At least one student ID is required."}), 400
    if status not in {"PRESENT", "ABSENT", "PERMISSION", "NOT MARKED", "NOT_MARKED"}:
        return jsonify({"message": "Status must be PRESENT, ABSENT, PERMISSION, or NOT MARKED."}), 400

    students = Student.query.filter(Student.id.in_(student_ids)).all()
    if not students:
        return jsonify({"message": "No matching students found."}), 404

    types_to_mark = ["CLASS", "MENTORING"] if target_type in {"BOTH", "ALL", ""} else [target_type]
    sessions = AttendanceSession.query.filter_by(session_date=target_date).all()
    now_time = datetime.now().time()

    updated_count = 0
    for student in students:
        for t_type in types_to_mark:
            attendance = Attendance.query.filter(
                Attendance.student_id == student.id,
                Attendance.attendance_date == target_date,
                Attendance.tracker_type == t_type,
            ).first()

            applicable_sessions = [s for s in sessions if s.session_type == t_type and student_is_eligible(student, s)]

            if status in {"NOT MARKED", "NOT_MARKED"}:
                if attendance:
                    db.session.delete(attendance)
                for s in applicable_sessions:
                    s_rec = SessionAttendance.query.filter_by(session_id=s.id, student_id=student.id).first()
                    if s_rec:
                        db.session.delete(s_rec)
            else:
                if not attendance:
                    attendance = Attendance(
                        student_id=student.id,
                        attendance_date=target_date,
                        marked_time=now_time,
                        status=status,
                        tracker_type=t_type,
                    )
                    db.session.add(attendance)
                else:
                    attendance.status = status
                    if status in {"PRESENT", "PERMISSION"} and not attendance.marked_time:
                        attendance.marked_time = now_time

                for s in applicable_sessions:
                    s_rec = SessionAttendance.query.filter_by(session_id=s.id, student_id=student.id).first()
                    if not s_rec:
                        s_rec = SessionAttendance(
                            session_id=s.id,
                            student_id=student.id,
                            status=status,
                            marked_time=now_time if status in {"PRESENT", "PERMISSION"} else None,
                            marked_by=current_actor_id(),
                        )
                        db.session.add(s_rec)
                    else:
                        s_rec.status = status
                        s_rec.marked_by = current_actor_id()
                        if status in {"PRESENT", "PERMISSION"} and not s_rec.marked_time:
                            s_rec.marked_time = now_time
        updated_count += 1

    label_type = "Class & Mentoring" if len(types_to_mark) > 1 else types_to_mark[0].title()
    log_activity(
        current_actor_id(),
        "BULK_ATTENDANCE_MANUALLY_MARKED",
        "attendance",
        reason=f"Bulk marked {updated_count} students ({label_type}) as {status} on {target_date}",
    )
    db.session.commit()

    return jsonify({
        "message": f"Successfully updated {label_type} attendance for {updated_count} student(s) to {status}.",
        "updated_count": updated_count,
    })


def date_range(start_date, end_date):
    days = (end_date - start_date).days
    return [start_date + timedelta(days=offset) for offset in range(days + 1)]

def report_data(start_date, end_date, session_type="CLASS"):
    """Sheet-safe report using the same service as every attendance percentage."""
    if end_date < start_date:
        raise ValueError("End date must be after start date")
    if session_type not in {"CLASS", "MENTORING", "ALL"}:
        raise ValueError("Session type must be CLASS, MENTORING, or ALL")

    selected_type = None if session_type == "ALL" else session_type
    dates = date_range(start_date, end_date)
    query = apply_student_filters(Student.query.join(Student.user).filter(User.role == "STUDENT"))
    # Preserve the existing enrollment order: never alphabetize report rows.
    students = query.order_by(Student.created_at.asc(), Student.id.asc()).all()
    rows = []

    for student in students:
        summary = student_summary(student, selected_type, start_date, end_date)
        records_by_date = {target_date: [] for target_date in dates}
        for session in applicable_sessions(student, selected_type, start_date, end_date):
            session_date = session.session_date if isinstance(session, AttendanceSession) else session.attendance_date
            status = session_status(student, session)
            if isinstance(session, AttendanceSession):
                attendance = SessionAttendance.query.filter_by(session_id=session.id, student_id=student.id).first()
            else:
                tracker_type = session.tracker_type or "CLASS"
                attendance = Attendance.query.filter(
                    Attendance.student_id == student.id,
                    Attendance.attendance_date == session.attendance_date,
                    ((Attendance.tracker_type == tracker_type) | Attendance.tracker_type.is_(None)),
                ).first()
            marked_time = attendance.marked_time.strftime("%H:%M") if attendance and attendance.marked_time else None
            records_by_date.setdefault(session_date, []).append((status, marked_time))

        daily_records = []
        for target_date in dates:
            day_records = records_by_date[target_date]
            status = " / ".join(item[0] for item in day_records) if day_records else "NO SESSION"
            marked_time = " / ".join(item[1] for item in day_records if item[1]) or None
            daily_records.append({"date": target_date.isoformat(), "status": status, "marked_time": marked_time})

        rows.append({
            "student_id": student.student_id,
            "full_name": student.full_name,
            "email": student.email,
            "batch": student.batch,
            "present_days": summary["present"],
            "absent_days": summary["absent"],
            "permission_days": summary["permission"],
            "holiday_days": summary["holiday"],
            "total_sessions": summary["total_sessions"],
            "percentage": summary["attendance_percentage"],
            "below_75": summary["below_75"],
            "daily_records": daily_records,
        })

    daily_summary = []
    for target_date in dates:
        records = [record for row in rows for record in row["daily_records"] if record["date"] == target_date.isoformat()]
        split_statuses = [status for record in records for status in record["status"].split(" / ")]
        present = split_statuses.count("PRESENT")
        absent = split_statuses.count("ABSENT")
        permission = split_statuses.count("PERMISSION")
        holiday = split_statuses.count("HOLIDAY")
        total = present + absent
        daily_summary.append({"date": target_date.isoformat(), "present": present, "absent": absent, "permission": permission, "holiday": holiday, "total_sessions": total, "percentage": round((present / total) * 100, 2) if total else 0})

    total_present = sum(row["present_days"] for row in rows)
    total_absent = sum(row["absent_days"] for row in rows)
    total_sessions = sum(row["total_sessions"] for row in rows)
    return {"session_type": session_type, "dates": [target_date.isoformat() for target_date in dates], "daily_summary": daily_summary, "rows": rows, "totals": {"students": len(rows), "present_days": total_present, "absent_days": total_absent, "total_sessions": total_sessions, "percentage": round((total_present / total_sessions) * 100, 2) if total_sessions else 0}}


@admin_bp.get("/reports")
@role_required("ADMIN")
def reports():
    start_date = parse_date(request.args.get("start_date"), date.today())
    end_date = parse_date(request.args.get("end_date"), date.today())
    try:
        data = report_data(start_date, end_date, (request.args.get("session_type") or "CLASS").upper())
    except ValueError as error:
        return jsonify({"message": str(error)}), 400
    return jsonify({"start_date": start_date.isoformat(), "end_date": end_date.isoformat(), **data})


@admin_bp.get("/reports/export")
@role_required("ADMIN")
def export_reports():
    start_date = parse_date(request.args.get("start_date"), date.today())
    end_date = parse_date(request.args.get("end_date"), date.today())
    try:
        data = report_data(start_date, end_date, (request.args.get("session_type") or "CLASS").upper())
    except ValueError as error:
        return jsonify({"message": str(error)}), 400

    output = StringIO()
    fieldnames = [
        "student_id",
        "email",
        "batch",
        "present_days",
        "absent_days",
        "permission_days",
        "holiday_days",
        "total_sessions",
        "percentage",
        "below_75",
    ]
    for report_date in data["dates"]:
        fieldnames.extend([f"{report_date} status", f"{report_date} marked_time"])

    writer = csv.DictWriter(
        output,
        fieldnames=fieldnames,
    )
    writer.writeheader()
    for row in data["rows"]:
        csv_row = {
            "student_id": row["student_id"],
            "email": row["email"],
            "batch": row["batch"],
            "present_days": row["present_days"],
            "absent_days": row["absent_days"],
            "permission_days": row.get("permission_days", 0),
            "holiday_days": row.get("holiday_days", 0),
            "total_sessions": row["total_sessions"],
            "percentage": row["percentage"],
            "below_75": row["below_75"],
        }
        for record in row["daily_records"]:
            csv_row[f"{record['date']} status"] = record["status"]
            csv_row[f"{record['date']} marked_time"] = record["marked_time"] or ""
        writer.writerow(csv_row)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={data['session_type'].title()}_Attendance_{start_date.isoformat()}.csv"},
    )
