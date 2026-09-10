from datetime import datetime, timezone

from app.extensions import db


class PermissionRequest(db.Model):
    __tablename__ = "permission_requests"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False, index=True)
    session_id = db.Column(db.Integer, db.ForeignKey("attendance_sessions.id"), nullable=True, index=True)
    request_date = db.Column(db.Date, nullable=False, index=True)
    session_type = db.Column(db.String(20), nullable=False, default="CLASS", index=True)
    reason = db.Column(db.String(500), nullable=False)
    remarks = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="PENDING", index=True)
    requested_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    student = db.relationship("Student")

    def to_dict(self):
        return {"id": self.id, "student_id": self.student_id, "student_name": self.student.full_name if self.student else None, "enrollment_id": self.student.student_id if self.student else None, "session_id": self.session_id, "date": self.request_date.isoformat(), "session_type": self.session_type, "reason": self.reason, "remarks": self.remarks, "status": self.status, "requested_by": self.requested_by, "approved_by": self.approved_by, "approved_at": self.approved_at.isoformat() if self.approved_at else None, "created_at": self.created_at.isoformat()}
