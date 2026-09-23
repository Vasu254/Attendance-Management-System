from datetime import date

from app.models import AttendancePermission, Student, User


def normalize_val(val):
    if val is None:
        return ""
    return str(val).strip().lower()


def batches_match(perm_batch_raw, student_batch_raw):
    """Check if student's batch matches the batch criteria specified on a permission/session."""
    if not perm_batch_raw:
        return True
    p_raw = normalize_val(perm_batch_raw)
    if p_raw in ("", "all", "all batches", "all batch", "*", "n/a", "none"):
        return True

    if not student_batch_raw:
        return False

    s_raw = normalize_val(student_batch_raw)

    # Split possible multiple batches in permission: "64, 65", "64/65", "64 | 65", "64; 65"
    delimiters = [",", "/", "|", ";"]
    perm_list = [p_raw]
    for d in delimiters:
        new_list = []
        for item in perm_list:
            new_list.extend([x.strip() for x in item.split(d) if x.strip()])
        perm_list = new_list

    for target in perm_list:
        if s_raw == target:
            return True
        # Compare without "batch" or "batch-" or spaces for flexible matching (e.g. "64" vs "Batch 64")
        s_clean = s_raw.replace("batch", "").replace("-", "").replace(" ", "").strip()
        t_clean = target.replace("batch", "").replace("-", "").replace(" ", "").strip()
        if s_clean and t_clean and s_clean == t_clean:
            return True

    return False


def sections_match(perm_sec_raw, student_sec_raw):
    """Check if student's section matches the section criteria specified on a permission/session."""
    if not perm_sec_raw:
        return True
    p_raw = normalize_val(perm_sec_raw)
    if p_raw in ("", "all", "all sections", "all section", "*", "n/a", "none"):
        return True

    if not student_sec_raw:
        return False

    s_raw = normalize_val(student_sec_raw)
    if s_raw in ("n/a", "none"):
        return True

    delimiters = [",", "/", "|", ";"]
    perm_list = [p_raw]
    for d in delimiters:
        new_list = []
        for item in perm_list:
            new_list.extend([x.strip() for x in item.split(d) if x.strip()])
        perm_list = new_list

    for target in perm_list:
        if s_raw == target:
            return True
        s_clean = s_raw.replace("section", "").replace("-", "").replace(" ", "").strip()
        t_clean = target.replace("section", "").replace("-", "").replace(" ", "").strip()
        if s_clean and t_clean and s_clean == t_clean:
            return True

    return False


def student_is_eligible(student, permission_or_session):
    if not student or not permission_or_session:
        return False

    perm_batch = getattr(permission_or_session, "batch", None)
    stud_batch = getattr(student, "batch", None)
    if not batches_match(perm_batch, stud_batch):
        return False

    perm_section = getattr(permission_or_session, "section", None)
    stud_section = getattr(student, "section", None)
    if not sections_match(perm_section, stud_section):
        return False

    return True


def latest_permission_for(target_date=None, session_type=None, student=None):
    target_date = target_date or date.today()
    query = AttendancePermission.query.filter_by(attendance_date=target_date)
    if session_type:
        query = query.filter((AttendancePermission.tracker_type == session_type) | (AttendancePermission.tracker_type.is_(None)))

    permissions = query.order_by(AttendancePermission.created_at.desc(), AttendancePermission.id.desc()).all()
    if not permissions:
        return None

    if student:
        # First check for open permission that matches this student's batch
        for perm in permissions:
            if perm.status == "OPEN" and student_is_eligible(student, perm):
                return perm
        # Then check any permission that matches this student's batch
        for perm in permissions:
            if student_is_eligible(student, perm):
                return perm
        return None

    return permissions[0]


def eligible_students_query(permission=None):
    query = Student.query.join(Student.user).filter(User.role == "STUDENT", User.is_active.is_(True))
    if not permission:
        return query

    all_students = query.all()
    eligible_ids = [s.id for s in all_students if student_is_eligible(s, permission)]
    if not eligible_ids:
        return query.filter(Student.id.in_([]))
    return query.filter(Student.id.in_(eligible_ids))
