from datetime import date, datetime

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Attendance, AttendancePermission
from app.utils.attendance import latest_permission_for, student_is_eligible
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


@student_bp.get("/dashboard")
@role_required("STUDENT")
def dashboard():
    student = current_student()
    today = date.today()
    permission = latest_permission_for(today)
    today_attendance = Attendance.query.filter_by(student_id=student.id, attendance_date=today).first()
    permissions = AttendancePermission.query.all()
    total_sessions = len({p.attendance_date for p in permissions if student_is_eligible(student, p)})
    total_present = Attendance.query.filter_by(student_id=student.id, status="PRESENT").count()
    percentage = round((total_present / total_sessions) * 100, 2) if total_sessions else 0
    return jsonify(
        {
            "student": student.to_dict(),
            "today_status": today_attendance.status if today_attendance else "NOT MARKED",
            "permission": permission_payload(student, permission),
            "total_present_days": total_present,
            "total_attendance_sessions": total_sessions,
            "attendance_percentage": percentage,
        }
    )


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
    query = Attendance.query.filter_by(student_id=student.id)
    if start_date:
        query = query.filter(Attendance.attendance_date >= start_date)
    if end_date:
        query = query.filter(Attendance.attendance_date <= end_date)
    pagination = query.order_by(Attendance.attendance_date.desc()).paginate(page=page, per_page=per_page, error_out=False)
    total_sessions = len({p.attendance_date for p in AttendancePermission.query.all() if student_is_eligible(student, p)})
    total_present = Attendance.query.filter_by(student_id=student.id, status="PRESENT").count()
    return jsonify(
        {
            "records": [row.to_dict() for row in pagination.items],
            "page": page,
            "pages": pagination.pages,
            "total": pagination.total,
            "total_present_days": total_present,
            "total_attendance_sessions": total_sessions,
            "attendance_percentage": round((total_present / total_sessions) * 100, 2) if total_sessions else 0,
        }
    )
