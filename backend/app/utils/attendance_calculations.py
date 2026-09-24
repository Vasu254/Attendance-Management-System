"""The single source of truth for attendance percentages and status summaries.

Rules enforced here:
  * Attendance is ONLY generated from actual sessions (AttendanceSession rows
    that are ACTIVE, COMPLETED, or SCHEDULED-past) and legacy AttendancePermission rows.
  * Holidays do NOT count as working days and do NOT reduce the percentage.
  * Dates with no session are invisible to the percentage formula.
  * session_id + student_id is the unique key — no duplicates possible.
  * The exact same formula is used everywhere: Student, Admin, Mentor, Reports, Excel.

  Attendance % = credited / total_valid_sessions * 100
  where total_valid_sessions = all non-holiday, non-future session rows.
"""
from datetime import date

from sqlalchemy import and_, or_

from app.models import (
    Attendance,
    AttendancePermission,
    AttendanceSession,
    Holiday,
    PermissionRequest,
    SessionAttendance,
    StudentPermission,
    SystemSetting,
)
from app.utils.attendance import batches_match, student_is_eligible


def permission_policy():
    setting = db_setting("permission_policy", "EXCLUDE")
    return setting if setting in {"EXCLUDE", "EXCUSED"} else "EXCLUDE"


def db_setting(key, default):
    setting = SystemSetting.query.get(key)
    return setting.value if setting else default


