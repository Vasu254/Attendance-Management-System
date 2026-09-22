from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/")
def root():
    return jsonify({"status": "ok", "message": "Attendance Management System is running successfully!"})


@health_bp.get("/health")
def health():
    return jsonify({"status": "ok"})
