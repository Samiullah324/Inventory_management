# Inventory Management System

Full-stack inventory management application for tracking products, categories, and stock movements. A Django REST API backend powers a React admin dashboard for day-to-day inventory operations.

## Description

This system provides a single-admin inventory workspace. Stock levels are maintained through an immutable transaction ledger (IN, OUT, and ADJUST entries) rather than direct stock edits. The dashboard surfaces aggregate metrics, low-stock alerts, and recent activity. All API endpoints except health check and authentication require an admin (staff) JWT.

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | Python 3.12, Django 5, Django REST Framework |
| **Authentication** | djangorestframework-simplejwt (JWT bearer tokens) |
| **API docs** | drf-spectacular (OpenAPI 3 / Swagger UI) |
| **Database** | PostgreSQL 16 (Docker) or SQLite (local dev without `DB_HOST`) |
| **Configuration** | python-decouple |
| **CORS** | django-cors-headers |
| **Production server** | Gunicorn (Docker image default CMD) |
| **Frontend** | React 19, Vite 8, React Router 7, Axios |
| **Frontend testing** | Vitest, Testing Library, jsdom |
| **Containerization** | Docker, Docker Compose |

## Project Structure

```
.
├── config/                 # Django project settings, URLs, CORS, WSGI/ASGI
├── inventory/              # Core Django app
│   ├── models.py           # Category, Product, InventoryTransaction
│   ├── views.py            # REST viewsets and dashboard/health endpoints
│   ├── serializers.py      # Request/response validation
│   ├── services.py         # Stock ledger logic, low-stock queries
│   ├── auth_views.py       # JWT login, refresh, logout
│   ├── admin.py            # Django admin registration
│   ├── migrations/         # Database migrations
│   └── management/commands/
│       └── setup_admin.py  # Create or update the admin user
├── frontend/               # React SPA (Vite)
│   ├── src/
│   │   ├── pages/          # Dashboard, Products, Categories, Transactions, Login
│   │   ├── components/     # Layout, modals, protected routes, session guard
│   │   ├── services/api.js # Axios client and API helpers
│   │   ├── context/        # Auth and notification providers
│   │   └── utils/          # Auth, validation, formatting, inventory helpers
│   ├── vite.config.js      # Dev server (port 5173) with /api proxy
│   └── .env.example        # Frontend environment template
├── docker/
│   └── entrypoint.sh       # DB wait, migrate, optional admin bootstrap
├── docker-compose.yml      # PostgreSQL + backend services
├── Dockerfile              # Backend image (Python 3.12)
├── requirements.txt        # Python dependencies
├── manage.py               # Django management entry point
└── .env.example            # Backend/Docker environment template
```

## Features

- **Product management** — Create, update, and delete products with SKU, category, unit price, and minimum stock threshold. Stock quantity is read-only and derived from transactions.
- **Category management** — Organize products by category. Categories with associated products cannot be deleted.
- **Inventory transactions** — Record stock IN, OUT, and ADJUST movements. The ledger replays transactions atomically to keep stock accurate and prevent negative inventory.
- **Low-stock tracking** — Products with `stock_quantity > 0` and `stock_quantity <= minimum_stock_threshold` are flagged as low stock (out-of-stock items are tracked separately).
- **Dashboard** — Total products, low-stock count, total stock value, and the 10 most recent transactions. Auto-refreshes on a configurable interval.
- **Admin-only access** — Only Django staff users can obtain JWT tokens and call protected APIs.
- **Interactive API docs** — OpenAPI schema and Swagger UI at `/api/docs/`.
- **Django admin** — Built-in admin panel at `/admin/` for direct data management.

## Prerequisites

**Docker workflow (recommended for backend)**

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+

**Local development**

- Python 3.12+
- Node.js 18+ and npm (for the frontend)
- PostgreSQL (optional; SQLite is used when `DB_HOST` is unset)

## Installation

### Option A: Docker (backend + PostgreSQL)

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Build and start services:

```bash
docker compose up --build
```

The entrypoint waits for PostgreSQL, runs migrations, and creates the admin user when `SETUP_ADMIN=true`.

3. In a separate terminal, set up the frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

4. Open the application:

| Service | URL |
|---------|-----|
| Frontend (Vite dev server) | http://localhost:5173 |
| API health check | http://localhost:8000/api/health/ |
| API documentation | http://localhost:8000/api/docs/ |
| Django admin | http://localhost:8000/admin/ |

Default admin credentials (from `.env.example`):

- Username: `admin`
- Password: `admin123`

### Option B: Local development (without Docker)

**Backend**

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # optional; or set env vars inline
# Omit DB_HOST (or leave empty) to use SQLite
DEBUG=True SECRET_KEY=your-dev-key python3 manage.py migrate
DEBUG=True SECRET_KEY=your-dev-key python3 manage.py setup_admin
DEBUG=True SECRET_KEY=your-dev-key python3 manage.py runserver
```

**Frontend**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Vite proxies `/api` requests to `http://127.0.0.1:8000`, so the default `VITE_API_URL=/api` works for local development.

## Configuration

