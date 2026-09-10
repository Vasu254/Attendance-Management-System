from datetime import datetime, timezone

from app.extensions import db


class Holiday(db.Model):
    __tablename__ = "holidays"

    id = db.Column(db.Integer, primary_key=True)
    # The first four fields below map the existing database exactly. The newer
    # fields are nullable compatibility additions, so no historical holiday has
    # to be rewritten or discarded.
    holiday_date = db.Column(db.Date, nullable=True, index=True)
    tracker_type = db.Column(db.String(20), nullable=True, index=True)
    title = db.Column(db.String(160), nullable=True)
    details = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.Date, nullable=True, index=True)
    end_date = db.Column(db.Date, nullable=True, index=True)
    name = db.Column(db.String(160), nullable=True)
    reason = db.Column(db.String(500), nullable=True)
    session_type = db.Column(db.String(20), nullable=True, index=True)
    batch = db.Column(db.String(80), nullable=True, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        start_date = self.start_date or self.holiday_date
        end_date = self.end_date or self.holiday_date
        return {
            "id": self.id,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "name": self.name or self.title,
            "reason": self.reason or self.details,
            "session_type": self.session_type or self.tracker_type,
            "batch": self.batch,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
