# Task #3: Configure Docker Environment for Backend Application

## Scope

Containerize the Django REST API backend with Docker and Docker Compose, add PostgreSQL for consistent local/dev deployment, externalize configuration via environment variables, add a health check endpoint, and document Docker-based workflows.

## Key Implementation Decisions

- **Database**: PostgreSQL 16 (Alpine) in Docker Compose; SQLite remains the default when `DB_HOST` is unset for non-Docker local development.
- **Settings**: `config/settings.py` switches to PostgreSQL when `DB_HOST` is provided; all connection values come from env vars via `python-decouple`.
- **Health check**: `GET /api/health/` (unauthenticated) returns `200` with database status; `503` when the database is unreachable. Used by Docker Compose `healthcheck` for the backend service.
- **Entrypoint**: `docker/entrypoint.sh` waits for the database (up to 30s), runs migrations, optionally seeds the admin user, then execs the container command.
- **Development**: Compose mounts `.:/app` and runs `runserver` for hot reload; production image default CMD uses Gunicorn.
- **Admin bootstrap**: `SETUP_ADMIN` (default `true`) and `DJANGO_ADMIN_*` env vars control first-run admin creation in containers.
- **Assumption**: Frontend continues to run outside Docker via Vite during local dev; CORS defaults target `localhost:5173`.

## Files Changed

| File | Purpose |
|------|---------|
| `Dockerfile` | Python 3.12-slim image, system deps, pip install, Gunicorn default CMD |
| `docker-compose.yml` | `backend` + `db` services, volumes, networking, health checks, log rotation |
| `docker/entrypoint.sh` | DB wait, migrate, optional admin setup, exec CMD |
| `.dockerignore` | Exclude venv, SQLite DB, frontend artifacts, secrets from build context |
| `.env.example` | Documented env template for Docker and app config |
| `config/settings.py` | PostgreSQL config when `DB_HOST` is set |
| `inventory/views.py` | `HealthCheckView` |
| `inventory/urls.py` | `/api/health/` route |
| `inventory/tests.py` | Health check tests |
| `requirements.txt` | `psycopg2-binary`, `gunicorn` |
| `README.md` | Docker setup, commands, troubleshooting |

## Running with Docker

```bash
cp .env.example .env
docker compose up --build
```

- API: http://localhost:8000/api/
- Health: http://localhost:8000/api/health/
- Docs: http://localhost:8000/api/docs/

## Tests

```bash
# Local (SQLite)
DEBUG=True SECRET_KEY=test-key python3 manage.py test inventory

# In Docker
docker compose exec backend python manage.py test inventory
```

## Open Questions / Follow-ups

- Add a `docker-compose.prod.yml` override with Gunicorn and without source volume mounts.
- Containerize the React frontend as a separate Compose service.
- CI pipeline job to build the Docker image and run tests inside the container.
