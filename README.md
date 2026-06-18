# Inventory Management System

Full-stack inventory management application with a Django REST API backend and React admin frontend.

## Docker (Backend)

The backend runs in Docker with PostgreSQL. No local Python or database installation is required.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+

### Quick Start

1. Copy the environment template and adjust values if needed:

```bash
cp .env.example .env
```

2. Build and start all services:

```bash
docker compose up --build
```

3. Open the API:

- Health check: http://localhost:8000/api/health/
- API docs: http://localhost:8000/api/docs/
- Admin panel: http://localhost:8000/admin/

Default admin credentials (from `.env.example`):

- Username: `admin`
- Password: `admin123`

### Common Commands

| Action | Command |
|--------|---------|
| Start services (foreground) | `docker compose up` |
| Start services (background) | `docker compose up -d` |
| Stop services | `docker compose down` |
| Stop and remove database volume | `docker compose down -v` |
| Rebuild backend image | `docker compose build backend` |
| View logs (all services) | `docker compose logs -f` |
| View backend logs only | `docker compose logs -f backend` |
| Run migrations | `docker compose exec backend python manage.py migrate` |
| Create/update admin user | `docker compose exec backend python manage.py setup_admin` |
| Run Django shell | `docker compose exec backend python manage.py shell` |
| Run backend tests | `docker compose exec backend python manage.py test inventory` |

### Development

`docker-compose.yml` mounts the project directory into the backend container for hot reload. Django's development server restarts automatically when Python files change.

Environment variables are loaded from `.env`. See `.env.example` for all supported settings.

### Troubleshooting

**Backend exits on startup**

- Ensure `.env` exists (`cp .env.example .env`).
- Check database logs: `docker compose logs db`
- Verify `DB_HOST=db` in `.env` when using Docker Compose.

**Port 8000 already in use**

- Change `BACKEND_PORT` in `.env` (e.g. `BACKEND_PORT=8001`) and restart: `docker compose up --build`

**Database connection errors**

- Wait for the database health check to pass: `docker compose ps`
- Reset the database volume: `docker compose down -v && docker compose up --build`

**Permission errors on `docker/entrypoint.sh`**

- Make the script executable: `chmod +x docker/entrypoint.sh`

## Local Development (without Docker)

### Backend

```bash
pip install -r requirements.txt
DEBUG=True SECRET_KEY=your-dev-key python3 manage.py migrate
DEBUG=True SECRET_KEY=your-dev-key python3 manage.py setup_admin
DEBUG=True SECRET_KEY=your-dev-key python3 manage.py runserver
```

Uses SQLite by default when `DB_HOST` is not set.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Tests

```bash
# Backend (SQLite)
DEBUG=True SECRET_KEY=test-key python3 manage.py test inventory

# Frontend
cd frontend && npm test && npm run build
```

## API Overview

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health/` | GET | No | Health check (database connectivity) |
| `/api/auth/login/` | POST | No | Obtain JWT tokens |
| `/api/auth/logout/` | POST | Bearer | Client logout acknowledgement |
| `/api/auth/refresh/` | POST | No | Refresh access token |
| `/api/dashboard/stats/` | GET | Bearer | Dashboard aggregates |
| `/api/products/low-stock/` | GET | Bearer | Low-stock products |

API documentation: http://localhost:8000/api/docs/
