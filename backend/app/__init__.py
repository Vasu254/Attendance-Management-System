from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import bcrypt, db, jwt
from .routes.admin import admin_bp
from .routes.auth import auth_bp
from .routes.health import health_bp
from .routes.student import student_bp
from .routes.mock_interview import mock_interview_bp
from .utils.seed import seed_admin
from .utils.schema import ensure_location_columns


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}}, supports_credentials=True)

    app.register_blueprint(health_bp)                        # handles "/" and "/health"
    app.register_blueprint(health_bp, url_prefix="/api", name="health_api")  # handles "/api/health"
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(student_bp, url_prefix="/api/student")
    app.register_blueprint(mock_interview_bp, url_prefix="/api")

    with app.app_context():
        db.create_all()
        ensure_location_columns()
        seed_admin()

    return app
