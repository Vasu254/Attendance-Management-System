from datetime import datetime, timezone

from app.extensions import db


class AttendanceSession(db.Model):
    """A new, session-aware attendance window. Legacy permissions remain untouched."""

    __tablename__ = "attendance_sessions"

    id = db.Column(db.Integer, primary_key=True)
    session_date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    session_type = db.Column(db.String(20), nullable=False, default="CLASS", index=True)
    status = db.Column(db.String(20), nullable=False, default="SCHEDULED", index=True)
    batch = db.Column(db.String(80), nullable=True, index=True)
    section = db.Column(db.String(80), nullable=True, index=True)
    subject = db.Column(db.String(160), nullable=True)
    room = db.Column(db.String(160), nullable=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    location_name = db.Column(db.String(160), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    radius_meters = db.Column(db.Float, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    activated_at = db.Column(db.DateTime, nullable=True)
    closed_at = db.Column(db.DateTime, nullable=True)

    records = db.relationship("SessionAttendance", back_populates="session", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "attendance_date": self.session_date.isoformat(),
            "session_date": self.session_date.isoformat(),
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
            "session_type": self.session_type,
            "status": self.status,
            "batch": self.batch,
            "section": self.section,
            "subject": self.subject,
            "room": self.room,
            "mentor_id": self.mentor_id,
            "location_name": self.location_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "radius_meters": self.radius_meters,
            "location_required": self.latitude is not None and self.longitude is not None and self.radius_meters is not None,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
