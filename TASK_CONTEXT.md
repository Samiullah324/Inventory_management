# Task #2: Integration & System Enhancement

## Scope

Connect the React frontend to the Django REST API, verify inventory business logic end-to-end, integrate dashboard statistics, add error handling and form validation, and cover the integration with automated tests.

## Key Implementation Decisions

- **Frontend stack**: Vite + React + React Router in `frontend/`. Dev server proxies `/api` to Django on port 8000.
- **Centralized API layer** (`frontend/src/api/`):
  - `client.js` — shared `fetch` wrapper with JWT injection, 401 refresh retry, and session-expired logout event.
  - `auth.js` — access/refresh token storage in `localStorage`.
  - `services.js` — resource-specific API methods for dashboard, categories, products, and transactions.
- **Authentication lifecycle**: Login stores JWT pair; protected routes require a valid access token; expired access tokens are refreshed once via `/api/auth/token/refresh/`; failed refresh clears tokens and redirects to login.
- **Dashboard API** (`GET /api/dashboard/stats/`): Aggregates total products, categories, stock units, low-stock products (`stock_quantity <= minimum_stock_threshold`), and the 10 most recent transactions.
- **CORS**: `django-cors-headers` enabled for `http://localhost:5173` and `http://127.0.0.1:5173` (configurable via `CORS_ALLOWED_ORIGINS`).
- **Inventory logic**: Reuses existing backend stock replay/validation in `inventory/services.py`. Frontend surfaces API validation errors (negative stock, duplicate SKU, protected category deletes) via alert components.
- **Form validation**: Client-side checks for required fields and numeric constraints mirror backend serializer rules; server responses remain authoritative.
- **Testing**:
  - Backend: existing stock/auth CRUD tests plus dashboard aggregation and category-product relationship tests.
  - Frontend: Vitest unit tests for auth token helpers, API error formatting, and validation utilities.

## Files Changed

| File | Purpose |
|------|---------|
| `requirements.txt` | Added `django-cors-headers` |
| `config/settings.py` | CORS middleware and allowed origins |
| `inventory/views.py` | `DashboardStatsView` for aggregated inventory stats |
| `inventory/urls.py` | Dashboard stats route |
| `inventory/tests.py` | Dashboard and category-product relationship tests |
| `.gitignore` | Ignore `node_modules/` and `frontend/dist/` |
| `frontend/` | React admin UI, API client, pages, styles, and Vitest tests |
| `TASK_CONTEXT.md` | This document |

## API Endpoints (new)

- `GET /api/dashboard/stats/` — dashboard aggregates (admin JWT required)

## Running Locally

### Backend

```bash
pip install -r requirements.txt
DEBUG=True SECRET_KEY=your-dev-key python manage.py migrate
DEBUG=True SECRET_KEY=your-dev-key python manage.py setup_admin
DEBUG=True SECRET_KEY=your-dev-key python manage.py runserver
python manage.py test inventory
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Sign in with the admin credentials from `setup_admin` (default `admin` / `admin123`).

### Tests

```bash
python manage.py test inventory
cd frontend && npm test && npm run build
```

## Assumptions

- Single admin user model from Task #1 remains unchanged.
- Frontend runs separately during development; Vite proxies API calls to Django.
- Dashboard “real-time” stats are fetched on page load and via manual refresh (no WebSockets).
- Category deletion through the API may fail when products reference the category (`PROTECT`); the UI displays the API error.

## Open Questions / Follow-ups

- Production deployment would need a combined static-file strategy (e.g. serve `frontend/dist` from Django or a reverse proxy).
- Category delete could return a clearer 400 response instead of a protected-relation server error.
- Optional enhancements: pagination on list views, optimistic UI updates, and Playwright/Cypress E2E tests.
