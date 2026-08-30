from sqlalchemy import inspect, text

from app.extensions import db


def ensure_location_columns():
    inspector = inspect(db.engine)
    table_columns = {
        table_name: {column["name"] for column in inspector.get_columns(table_name)}
        for table_name in ("attendance_permissions", "attendances")
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

    for table_name, columns in (
        ("attendance_permissions", permission_columns),
        ("attendances", attendance_columns),
    ):
        existing_columns = table_columns.get(table_name, set())
        for column_name, column_type in columns.items():
            if column_name not in existing_columns:
                db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))

    db.session.commit()