### Backend (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Enable Django debug mode | `True` in `.env.example` |
| `SECRET_KEY` | Django secret key (required when `DEBUG=False`) | `change-me-in-production` |
| `ALLOWED_HOSTS` | Comma-separated hostnames | `localhost,127.0.0.1,backend` |
| `DB_NAME` | PostgreSQL database name | `inventory` |
| `DB_USER` | PostgreSQL user | `inventory` |
| `DB_PASSWORD` | PostgreSQL password | `inventory` |
| `DB_HOST` | PostgreSQL host (`db` in Docker; empty for SQLite) | `db` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins | `http://localhost:5173,http://127.0.0.1:5173` |
| `BACKEND_PORT` | Host port mapped to backend container | `8000` |
| `SETUP_ADMIN` | Run `setup_admin` on container start | `true` |
| `DJANGO_ADMIN_USERNAME` | Bootstrap admin username | `admin` |
| `DJANGO_ADMIN_EMAIL` | Bootstrap admin email | `admin@example.com` |
| `DJANGO_ADMIN_PASSWORD` | Bootstrap admin password | `admin123` |

When `DEBUG=False`, `DJANGO_ADMIN_PASSWORD` (or `--password`) is required for `setup_admin`.

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | API base URL | `/api` |
| `VITE_DASHBOARD_POLL_MS` | Dashboard refresh interval (ms) | `60000` |

For production builds served separately from the API, set `VITE_API_URL` to the full backend URL (for example `http://localhost:8000/api`).

## Usage

### Development

| Component | Command | Notes |
|-----------|---------|-------|
| Backend (Docker) | `docker compose up` | Hot reload via volume mount |
| Backend (local) | `python3 manage.py runserver` | Listens on http://127.0.0.1:8000 |
| Frontend | `cd frontend && npm run dev` | http://localhost:5173 with API proxy |

### Production build (frontend)

```bash
cd frontend
npm run build
npm run preview   # optional: preview the production build locally
```

Serve the `frontend/dist/` output with any static file server. Point `VITE_API_URL` at your deployed API before building.

### Docker commands

| Action | Command |
|--------|---------|
| Start services (foreground) | `docker compose up` |
| Start services (background) | `docker compose up -d` |
| Stop services | `docker compose down` |
| Stop and remove database volume | `docker compose down -v` |
| Rebuild backend image | `docker compose build backend` |
| View logs | `docker compose logs -f` |
| Run migrations | `docker compose exec backend python manage.py migrate` |
| Create/update admin user | `docker compose exec backend python manage.py setup_admin` |
| Django shell | `docker compose exec backend python manage.py shell` |
| Backend tests | `docker compose exec backend python manage.py test inventory` |

## Tests

```bash
# Backend (uses SQLite test database)
DEBUG=True SECRET_KEY=test-key python3 manage.py test inventory

# Frontend unit tests
cd frontend && npm test

# Frontend production build
cd frontend && npm run build
```

## API Documentation

Interactive Swagger UI: http://localhost:8000/api/docs/

OpenAPI schema: http://localhost:8000/api/schema/

All protected endpoints require a JWT access token in the `Authorization: Bearer <token>` header. Only Django staff users can log in.

### Authentication

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login/` | POST | No | Obtain access and refresh tokens (`username`, `password`) |
| `/api/auth/refresh/` | POST | No | Refresh access token (`refresh`) |
| `/api/auth/logout/` | POST | Bearer | Client logout acknowledgement (tokens cleared client-side) |

### System

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health/` | GET | No | Health check and database connectivity |

### Categories

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/categories/` | GET, POST | Bearer | List or create categories |
| `/api/categories/{id}/` | GET, PUT, PATCH, DELETE | Bearer | Retrieve, update, or delete a category |

### Products

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/products/` | GET, POST | Bearer | List or create products |
| `/api/products/{id}/` | GET, PUT, PATCH, DELETE | Bearer | Retrieve, update, or delete a product |
| `/api/products/low-stock/` | GET | Bearer | Products below minimum threshold (excluding out-of-stock) |

`stock_quantity` is read-only on products; use transactions to change stock.

### Transactions

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/transactions/` | GET, POST | Bearer | List or create inventory transactions |
| `/api/transactions/{id}/` | GET, PUT, PATCH, DELETE | Bearer | Retrieve, update, or delete a transaction |

Transaction types: `IN` (add stock), `OUT` (remove stock), `ADJUST` (set absolute stock level).

### Dashboard

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/dashboard/stats/` | GET | Bearer | Aggregates: total products, low-stock count, total stock value, recent transactions |

## Troubleshooting

**Backend exits on startup**

- Ensure `.env` exists (`cp .env.example .env`).
- Check database logs: `docker compose logs db`
- Verify `DB_HOST=db` in `.env` when using Docker Compose.

**Port 8000 already in use**

- Change `BACKEND_PORT` in `.env` (for example `BACKEND_PORT=8001`) and restart: `docker compose up --build`

**Database connection errors**

- Wait for the database health check: `docker compose ps`
- Reset the database volume: `docker compose down -v && docker compose up --build`

**Permission errors on `docker/entrypoint.sh`**

- Make the script executable: `chmod +x docker/entrypoint.sh`

**Frontend cannot reach the API**

- Confirm the backend is running on port 8000.
- For local dev, use `VITE_API_URL=/api` so Vite proxies requests.
- For direct API access, set `VITE_API_URL=http://localhost:8000/api` and ensure `CORS_ALLOWED_ORIGINS` includes your frontend origin.

## Contributing

1. Fork the repository and create a feature branch from `main`.
2. Install backend and frontend dependencies locally.
3. Run backend and frontend tests before opening a pull request.
4. Follow existing code conventions in the Django app and React frontend.

## Security Notes

JWT tokens are stored in browser `localStorage` on the frontend. See `frontend/SECURITY.md` for trade-offs and hardening recommendations. Logout clears client-side tokens but does not revoke them server-side.
