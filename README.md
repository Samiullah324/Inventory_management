# Inventory Management

Django REST API and React admin UI for inventory management.

> **Security warning:** Default credentials created by `setup_admin` (`admin` / `admin123`) are **DEVELOPMENT ONLY**. Never use them in staging or production. Change the admin password (or set `ADMIN_PASSWORD` when running `setup_admin`) before any non-local deployment.

## Quick start

### 1. Configure environment

Copy the example env file and edit as needed (cross-platform; works on Windows, macOS, and Linux):

```bash
cp .env.example .env
```

### 2. Backend

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py setup_admin
python manage.py runserver
```

`python-decouple` reads variables from `.env` automatically.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and sign in with the admin account you created via `setup_admin`.

The Vite dev server proxies `/api` requests to `http://127.0.0.1:8000` (see `frontend/vite.config.js`).

API docs: http://127.0.0.1:8000/api/docs/

## Authentication model

- **JWT bearer tokens only** — no session cookies. CSRF tokens are not required for API requests.
- Tokens are stored in browser `localStorage` by the React client (`frontend/src/api/`).
- For production, use strong unique admin credentials and HTTPS.

## Tests

```bash
python manage.py test inventory
cd frontend && npm test && npm run build
```
