from datetime import datetime, timezone

from app.extensions import db


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    student_id = db.Column(db.String(50), nullable=False, unique=True, index=True)
    full_name = db.Column(db.String(160), nullable=False, index=True)
    email = db.Column(db.String(160), nullable=False, unique=True, index=True)
    mobile_number = db.Column(db.String(30), nullable=False)
    course = db.Column(db.String(120), nullable=False)
    batch = db.Column(db.String(80), nullable=False, index=True)
    section = db.Column(db.String(80), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship("User", back_populates="student")
    attendances = db.relationship("Attendance", back_populates="student", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "student_id": self.student_id,
            "full_name": self.full_name,
            "email": self.email,
            "mobile_number": self.mobile_number,
            "course": self.course,
            "batch": self.batch,
            "section": self.section,
            "username": self.user.username if self.user else None,
            "is_active": self.user.is_active if self.user else False,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
