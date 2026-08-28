import json
import os

from dotenv import load_dotenv

load_dotenv()


def normalize_database_url(value):
    if value and value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql://", 1)
    return value


def parse_cors_origins(value):
    if not value:
        return ["http://localhost:5173"]
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass
    return [origin.strip() for origin in value.split(",") if origin.strip()]


class Config:
    SQLALCHEMY_DATABASE_URI = normalize_database_url(os.getenv("DATABASE_URL", "sqlite:///attendance.db"))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev_secret_change_me_please_replace_32_chars")
    CORS_ORIGINS = parse_cors_origins(os.getenv("CORS_ORIGINS", "http://localhost:5173"))
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@123")
