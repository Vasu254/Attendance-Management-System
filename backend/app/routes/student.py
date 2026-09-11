from datetime import date, datetime

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Attendance, AttendancePermission, AttendanceSession, PermissionRequest, SessionAttendance, StudentPermission
from app.utils.attendance import latest_permission_for, student_is_eligible
from app.utils.attendance_calculations import applicable_sessions, session_status, split_summary
from app.utils.auth import get_current_user, role_required
from app.utils.location import distance_in_meters, parse_coordinate, permission_has_geofence

student_bp = Blueprint("student", __name__)


def current_student():
    user = get_current_user()
    return user.student if user else None


def parse_date(value, fallback=None):
    if not value:
        return fallback
    return datetime.strptime(value, "%Y-%m-%d").date()


def permission_payload(student, permission):
    now = datetime.now()
    today = date.today()
    already_marked = False
    eligible = student_is_eligible(student, permission)
    within_window = False
    if permission and permission.attendance_date == today:
        within_window = permission.start_time <= now.time() <= permission.end_time
    attendance = Attendance.query.filter_by(student_id=student.id, attendance_date=today).first()
    already_marked = attendance is not None
    can_mark = (
        bool(permission)
        and permission.status == "OPEN"
        and permission.attendance_date == today
        and within_window
        and eligible
        and not already_marked
    )
    return {
        "permission": permission.to_dict() if permission else None,
        "status": permission.status if permission else "CLOSED",
        "eligible": eligible,
        "within_window": within_window,
        "already_marked": already_marked,
        "can_mark": can_mark,
        "today_attendance": attendance.to_dict() if attendance else None,
    }


def active_session_payload(student, session):
    now = datetime.now()
    record = SessionAttendance.query.filter_by(session_id=session.id, student_id=student.id).first()
    within_window = session.session_date == date.today() and session.start_time <= now.time() <= session.end_time
    return {**session.to_dict(), "eligible": student_is_eligible(student, session), "within_window": within_window, "already_marked": bool(record), "today_attendance": record.to_dict() if record else None, "can_mark": session.status == "ACTIVE" and within_window and student_is_eligible(student, session) and not record}


@student_bp.get("/dashboard")
@role_required("STUDENT")
def dashboard():
    student = current_student()
    today = date.today()
    permission = latest_permission_for(today)
    today_attendance = Attendance.query.filter_by(student_id=student.id, attendance_date=today).first()
    summary = split_summary(student)
    active_sessions = [active_session_payload(student, session) for session in AttendanceSession.query.filter_by(status="ACTIVE", session_date=today).order_by(AttendanceSession.session_type, AttendanceSession.start_time).all() if student_is_eligible(student, session)]
    total_present = summary["class"]["present"] + summary["mentoring"]["present"]
    session_today_status = SessionAttendance.query.join(AttendanceSession).filter(
        SessionAttendance.student_id == student.id,
        AttendanceSession.session_date == today,
    ).order_by(SessionAttendance.updated_at.desc()).first()
    return jsonify(
        {
            "student": student.to_dict(),
            "today_status": session_today_status.status if session_today_status else (today_attendance.status if today_attendance else "NOT MARKED"),
            "permission": permission_payload(student, permission),
            "total_present_days": total_present,
            "total_attendance_sessions": summary["overall_sessions"],
            "attendance_percentage": summary["overall_percentage"],
            "class_attendance": summary["class"],
            "mentoring_attendance": summary["mentoring"],
            "active_sessions": active_sessions,
        }
    )


@student_bp.get("/sessions/active")
@role_required("STUDENT")
def active_sessions():
    student = current_student()
    sessions = AttendanceSession.query.filter_by(status="ACTIVE", session_date=date.today()).order_by(AttendanceSession.session_type, AttendanceSession.start_time).all()
    return jsonify([active_session_payload(student, session) for session in sessions if student_is_eligible(student, session)])


@student_bp.get("/attendance/permission")
@role_required("STUDENT")
def attendance_permission():
    student = current_student()
    permission = latest_permission_for(date.today())
    return jsonify(permission_payload(student, permission))


