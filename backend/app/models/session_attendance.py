from datetime import datetime, timezone

from app.extensions import db


class SessionAttendance(db.Model):
    """New attendance records. Kept separate from legacy attendances to protect its date-only constraint."""

    __tablename__ = "session_attendances"
    __table_args__ = (db.UniqueConstraint("session_id", "student_id", name="uq_session_attendance_student"),)

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("attendance_sessions.id"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="PRESENT", index=True)
    marked_time = db.Column(db.Time, nullable=True)
    marked_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    distance_meters = db.Column(db.Float, nullable=True)
    correction_reason = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    session = db.relationship("AttendanceSession", back_populates="records")
    student = db.relationship("Student")

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "student_id": self.student_id,
            "attendance_date": self.session.session_date.isoformat() if self.session else None,
            "session_type": self.session.session_type if self.session else None,
            "status": self.status,
            "marked_time": self.marked_time.strftime("%H:%M") if self.marked_time else None,
            "distance_meters": round(self.distance_meters, 1) if self.distance_meters is not None else None,
            "correction_reason": self.correction_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
