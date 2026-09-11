"""The single source of truth for attendance percentages and status summaries."""
from datetime import date

from sqlalchemy import and_, or_

from app.models import Attendance, AttendancePermission, AttendanceSession, Holiday, PermissionRequest, SessionAttendance, StudentPermission, SystemSetting
from app.utils.attendance import student_is_eligible


def permission_policy():
    setting = db_setting("permission_policy", "EXCLUDE")
    return setting if setting in {"EXCLUDE", "EXCUSED"} else "EXCLUDE"


def db_setting(key, default):
    setting = SystemSetting.query.get(key)
    return setting.value if setting else default


def is_holiday(student, session_date, session_type):
    holidays = Holiday.query.filter(
        ((Holiday.start_date <= session_date) & (Holiday.end_date >= session_date))
        | (Holiday.holiday_date == session_date)
    ).all()
    return any(
        (not holiday.batch or holiday.batch == student.batch)
        and (not (holiday.session_type or holiday.tracker_type) or (holiday.session_type or holiday.tracker_type) == session_type)
        for holiday in holidays
    )


def approved_permission(student, session):
    """An approval can target the session exactly, or an unlinked date/type request."""
    modern = PermissionRequest.query.filter(
        PermissionRequest.student_id == student.id,
        PermissionRequest.status == "APPROVED",
        or_(
            PermissionRequest.session_id == session.id,
            and_(
                PermissionRequest.session_id.is_(None),
                PermissionRequest.request_date == session.session_date,
                PermissionRequest.session_type == session.session_type,
            ),
        ),
    ).first()
    if modern:
        return modern
    # StudentPermission is the saved legacy permission data. It remains in its
    # original table and is only read here, never copied or mutated.
    return StudentPermission.query.filter(
        StudentPermission.student_id == student.id,
        StudentPermission.permission_date == session.session_date,
        StudentPermission.status == "APPROVED",
        or_(StudentPermission.tracker_type == session.session_type, StudentPermission.tracker_type.is_(None)),
    ).first()


def applicable_sessions(student, session_type=None, start_date=None, end_date=None):
    """Includes new sessions plus existing legacy attendance windows without changing them."""
    sessions = AttendanceSession.query.filter(AttendanceSession.status.in_(["ACTIVE", "COMPLETED"]))
    if session_type:
        sessions = sessions.filter_by(session_type=session_type)
    if start_date:
        sessions = sessions.filter(AttendanceSession.session_date >= start_date)
    if end_date:
        sessions = sessions.filter(AttendanceSession.session_date <= end_date)
    result = [session for session in sessions.order_by(AttendanceSession.session_date.asc(), AttendanceSession.id.asc()).all() if student_is_eligible(student, session)]

    # Old AttendancePermission rows were the original class sessions. Leave their
    # records in the legacy table and count them as CLASS only.
    if not session_type or session_type == "CLASS":
        legacy = AttendancePermission.query.all()
        for permission in legacy:
            permission_type = permission.tracker_type or "CLASS"
            if (not start_date or permission.attendance_date >= start_date) and (not end_date or permission.attendance_date <= end_date) and permission_type == "CLASS" and student_is_eligible(student, permission):
                result.append(permission)
    if not session_type or session_type == "MENTORING":
        legacy = AttendancePermission.query.all()
        for permission in legacy:
            permission_type = permission.tracker_type or "CLASS"
            if (not start_date or permission.attendance_date >= start_date) and (not end_date or permission.attendance_date <= end_date) and permission_type == "MENTORING" and student_is_eligible(student, permission):
                result.append(permission)
    return result


def session_status(student, session):
    session_type = getattr(session, "session_type", "CLASS")
    session_date = session.session_date if isinstance(session, AttendanceSession) else session.attendance_date
    if is_holiday(student, session_date, session_type):
        return "HOLIDAY"
    if isinstance(session, AttendanceSession):
        record = SessionAttendance.query.filter_by(session_id=session.id, student_id=student.id).first()
        if record:
            return record.status
        if approved_permission(student, session):
            return "PERMISSION"
    else:
        tracker_type = session.tracker_type or "CLASS"
        record = Attendance.query.filter(
            Attendance.student_id == student.id,
            Attendance.attendance_date == session.attendance_date,
            or_(Attendance.tracker_type == tracker_type, Attendance.tracker_type.is_(None)),
        ).first()
        if record:
            return record.status
        # Legacy per-student permissions have no session id, but are tied to the
        # original date and tracker type.
        legacy_permission = StudentPermission.query.filter(
            StudentPermission.student_id == student.id,
            StudentPermission.permission_date == session.attendance_date,
            StudentPermission.status == "APPROVED",
            or_(StudentPermission.tracker_type == tracker_type, StudentPermission.tracker_type.is_(None)),
        ).first()
        if legacy_permission:
            return "PERMISSION"
    return "ABSENT" if session_date <= date.today() else "NOT_MARKED"


def student_summary(student, session_type=None, start_date=None, end_date=None):
    policy = permission_policy()
    totals = {"present": 0, "absent": 0, "permission": 0, "holiday": 0, "not_marked": 0, "total_sessions": 0, "credited": 0}
    for session in applicable_sessions(student, session_type, start_date, end_date):
        status = session_status(student, session)
        if status == "HOLIDAY":
            totals["holiday"] += 1
            continue
        if status == "NOT_MARKED":
            totals["not_marked"] += 1
            continue
        if status == "PERMISSION" and policy == "EXCLUDE":
            totals["permission"] += 1
            continue
        totals["total_sessions"] += 1
        if status in {"PRESENT", "OFFLINE", "ONLINE"}:
            totals["present"] += 1
            totals["credited"] += 1
        elif status == "PERMISSION":
            totals["permission"] += 1
            totals["credited"] += 1
        else:
            totals["absent"] += 1
    totals["attendance_percentage"] = round((totals["credited"] / totals["total_sessions"]) * 100, 2) if totals["total_sessions"] else 0
    totals["below_75"] = bool(totals["total_sessions"] and totals["attendance_percentage"] < 75)
    return totals


def split_summary(student, start_date=None, end_date=None):
    class_summary = student_summary(student, "CLASS", start_date, end_date)
    mentoring_summary = student_summary(student, "MENTORING", start_date, end_date)
    total = class_summary["total_sessions"] + mentoring_summary["total_sessions"]
    credited = class_summary["credited"] + mentoring_summary["credited"]
    return {
        "class": class_summary,
        "mentoring": mentoring_summary,
        "overall_percentage": round((credited / total) * 100, 2) if total else 0,
        "overall_sessions": total,
    }
