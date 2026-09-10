from sqlalchemy import inspect, text

from app.extensions import db


def ensure_location_columns():
    # This compatibility migration only ever ADDs nullable columns/tables. It never
    # alters, deletes, reorders, or copies existing students or attendance records.
    inspector = inspect(db.engine)
    table_columns = {
        table_name: {column["name"] for column in inspector.get_columns(table_name)}
        for table_name in ("attendance_permissions", "attendances", "holidays")
        if inspector.has_table(table_name)
    }

    permission_columns = {
        "location_name": "VARCHAR(160)",
        "latitude": "FLOAT",
        "longitude": "FLOAT",
        "radius_meters": "FLOAT",
    }
    attendance_columns = {
        "latitude": "FLOAT",
        "longitude": "FLOAT",
        "distance_meters": "FLOAT",
    }
    holiday_columns = {
        "start_date": "DATE",
        "end_date": "DATE",
        "name": "VARCHAR(160)",
        "reason": "VARCHAR(500)",
        "session_type": "VARCHAR(20)",
        "batch": "VARCHAR(80)",
    }

    for table_name, columns in (
        ("attendance_permissions", permission_columns),
        ("attendances", attendance_columns),
        ("holidays", holiday_columns),
    ):
        existing_columns = table_columns.get(table_name, set())
        for column_name, column_type in columns.items():
            if column_name not in existing_columns:
                db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))

    # Read-only lookup indexes make student ID/name and batch searches stay fast
    # as the saved database grows. They do not alter any existing data.
    db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_students_full_name_lookup ON students (full_name)"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_students_batch_section_lookup ON students (batch, section)"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_attendances_student_date_lookup ON attendances (student_id, attendance_date)"))

    db.session.commit()