@student_bp.post("/attendance/mark")
@role_required("STUDENT")
def mark_attendance():
    student = current_student()
    user = get_current_user()
    data = request.get_json() or {}
    if not user.is_active:
        return jsonify({"message": "Your account has been deactivated. Please contact the administrator."}), 403

    session_id = data.get("session_id")
    if session_id:
        session = AttendanceSession.query.get(session_id)
        if not session:
            return jsonify({"message": "Attendance session was not found."}), 404
        now = datetime.now()
        if session.status != "ACTIVE" or session.session_date != date.today() or not (session.start_time <= now.time() <= session.end_time):
            return jsonify({"message": "This session is no longer active."}), 400
        if not student_is_eligible(student, session):
            return jsonify({"message": "You are not eligible for this attendance session."}), 403
        if SessionAttendance.query.filter_by(session_id=session.id, student_id=student.id).first():
            return jsonify({"message": "Attendance has already been marked for this session."}), 409
        latitude = longitude = distance_meters = None
        if permission_has_geofence(session):
            try:
                latitude, longitude = parse_coordinate(data.get("latitude")), parse_coordinate(data.get("longitude"))
            except (TypeError, ValueError):
                return jsonify({"message": "Invalid location coordinates."}), 400
            if latitude is None or longitude is None:
                return jsonify({"message": "Location access is required for this attendance session."}), 400
            distance_meters = distance_in_meters(session.latitude, session.longitude, latitude, longitude)
            if distance_meters > session.radius_meters:
                return jsonify({"message": "You are outside the allowed attendance location."}), 403
        attendance = SessionAttendance(session_id=session.id, student_id=student.id, status="PRESENT", marked_time=now.time(), marked_by=user.id, latitude=latitude, longitude=longitude, distance_meters=distance_meters)
        db.session.add(attendance)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({"message": "Attendance has already been marked for this session."}), 409
        return jsonify({"message": "Attendance marked successfully!", "attendance": attendance.to_dict()}), 201

    today = date.today()
    now = datetime.now()
    permission = latest_permission_for(today)
    if not permission:
        return jsonify({"message": "Attendance permission is not available"}), 400
    if permission.status != "OPEN":
        return jsonify({"message": "Attendance is closed"}), 400
    if permission.attendance_date != today:
        return jsonify({"message": "Attendance date does not match today"}), 400
    if not (permission.start_time <= now.time() <= permission.end_time):
        return jsonify({"message": "Attendance is outside the allowed time window"}), 400
    if not student_is_eligible(student, permission):
        return jsonify({"message": "You are not eligible for this attendance session"}), 403
    if Attendance.query.filter_by(student_id=student.id, attendance_date=today).first():
        return jsonify({"message": "ATTENDANCE ALREADY MARKED TODAY"}), 409

    latitude = None
    longitude = None
    distance_meters = None
    if permission_has_geofence(permission):
        try:
            latitude = parse_coordinate(data.get("latitude"))
            longitude = parse_coordinate(data.get("longitude"))
        except (TypeError, ValueError):
            return jsonify({"message": "Invalid location coordinates"}), 400
        if latitude is None or longitude is None:
            return jsonify({"message": "Location access is required for this attendance session"}), 400
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            return jsonify({"message": "Invalid location coordinates"}), 400

        distance_meters = distance_in_meters(permission.latitude, permission.longitude, latitude, longitude)
        if distance_meters > permission.radius_meters:
            return (
                jsonify(
                    {
                        "message": "You are outside the allowed attendance location",
                        "distance_meters": round(distance_meters, 1),
                        "radius_meters": round(permission.radius_meters, 1),
                    }
                ),
                403,
            )

    attendance = Attendance(
        student_id=student.id,
        attendance_date=today,
        marked_time=now.time(),
        status="PRESENT",
        tracker_type="CLASS",
        latitude=latitude,
        longitude=longitude,
        distance_meters=distance_meters,
    )
    db.session.add(attendance)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "ATTENDANCE ALREADY MARKED TODAY"}), 409
    return jsonify({"message": "Attendance marked successfully!", "attendance": attendance.to_dict()}), 201


