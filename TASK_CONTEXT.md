# Task #2: Integration & System Enhancement

## Scope

Connect the React frontend to the Django REST API, verify inventory business logic end-to-end, integrate dashboard statistics, add error handling and form validation, and cover the integration with automated tests.

## Key Implementation Decisions

- **Frontend stack**: Vite + React + React Router in `frontend/`. Dev server proxies `/api` to Django on port 8000 (`frontend/vite.config.js`).
- **Centralized API layer** (`frontend/src/api/`):
  - `client.js` — shared `fetch` wrapper with JWT injection, single 401 refresh retry (no infinite loops), sanitized error payloads, and session-expired logout event.
  - `auth.js` — access/refresh token storage in `localStorage` with documented XSS trade-off.
  - `services.js` — resource-specific API methods for dashboard, categories, products, and transactions.
- **Authentication lifecycle**: JWT bearer tokens only (no session cookies). CSRF tokens are **not** required because DRF uses `JWTAuthentication` exclusively. Login stores JWT pair; protected routes require a valid access token; expired access tokens are refreshed once via `/api/auth/token/refresh/`; failed refresh clears tokens and redirects to login.
- **Dashboard API** (`GET /api/dashboard/stats/`): Aggregates total products, categories, stock units, low-stock products (`stock_quantity <= minimum_stock_threshold`), and recent transactions. Supports `?limit=` (default 10, max 50). Returns zero counts and empty lists when no data exists. Rate-limited to 30 requests/minute per user.
- **CORS**: `django-cors-headers` with `Csv` cast from `python-decouple` so comma-separated `CORS_ALLOWED_ORIGINS` env values parse into a proper list. Defaults: `http://localhost:5173`, `http://127.0.0.1:5173`.
- **Inventory logic**: Reuses existing backend stock replay/validation in `inventory/services.py`. Frontend surfaces API validation errors (negative stock, duplicate SKU, protected category deletes) via alert components.
- **Form validation**: Client-side checks for required fields and numeric constraints mirror backend serializer rules; server responses remain authoritative.
- **Testing**:
  - Backend: stock/auth CRUD, dashboard aggregation, empty-state defaults, transaction limit, CORS header verification, and category-product relationship tests.
  - Frontend: Vitest unit tests for auth token helpers, API client (401 refresh, error sanitization, login/logout), error formatting, and validation utilities.
- **Environment setup**: `.env.example` documents cross-platform configuration (Windows/macOS/Linux). README warns that `setup_admin` defaults are development-only.

## Files Changed

| File | Purpose |
|------|---------|
| `requirements.txt` | Added `django-cors-headers` |
| `config/settings.py` | CORS `Csv` parsing, dashboard throttle rate |
| `inventory/views.py` | `DashboardStatsView` with limit param and throttling |
| `inventory/throttles.py` | Dashboard rate throttle class |
| `inventory/models.py` | Index on `InventoryTransaction.timestamp` |
| `inventory/migrations/0002_*.py` | Timestamp index migration |
| `inventory/urls.py` | Dashboard stats route |
| `inventory/tests.py` | Dashboard, CORS, empty-state, and relationship tests |
| `.env.example` | Cross-platform local dev configuration template |
| `.gitignore` | Ignore `node_modules/` and `frontend/dist/` at repo root |
| `frontend/.gitignore` | Standard Vite ignores when working inside `frontend/` |
| `frontend/vite.config.js` | Proxies `/api` → `http://127.0.0.1:8000` |
| `frontend/src/api/` | JWT client, auth storage, services, and tests |
| `README.md` | Dev-only credential warning, `.env` setup, auth model docs |
| `TASK_CONTEXT.md` | This document |

## API Endpoints (new)

- `GET /api/dashboard/stats/?limit=10` — dashboard aggregates (admin JWT required, rate-limited)

## Running Locally

### Backend

```bash
cp .env.example .env
pip install -r requirements.txt
python manage.py migrate
python manage.py setup_admin
python manage.py runserver
python manage.py test inventory
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Sign in with credentials created by `setup_admin`. **Change default passwords before any non-local deployment.**

### Tests

```bash
python manage.py test inventory
cd frontend && npm test && npm run build
```

## Assumptions

- Single admin user model from Task #1 remains unchanged.
- Frontend runs separately during development; Vite proxies API calls to Django.
- Dashboard stats are fetched on page load and via manual refresh (no WebSockets).
- Category deletion through the API may fail when products reference the category (`PROTECT`); the UI displays the API error.
- `localStorage` JWT storage is acceptable for this trusted admin SPA; production should use HTTPS and strong credentials.

## Open Questions / Follow-ups

- Production deployment would need a combined static-file strategy (e.g. serve `frontend/dist` from Django or a reverse proxy).
- Category delete could return a clearer 400 response instead of a protected-relation server error.
- Optional enhancements: httpOnly cookie token storage, pagination on list views, and Playwright/Cypress E2E tests.
