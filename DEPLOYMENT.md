# Deployment Guide

This project has two deployable apps:

- `backend/`: Flask API for Render
- `frontend/`: React/Vite app for Netlify

## 1. Push Code To GitHub

Authenticate GitHub on this machine, then push:

```bash
cd "/home/vasu/Documents/Student Management System"
git push -u origin main
```

If HTTPS asks for a password, use a GitHub Personal Access Token. GitHub does not accept normal account passwords for git pushes.

## 2. Deploy Backend On Render

1. Open Render and create a PostgreSQL database.
2. Copy the database internal connection string.
3. Create a new Web Service from the GitHub repository.
4. Set Root Directory to `backend`.
5. Set Build Command:

```bash
pip install -r requirements.txt
```

6. Set Start Command:

```bash
gunicorn run:app
```

7. Add environment variables:

```bash
DATABASE_URL=<your-render-postgres-internal-url>
JWT_SECRET_KEY=<a-long-random-secret-at-least-32-characters>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<your-secure-admin-password>
CORS_ORIGINS=https://your-netlify-site.netlify.app
```

8. Deploy and test:

```text
https://your-render-service.onrender.com/api/health
```

The response should be:

```json
{"status":"ok"}
```

## 3. Deploy Frontend On Netlify

1. Open Netlify and import the same GitHub repository.
2. Set Base directory to `frontend`.
3. Set Build command:

```bash
npm run build
```

4. Set Publish directory:

```bash
dist
```

5. Add environment variable:

```bash
VITE_API_URL=https://your-render-service.onrender.com/api
```

6. Deploy.

## 4. Final Production Settings

After Netlify deploys, copy the final Netlify URL and update the Render backend variable:

```bash
CORS_ORIGINS=https://your-netlify-site.netlify.app
```

Redeploy the backend after changing CORS.

## 5. Data Storage

Production data must use PostgreSQL on Render. The app stores:

- Admin and student login accounts
- Student profile details
- Attendance permission sessions
- Each student's marked attendance record
- Admin reports and progress are calculated from stored sessions and attendance records

SQLite is only for local development.
