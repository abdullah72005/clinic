# Docker Compose Exec Commands Guide

This guide shows how to run project commands inside running containers using docker compose exec.

## When to use this

Use docker compose exec when containers are already running and you want to run one-off commands like migrations, tests, or shell access.

If containers are not running yet, start them first:

```bash
docker compose up -d
```

## Command Pattern

```bash
docker compose exec <service_name> <command>
```

Current service names in this project:

- db
- backend
- frontend

## Backend Commands

Run Django migrations:

```bash
docker compose exec backend python manage.py migrate
```

Create migrations:

```bash
docker compose exec backend python manage.py makemigrations
```

Run backend tests:

```bash
docker compose exec backend python manage.py test
```

Run only auth tests:

```bash
docker compose exec backend python manage.py test authentication.tests
```

Open Django shell:

```bash
docker compose exec backend python manage.py shell
```

Create admin user:

```bash
docker compose exec backend python manage.py createsuperuser
```

Install a backend package and persist it in requirements:

```bash
docker compose exec backend pip install <package_name>
docker compose exec backend pip freeze > requirements.txt
```

## Frontend Commands

Install npm packages:

```bash
docker compose exec frontend npm install
```

Run lint:

```bash
docker compose exec frontend npm run lint
```

Run frontend tests (if configured):

```bash
docker compose exec frontend npm test
```

Open shell in frontend container:

```bash
docker compose exec frontend sh
```

## Database Commands

Open Postgres shell:

```bash
docker compose exec db psql -U clinicuser -d clinicdb
```

List database tables:

```bash
docker compose exec db psql -U clinicuser -d clinicdb -c "\dt"
```

## Useful Variants

Run as root user inside container:

```bash
docker compose exec --user root backend sh
```

Run a non-interactive command in a new temporary container:

```bash
docker compose run --rm backend python manage.py showmigrations
```

## Troubleshooting

If you get "service is not running":

```bash
docker compose up -d
```

If command is not found, check container shell path:

```bash
docker compose exec backend sh
```

If dependencies changed, rebuild images:

```bash
docker compose up --build -d
```
