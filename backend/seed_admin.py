from app import create_app
from app.extensions import bcrypt, db
from app.models import User
from app.utils.seed import seed_admin

app = create_app()

with app.app_context():
    db.create_all()
    user = seed_admin()
    print(f"Admin ready: {user.username}")