def is_holiday(student, session_date, session_type):
    """Return True if the given date is a holiday applicable to this student/session_type."""
    holidays = Holiday.query.filter(
        ((Holiday.start_date <= session_date) & (Holiday.end_date >= session_date))
        | (Holiday.holiday_date == session_date)
    ).all()
    return any(
        (not holiday.batch or batches_match(holiday.batch, student.batch))
        and (
            not (holiday.session_type or holiday.tracker_type)
            or (holiday.session_type or holiday.tracker_type) == session_type
        )
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
    """Return all sessions that should count toward this student's attendance.

    Includes:
      * AttendanceSession rows with status ACTIVE, COMPLETED, or SCHEDULED
        (SCHEDULED sessions on a past date represent real planned classes that
        have not been activated yet — they still count as working days).
      * Sessions where this student was explicitly marked in SessionAttendance,
        regardless of batch filter.
      * Legacy AttendancePermission rows (CLASS-type only for CLASS queries,
        MENTORING-type only for MENTORING queries).
      * Direct Attendance records manually marked by Admin for this student on dates
        where no formal session exists yet.

    Does NOT include:
      * CANCELLED sessions.
      * Sessions on future dates with status SCHEDULED (not yet started).
    """
    today = date.today()
    created_d = student.created_at.date() if (student and student.created_at) else today

    # Include ACTIVE, COMPLETED, and SCHEDULED-past sessions.
    sessions_q = AttendanceSession.query.filter(
        or_(
            AttendanceSession.status.in_(["ACTIVE", "COMPLETED"]),
            and_(
                AttendanceSession.status == "SCHEDULED",
                AttendanceSession.session_date <= today,
            ),
        )
    )
    if session_type:
        sessions_q = sessions_q.filter_by(session_type=session_type)
    if start_date:
        sessions_q = sessions_q.filter(AttendanceSession.session_date >= start_date)
    if end_date:
        sessions_q = sessions_q.filter(AttendanceSession.session_date <= end_date)

    result = []
    covered_dates = set()

    for s in sessions_q.order_by(
        AttendanceSession.session_date.asc(), AttendanceSession.id.asc()
    ).all():
        has_rec = SessionAttendance.query.filter_by(session_id=s.id, student_id=student.id).first() is not None
        if student_is_eligible(student, s) or has_rec:
            result.append(s)
            covered_dates.add((s.session_date, s.session_type))

    # Old AttendancePermission rows were the original class sessions.
    if not session_type or session_type in {"CLASS", "MENTORING"}:
        target_legacy_type = session_type or "CLASS"
        legacy = AttendancePermission.query.all()
        for permission in legacy:
            permission_type = permission.tracker_type or "CLASS"
            if session_type and permission_type != session_type:
                continue
            if start_date and permission.attendance_date < start_date:
                continue
            if end_date and permission.attendance_date > end_date:
                continue
            has_att = Attendance.query.filter_by(
                student_id=student.id,
                attendance_date=permission.attendance_date,
            ).first() is not None
            # Only apply generic (batch=None) sessions if student was already enrolled or has a record
            eligible = student_is_eligible(student, permission)
            if eligible and (permission.batch or permission.attendance_date >= created_d or has_att):
                result.append(permission)
                covered_dates.add((permission.attendance_date, permission_type))

    # 3. Direct Attendance records (manually marked by Admin on any date)
    att_q = Attendance.query.filter_by(student_id=student.id)
    if start_date:
        att_q = att_q.filter(Attendance.attendance_date >= start_date)
    if end_date:
        att_q = att_q.filter(Attendance.attendance_date <= end_date)

    for att in att_q.order_by(Attendance.attendance_date.asc()).all():
        att_type = att.tracker_type or "CLASS"
        if session_type and att_type != session_type:
            continue
        if (att.attendance_date, att_type) not in covered_dates:
            result.append(att)
            covered_dates.add((att.attendance_date, att_type))

    return result


def session_status(student, session):
    """Return the attendance status string for one student+session combination.

    Returns one of: PRESENT, ABSENT, PERMISSION, HOLIDAY, NOT_MARKED, OFFLINE, ONLINE.
    """
    if isinstance(session, Attendance):
        session_type = session.tracker_type or "CLASS"
        session_date = session.attendance_date
        if is_holiday(student, session_date, session_type):
            return "HOLIDAY"
        return session.status

    session_type = getattr(session, "session_type", "CLASS")
    session_date = session.session_date if isinstance(session, AttendanceSession) else session.attendance_date

    if is_holiday(student, session_date, session_type):
        return "HOLIDAY"

    if isinstance(session, AttendanceSession):
        record = SessionAttendance.query.filter_by(session_id=session.id, student_id=student.id).first()
        if record:
            return record.status
        # Fallback to direct Attendance record if recorded for this date and type
        direct = Attendance.query.filter(
            Attendance.student_id == student.id,
            Attendance.attendance_date == session.session_date,
            or_(Attendance.tracker_type == session.session_type, Attendance.tracker_type.is_(None)),
        ).first()
        if direct:
            return direct.status
        if approved_permission(student, session):
            return "PERMISSION"
    else:
        tracker_type = getattr(session, "tracker_type", None) or "CLASS"
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

    # If the session date has passed (or is today) and no record exists → ABSENT.
    return "ABSENT" if session_date <= date.today() else "NOT_MARKED"


def student_summary(student, session_type=None, start_date=None, end_date=None):
    """Compute attendance totals for one student using the canonical formula.

    Attendance % = credited / total_valid_sessions * 100

    Where:
      total_valid_sessions = sessions that are not holidays and not future-unmarked.
      credited             = PRESENT + OFFLINE + ONLINE + (PERMISSION if policy=EXCUSED).
      Holidays and NOT_MARKED (future) sessions are excluded from the denominator.
    """
    policy = permission_policy()
    totals = {
        "present": 0,
        "absent": 0,
        "permission": 0,
        "holiday": 0,
        "not_marked": 0,
        "total_sessions": 0,
        "credited": 0,
    }
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

    totals["attendance_percentage"] = (
        round((totals["credited"] / totals["total_sessions"]) * 100, 2)
        if totals["total_sessions"]
        else 0
    )
    totals["below_75"] = bool(totals["total_sessions"] and totals["attendance_percentage"] < 75)
    return totals


def split_summary(student, start_date=None, end_date=None):
    """Return combined CLASS + MENTORING summary for a student."""
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


def holiday_dates_in_range(start_date, end_date, batch=None, session_type=None):
    """Return a set of date objects that are holidays within the given range.

    Optionally filtered by batch and session_type.
    """
    holidays = Holiday.query.filter(
        or_(
            and_(Holiday.start_date <= end_date, Holiday.end_date >= start_date),
            and_(Holiday.holiday_date >= start_date, Holiday.holiday_date <= end_date),
        )
    ).all()

    result = set()
    for h in holidays:
        # Batch check
        if batch and h.batch and not batches_match(h.batch, batch):
            continue
        # Session-type check
        h_type = h.session_type or h.tracker_type
        if session_type and h_type and h_type != session_type:
            continue

        h_start = h.start_date or h.holiday_date
        h_end = h.end_date or h.holiday_date
        if not h_start:
            continue
        current = max(h_start, start_date)
        stop = min(h_end, end_date)
        while current <= stop:
            result.add(current)
            from datetime import timedelta
            current += timedelta(days=1)
    return result
