# Student Self-Attendance Management System

A Flask + React application for admin-controlled student self-attendance.

## Local Development

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python seed_admin.py
python run.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Default local URLs:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- API health: http://localhost:5000/api/health

Default test admin credentials are created from environment variables, or `admin` / `Admin@123` when unset.

## Deployment

Backend is prepared for Render with `gunicorn` and `Procfile`. Set `DATABASE_URL`, `JWT_SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `CORS_ORIGINS`.

Frontend is prepared for Netlify. Set `VITE_API_URL` to your deployed backend URL ending in `/api`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full step-by-step process.
# Student-Attendance-Management-System
