from datetime import datetime, date
import csv
from io import StringIO
from flask import Blueprint, jsonify, request, Response
from app.extensions import db
from app.models import MockInterviewFeedback, Student, User
from app.utils.auth import get_current_user, role_required
from app.utils.email_service import send_mock_interview_email, DEFAULT_ADMIN_EMAIL

mock_interview_bp = Blueprint("mock_interview", __name__)

def parse_date(value, fallback=None):
    if not value:
        return fallback
    try:
        return datetime.strptime(str(value).strip()[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return fallback

@mock_interview_bp.get("/mock-interviews/students-lookup")
@role_required("ADMIN", "MENTOR")
def lookup_students():
    """Autocomplete helper to quickly fill student details in the mock interview form."""
    q = (request.args.get("q") or "").strip()
    query = Student.query.join(Student.user).filter(User.is_active.is_(True))
    if q:
        query = query.filter(
            db.or_(
                Student.student_id.ilike(f"%{q}%"),
                Student.full_name.ilike(f"%{q}%"),
                Student.email.ilike(f"%{q}%"),
                Student.batch.ilike(f"%{q}%"),
            )
        )
    students = query.order_by(Student.full_name.asc()).limit(30).all()
    return jsonify([
        {
            "id": s.id,
            "student_id": s.student_id,
            "full_name": s.full_name or s.student_id,
            "email": s.email,
            "batch": s.batch,
            "course": s.course,
            "section": s.section,
        }
        for s in students
    ])

@mock_interview_bp.post("/mock-interviews")
@role_required("ADMIN", "MENTOR")
def create_mock_interview():
    data = request.get_json() or {}
    user = get_current_user()

    required_fields = ["learner_name", "learner_email", "enrollment_id", "batch_number", "interviewer_name"]
    missing = [f for f in required_fields if not str(data.get(f) or "").strip()]
    if missing:
        return jsonify({"message": f"Missing required fields: {', '.join(missing)}"}), 400

    # Match student record if exists
    student_id = data.get("student_id")
    if not student_id:
        student = Student.query.filter(
            db.or_(
                Student.student_id == str(data["enrollment_id"]).strip(),
                Student.email == str(data["learner_email"]).strip(),
            )
        ).first()
        if student:
            student_id = student.id

    interview_date = parse_date(data.get("interview_date"), date.today())
    admin_email_to_notify = str(data.get("interviewer_email") or DEFAULT_ADMIN_EMAIL).strip()

    feedback = MockInterviewFeedback(
        interviewer_email=admin_email_to_notify,
        interviewer_name=str(data.get("interviewer_name") or "Interviewer").strip(),
        student_id=student_id,
        learner_name=str(data["learner_name"]).strip(),
        learner_email=str(data["learner_email"]).strip(),
        enrollment_id=str(data["enrollment_id"]).strip(),
        batch_number=str(data["batch_number"]).strip(),
        course_name=str(data.get("course_name") or "JavaFullstack").strip(),
        branch=str(data.get("branch") or "Dilshuknagar, Hyderabad").strip(),
        punctuality=str(data.get("punctuality") or "On Time").strip(),
        interview_date=interview_date,
        technical_ratings=data.get("technical_ratings") or {},
        technical_action_plan=data.get("technical_action_plan") or {},
        soft_skills_action_plan=data.get("soft_skills_action_plan") or {},
        final_verdict=str(data.get("final_verdict") or "Needs Improvement").strip(),
        internal_remarks=str(data.get("internal_remarks") or "").strip(),
        candidate_feedback=str(data.get("candidate_feedback") or "").strip(),
        created_by=user.id if user else None,
    )

    db.session.add(feedback)
    db.session.commit()

    # Dispatch email notification to both student and admin
    email_result = send_mock_interview_email(feedback, admin_email=admin_email_to_notify)
    if email_result.get("success"):
        feedback.email_sent_to_student = True
        feedback.email_sent_to_admin = True
        feedback.email_dispatched_at = datetime.now()
        db.session.commit()

    return jsonify({
        "message": "Mock interview feedback recorded and emailed successfully!",
        "feedback": feedback.to_dict(),
        "email_status": email_result,
    }), 201

@mock_interview_bp.get("/mock-interviews")
@role_required("ADMIN", "MENTOR")
def list_mock_interviews():
    search = (request.args.get("search") or "").strip()
    batch = (request.args.get("batch") or "").strip()
    verdict = (request.args.get("verdict") or "").strip()
    start_date = parse_date(request.args.get("start_date"))
    end_date = parse_date(request.args.get("end_date"))

    query = MockInterviewFeedback.query

    if search:
        query = query.filter(
            db.or_(
                MockInterviewFeedback.learner_name.ilike(f"%{search}%"),
                MockInterviewFeedback.enrollment_id.ilike(f"%{search}%"),
                MockInterviewFeedback.learner_email.ilike(f"%{search}%"),
                MockInterviewFeedback.interviewer_name.ilike(f"%{search}%"),
            )
        )
    if batch:
        query = query.filter(MockInterviewFeedback.batch_number.ilike(f"%{batch}%"))
    if verdict:
        query = query.filter(MockInterviewFeedback.final_verdict == verdict)
    if start_date:
        query = query.filter(MockInterviewFeedback.interview_date >= start_date)
    if end_date:
        query = query.filter(MockInterviewFeedback.interview_date <= end_date)

    feedbacks = query.order_by(MockInterviewFeedback.interview_date.desc(), MockInterviewFeedback.id.desc()).all()

    # Aggregate summaries
    total = len(feedbacks)
    passed = sum(1 for f in feedbacks if f.final_verdict == "Pass")
    needs_imp = sum(1 for f in feedbacks if "NEEDS" in (f.final_verdict or "").upper())
    critical = sum(1 for f in feedbacks if "CRITICAL" in (f.final_verdict or "").upper())

    return jsonify({
        "feedbacks": [f.to_dict() for f in feedbacks],
        "summary": {
            "total": total,
            "pass_count": passed,
            "needs_improvement_count": needs_imp,
            "critical_gap_count": critical,
            "pass_rate": round((passed / total) * 100, 1) if total else 0,
        },
    })

@mock_interview_bp.get("/mock-interviews/<int:feedback_id>")
@role_required("ADMIN", "MENTOR")
def get_mock_interview(feedback_id):
    feedback = MockInterviewFeedback.query.get_or_404(feedback_id)
    return jsonify(feedback.to_dict())

@mock_interview_bp.put("/mock-interviews/<int:feedback_id>")
@role_required("ADMIN", "MENTOR")
def update_mock_interview(feedback_id):
    feedback = MockInterviewFeedback.query.get_or_404(feedback_id)
    data = request.get_json() or {}

    for field in ["learner_name", "learner_email", "enrollment_id", "batch_number", "course_name", "branch", "punctuality", "interviewer_name", "interviewer_email", "final_verdict", "internal_remarks", "candidate_feedback"]:
        if field in data:
            setattr(feedback, field, str(data[field]).strip())

    if "interview_date" in data:
        feedback.interview_date = parse_date(data["interview_date"], feedback.interview_date)
    if "technical_ratings" in data:
        feedback.technical_ratings = data["technical_ratings"]
    if "technical_action_plan" in data:
        feedback.technical_action_plan = data["technical_action_plan"]
    if "soft_skills_action_plan" in data:
        feedback.soft_skills_action_plan = data["soft_skills_action_plan"]

    db.session.commit()
    return jsonify({"message": "Mock interview feedback updated successfully.", "feedback": feedback.to_dict()})

@mock_interview_bp.delete("/mock-interviews/<int:feedback_id>")
@role_required("ADMIN")
def delete_mock_interview(feedback_id):
    feedback = MockInterviewFeedback.query.get_or_404(feedback_id)
    db.session.delete(feedback)
    db.session.commit()
    return jsonify({"message": "Mock interview feedback record deleted."})

@mock_interview_bp.post("/mock-interviews/<int:feedback_id>/resend-email")
@role_required("ADMIN", "MENTOR")
def resend_email(feedback_id):
    feedback = MockInterviewFeedback.query.get_or_404(feedback_id)
    admin_email = str(request.args.get("admin_email") or feedback.interviewer_email or DEFAULT_ADMIN_EMAIL).strip()
    result = send_mock_interview_email(feedback, admin_email=admin_email)
    
    if result.get("success"):
        feedback.email_sent_to_student = True
        feedback.email_sent_to_admin = True
        feedback.email_dispatched_at = datetime.now()
        db.session.commit()

    return jsonify({"message": result.get("message", "Email re-dispatched."), "email_status": result})

@mock_interview_bp.get("/mock-interviews/export")
@role_required("ADMIN", "MENTOR")
def export_mock_interviews():
    feedbacks = MockInterviewFeedback.query.order_by(MockInterviewFeedback.interview_date.desc(), MockInterviewFeedback.id.desc()).all()
    output = StringIO()
    
    fieldnames = [
        "Interview Date",
        "Learner Name",
        "Enrollment ID",
        "Learner Email",
        "Batch",
        "Course",
        "Branch",
        "Interviewer",
        "Punctuality",
        "Final Verdict",
        "Internal Remarks",
        "Candidate Feedback",
    ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for f in feedbacks:
        writer.writerow({
            "Interview Date": f.interview_date.isoformat() if f.interview_date else "",
            "Learner Name": f.learner_name,
            "Enrollment ID": f.enrollment_id,
            "Learner Email": f.learner_email,
            "Batch": f.batch_number,
            "Course": f.course_name,
            "Branch": f.branch,
            "Interviewer": f.interviewer_name,
            "Punctuality": f.punctuality,
            "Final Verdict": f.final_verdict,
            "Internal Remarks": f.internal_remarks or "",
            "Candidate Feedback": f.candidate_feedback or "",
        })
        
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=Mock_Interview_Reports_{date.today().isoformat()}.csv"},
    )

@mock_interview_bp.get("/student/mock-interviews")
@role_required("STUDENT")
def student_mock_interviews():
    """Allows a student to view their own mock interview feedbacks and action plans."""
    user = get_current_user()
    if not user or not user.student:
        return jsonify({"message": "Student profile not found."}), 404
        
    student = user.student
    feedbacks = MockInterviewFeedback.query.filter(
        db.or_(
            MockInterviewFeedback.student_id == student.id,
            MockInterviewFeedback.enrollment_id == student.student_id,
            MockInterviewFeedback.learner_email == student.email,
        )
    ).order_by(MockInterviewFeedback.interview_date.desc(), MockInterviewFeedback.id.desc()).all()
    
    # Exclude internal remarks from student response
    safe_feedbacks = []
    for f in feedbacks:
        f_dict = f.to_dict()
        f_dict.pop("internal_remarks", None)
        safe_feedbacks.append(f_dict)
        
    return jsonify(safe_feedbacks)
