from app.extensions import db


class StudentPermission(db.Model):
    """Read-compatible mapping for permission records saved by the earlier app."""

    __tablename__ = "student_permissions"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False, index=True)
    permission_date = db.Column(db.Date, nullable=False, index=True)
    tracker_type = db.Column(db.String(20), nullable=True, index=True)
    status = db.Column(db.String(20), nullable=False, default="PENDING", index=True)
    reason = db.Column(db.Text, nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)

    student = db.relationship("Student")

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "student_name": self.student.full_name if self.student else None,
            "enrollment_id": self.student.student_id if self.student else None,
            "date": self.permission_date.isoformat(),
            "session_type": self.tracker_type or "CLASS",
            "status": self.status,
            "reason": self.reason,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "legacy": True,
        }
