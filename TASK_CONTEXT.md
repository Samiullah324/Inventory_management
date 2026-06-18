# Task #1: Frontend Setup (React) – UI & Core Modules

## Scope

React admin frontend for the Inventory Management System: authentication, dashboard, product/category CRUD, inventory transactions, responsive layout, loading states, and notifications.

## Key Implementation Decisions

- **Stack**: Vite + React 19, React Router 7, Axios.
- **Location**: `frontend/` directory alongside the existing Django backend.
- **API integration**: Axios client with JWT bearer auth, automatic token refresh on 401, and shared error extraction.
- **Token storage**: `localStorage` keys `inventory_access_token` / `inventory_refresh_token` (standard SPA pattern; refresh handled by interceptor).
- **Dev proxy**: Vite proxies `/api` to `http://127.0.0.1:8000` so no backend CORS changes were required.
- **Dashboard stats**: Computed client-side from `/api/products/` and `/api/transactions/` (no dedicated dashboard endpoint in backend).
- **Filtering**: Product and transaction filters run client-side because the backend ViewSets do not expose query filters.
- **Stock status**: `out` (0 stock), `low` (≤ minimum threshold), `in_stock` otherwise.
- **UI**: Custom CSS admin shell with sidebar navigation, modal forms, toast notifications, and responsive breakpoints for tablet/desktop.

## Files Changed

| File / Area | Purpose |
|-------------|---------|
| `frontend/package.json` | Dependencies and scripts (`dev`, `build`, `test`) |
| `frontend/vite.config.js` | React plugin, API proxy, Vitest config |
| `frontend/src/api/*` | Auth, HTTP client, resource API modules |
| `frontend/src/context/*` | Auth and notification providers |
| `frontend/src/components/*` | Layout, protected route, modal, loading, confirm dialog |
| `frontend/src/pages/*` | Login, Dashboard, Products, Categories, Transactions |
| `frontend/src/utils/*` | Stock status, filters, dashboard stats, formatters |
| `frontend/src/test/*` | Vitest unit/component tests |
| `frontend/src/index.css` | Admin dashboard styles |
| `.gitignore` | Node modules and frontend build artifacts |

## Running Locally

Backend (terminal 1):

```bash
pip install -r requirements.txt
DEBUG=True SECRET_KEY=your-dev-key python manage.py migrate
DEBUG=True SECRET_KEY=your-dev-key python manage.py setup_admin
DEBUG=True SECRET_KEY=your-dev-key python manage.py runserver
```

Frontend (terminal 2):

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` and sign in with `admin` / `admin123`.

## Tests

```bash
cd frontend && npm test
python manage.py test inventory
```

## Assumptions

- Admin credentials come from `python manage.py setup_admin` (default `admin` / `admin123`).
- Production API base URL is configured via `VITE_API_URL` (see `frontend/.env.example`).
- Product stock is read-only in the UI; changes go through inventory transactions per backend rules.

## Open Questions / Follow-ups

- Backend dashboard summary endpoint could reduce client-side aggregation for large catalogs.
- Server-side filtering/pagination for products and transactions would help at scale.
- Production deployment may need `django-cors-headers` if frontend and API are served from different origins without a reverse proxy.
