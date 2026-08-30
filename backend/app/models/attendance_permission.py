from datetime import datetime, timezone

from app.extensions import db


class AttendancePermission(db.Model):
    __tablename__ = "attendance_permissions"

    id = db.Column(db.Integer, primary_key=True)
    attendance_date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="CLOSED", index=True)
    batch = db.Column(db.String(80), nullable=True, index=True)
    section = db.Column(db.String(80), nullable=True, index=True)
    location_name = db.Column(db.String(160), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    radius_meters = db.Column(db.Float, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "attendance_date": self.attendance_date.isoformat(),
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
            "status": self.status,
            "batch": self.batch,
            "section": self.section,
            "location_name": self.location_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "radius_meters": self.radius_meters,
            "location_required": self.latitude is not None and self.longitude is not None and self.radius_meters is not None,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
