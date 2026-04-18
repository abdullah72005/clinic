# Clinic Project - Quick Dev Setup

This guide is for running the full local system:
- PostgreSQL database
- Django backend
- React frontend

If you follow the steps in order, it should work even if you are new to Docker.

## 1) What you need installed first

- Docker Desktop (or Docker Engine + Docker Compose)
- Git

Check Docker is working:

~~~bash
docker --version
docker compose version
~~~

## 2) Open the project folder

~~~bash
cd clinic
~~~

You should see folders like:
- backend
- frontend
- compose.yaml

## 3) Create backend environment file

Create this file:
- backend/.env

Put this exact content inside:

~~~env
POSTGRES_DB=clinicdb
POSTGRES_USER=clinicuser
POSTGRES_PASSWORD=clinicpass
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
~~~

## 4) Create frontend environment file

Create this file:
- frontend/.env

Put this content inside:

~~~env
VITE_API_URL=http://localhost:8001
~~~

## 5) Start everything

From the clinic folder, run:

~~~bash
docker compose up --build
~~~

First run can take a few minutes.

When it is ready, open:
- Frontend: http://localhost:5173
- Backend: http://localhost:8001
- Backend health check: http://localhost:8001/api/health/
- Django admin: http://localhost:8001/admin

## 6) Day-to-day commands

Build images only (do this after changing Dockerfiles, requirements, or package files):

~~~bash
docker compose build
~~~

Start in background:

~~~bash
docker compose up -d
~~~

Stop containers:

~~~bash
docker compose down
~~~

See logs:

~~~bash
docker compose logs -f
~~~

Restart one service:

~~~bash
docker compose restart backend
# or
docker compose restart frontend
~~~

## 7) Common fixes

If ports are already in use:
- Stop other apps using ports 5173 or 8001
- Then run docker compose up again

If frontend cannot call backend (CORS/API issues):
- Confirm backend is running
- Open http://localhost:8001/api/health/
- Confirm frontend .env has VITE_API_URL=http://localhost:8001

If database seems broken and you want a clean reset (deletes local DB data):

~~~bash
docker compose down -v
docker compose up --build
~~~

## 8) One-command fresh start (safe default)

If unsure, run this from clinic folder:

~~~bash
docker compose down
docker compose up --build
~~~

That is all teammates need to get started.
