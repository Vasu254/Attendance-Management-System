import json
import os

from dotenv import load_dotenv

load_dotenv()


DEFAULT_CORS_ORIGINS = [
    r"http://localhost:\d+",
    r"http://127\.0\.0\.1:\d+",
    r"http://192\.168\.\d{1,3}\.\d{1,3}:\d+",
    r"http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+",
    r"http://172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:\d+",
]


def normalize_database_url(value):
    if value and value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql://", 1)
    return value


def parse_cors_origins(value):
    if not value:
        return DEFAULT_CORS_ORIGINS
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
    CORS_ORIGINS = parse_cors_origins(os.getenv("CORS_ORIGINS"))
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@123")