@student_bp.get("/attendance/today")
@role_required("STUDENT")
def today_attendance():
    student = current_student()
    attendance = Attendance.query.filter_by(student_id=student.id, attendance_date=date.today()).first()
    return jsonify(attendance.to_dict() if attendance else {"status": "NOT MARKED"})


@student_bp.get("/attendance/history")
@role_required("STUDENT")
def attendance_history():
    student = current_student()
    start_date = parse_date(request.args.get("start_date"))
    end_date = parse_date(request.args.get("end_date"))
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", 10)), 1), 50)
    session_type = (request.args.get("session_type") or "").upper() or None
    records = []
    for session in applicable_sessions(student, session_type, start_date, end_date):
        if isinstance(session, AttendanceSession):
            attendance = SessionAttendance.query.filter_by(session_id=session.id, student_id=student.id).first()
            records.append({
                "id": f"session-{session.id}", "attendance_date": session.session_date.isoformat(), "session_type": session.session_type,
                "session_name": session.subject or session.room or f"{session.session_type.title()} session",
                "marked_time": attendance.marked_time.strftime("%H:%M") if attendance and attendance.marked_time else None,
                "status": session_status(student, session),
            })
        else:
            tracker_type = session.tracker_type or "CLASS"
            attendance = Attendance.query.filter(
                Attendance.student_id == student.id,
                Attendance.attendance_date == session.attendance_date,
                ((Attendance.tracker_type == tracker_type) | Attendance.tracker_type.is_(None)),
            ).first()
            records.append({
                "id": f"legacy-{session.id}", "attendance_date": session.attendance_date.isoformat(), "session_type": "CLASS",
                "session_name": "Legacy class attendance", "marked_time": attendance.marked_time.strftime("%H:%M") if attendance else None,
                "status": session_status(student, session),
            })
    records.sort(key=lambda row: (row["attendance_date"], row.get("marked_time") or ""), reverse=True)
    total = len(records); start = (page - 1) * per_page; summary = split_summary(student, start_date, end_date)
    return jsonify(
        {
            "records": records[start:start + per_page],
            "page": page,
            "pages": max((total + per_page - 1) // per_page, 1),
            "total": total,
            "total_present_days": summary["class"]["present"] + summary["mentoring"]["present"],
            "total_attendance_sessions": summary["overall_sessions"],
            "attendance_percentage": summary["overall_percentage"],
            "class_attendance": summary["class"], "mentoring_attendance": summary["mentoring"],
        }
    )


@student_bp.get("/permission-requests")
@role_required("STUDENT")
def student_permission_requests():
    student = current_student()
    modern = [item.to_dict() for item in PermissionRequest.query.filter_by(student_id=student.id).order_by(PermissionRequest.created_at.desc()).all()]
    legacy = [item.to_dict() for item in StudentPermission.query.filter_by(student_id=student.id).order_by(StudentPermission.permission_date.desc(), StudentPermission.id.desc()).all()]
    return jsonify(sorted([*modern, *legacy], key=lambda item: item.get("created_at") or f"{item['date']}T00:00:00", reverse=True))


@student_bp.post("/permission-requests")
@role_required("STUDENT")
def create_permission_request():
    student = current_student(); user = get_current_user(); data = request.get_json() or {}
    try:
        request_date = parse_date(data.get("date"))
        session_type = str(data.get("session_type") or "CLASS").upper()
        session_id = int(data["session_id"]) if data.get("session_id") else None
    except (TypeError, ValueError):
        return jsonify({"message": "Enter a valid permission date and session."}), 400
    if session_type not in {"CLASS", "MENTORING"} or not str(data.get("reason") or "").strip():
        return jsonify({"message": "Select Class or Mentoring and enter a reason."}), 400
    item = PermissionRequest(student_id=student.id, session_id=session_id, request_date=request_date, session_type=session_type, reason=str(data["reason"]).strip(), remarks=(data.get("remarks") or None), requested_by=user.id)
    db.session.add(item); db.session.commit()
    return jsonify(item.to_dict()), 201
