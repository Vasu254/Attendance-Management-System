from datetime import datetime, date, timezone
from app.extensions import db

class MockInterviewFeedback(db.Model):
    __tablename__ = "mock_interview_feedbacks"

    id = db.Column(db.Integer, primary_key=True)
    interviewer_email = db.Column(db.String(255), nullable=False, default="vasukumar.telugu@innomatics.in")
    interviewer_name = db.Column(db.String(120), nullable=False)
    
    # Optional link to registered student
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=True, index=True)
    
    # Candidate details from form
    learner_name = db.Column(db.String(150), nullable=False, index=True)
    learner_email = db.Column(db.String(255), nullable=False, index=True)
    enrollment_id = db.Column(db.String(50), nullable=False, index=True)
    batch_number = db.Column(db.String(50), nullable=False, index=True)
    course_name = db.Column(db.String(100), nullable=False, default="JavaFullstack")
    branch = db.Column(db.String(100), nullable=False, default="Dilshuknagar, Hyderabad")
    
    # Interview evaluation
    punctuality = db.Column(db.String(50), nullable=False, default="On Time") # "On Time", "No"
    interview_date = db.Column(db.Date, nullable=False, default=date.today)
    
    # JSON rating dictionaries
    # technical_ratings: {"Java Fundamentals": "Good", "Variables & Data Types": "Average", ...}
    technical_ratings = db.Column(db.JSON, nullable=False, default=dict)
    
    # technical_action_plan: {"Revise Core Java Fundamentals": "Needed", ...}
    technical_action_plan = db.Column(db.JSON, nullable=False, default=dict)
    
    # soft_skills_action_plan: {"Highlight technical skills...": "Needed", ...}
    soft_skills_action_plan = db.Column(db.JSON, nullable=False, default=dict)
    
    # Verdict & Remarks
    final_verdict = db.Column(db.String(50), nullable=False, default="Needs Improvement") # "Pass", "Needs Improvement", "Critical Gap"
    internal_remarks = db.Column(db.Text, nullable=True) # Not shared with candidate
    candidate_feedback = db.Column(db.Text, nullable=True) # Constructive feedback shared with candidate
    
    # Email tracking
    email_sent_to_student = db.Column(db.Boolean, default=False)
    email_sent_to_admin = db.Column(db.Boolean, default=False)
    email_dispatched_at = db.Column(db.DateTime, nullable=True)
    
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    student = db.relationship("Student", backref=db.backref("mock_feedbacks", lazy=True))
    creator = db.relationship("User", foreign_keys=[created_by])

    def to_dict(self):
        return {
            "id": self.id,
            "interviewer_email": self.interviewer_email,
            "interviewer_name": self.interviewer_name,
            "student_id": self.student_id,
            "learner_name": self.learner_name,
            "learner_email": self.learner_email,
            "enrollment_id": self.enrollment_id,
            "batch_number": self.batch_number,
            "course_name": self.course_name,
            "branch": self.branch,
            "punctuality": self.punctuality,
            "interview_date": self.interview_date.isoformat() if self.interview_date else None,
            "technical_ratings": self.technical_ratings or {},
            "technical_action_plan": self.technical_action_plan or {},
            "soft_skills_action_plan": self.soft_skills_action_plan or {},
            "final_verdict": self.final_verdict,
            "internal_remarks": self.internal_remarks,
            "candidate_feedback": self.candidate_feedback,
            "email_sent_to_student": self.email_sent_to_student,
            "email_sent_to_admin": self.email_sent_to_admin,
            "email_dispatched_at": self.email_dispatched_at.isoformat() if self.email_dispatched_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
