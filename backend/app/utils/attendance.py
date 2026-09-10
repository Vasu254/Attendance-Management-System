from datetime import date

from app.models import AttendancePermission, Student, User


def latest_permission_for(target_date=None, session_type=None):
    target_date = target_date or date.today()
    query = AttendancePermission.query.filter_by(attendance_date=target_date)
    if session_type:
        query = query.filter((AttendancePermission.tracker_type == session_type) | (AttendancePermission.tracker_type.is_(None)))
    return query.order_by(AttendancePermission.created_at.desc(), AttendancePermission.id.desc()).first()


def student_is_eligible(student, permission):
    if not student or not permission:
        return False
    if permission.batch and student.batch != permission.batch:
        return False
    if permission.section and student.section != permission.section:
        return False
    return True


def eligible_students_query(permission=None):
    query = Student.query.join(Student.user).filter(User.role == "STUDENT", User.is_active.is_(True))
    if permission and permission.batch:
        query = query.filter(Student.batch == permission.batch)
    if permission and permission.section:
        query = query.filter(Student.section == permission.section)
    return query
