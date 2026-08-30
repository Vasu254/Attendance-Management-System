from datetime import datetime, timezone

from app.extensions import db


class Attendance(db.Model):
    __tablename__ = "attendances"
    __table_args__ = (db.UniqueConstraint("student_id", "attendance_date", name="uq_student_attendance_date"),)

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False, index=True)
    attendance_date = db.Column(db.Date, nullable=False, index=True)
    marked_time = db.Column(db.Time, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="PRESENT")
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    distance_meters = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    student = db.relationship("Student", back_populates="attendances")

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "attendance_date": self.attendance_date.isoformat(),
            "marked_time": self.marked_time.strftime("%H:%M"),
            "status": self.status,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "distance_meters": round(self.distance_meters, 1) if self.distance_meters is not None else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
