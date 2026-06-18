# Task #1: Frontend Setup (React) – UI & Core Modules

## Scope

React admin frontend for the Inventory Management System: authentication, dashboard, product/category CRUD, inventory transactions, responsive layout, loading states, and notifications.

## Key Implementation Decisions

- **Stack**: Vite + React 19, React Router 7, Axios.
- **Location**: `frontend/` directory alongside the existing Django backend.
- **API integration**: Axios client with JWT bearer auth, automatic token refresh on 401, and shared error extraction.
- **Token storage**: `localStorage` keys `inventory_access_token` / `inventory_refresh_token`. See `frontend/SECURITY.md` for the XSS trade-off, mitigations, and recommended production hardening (httpOnly cookies or strict CSP).
- **Session expiry**: Invalid/missing refresh tokens clear storage, emit `inventory:session-expired`, and `SessionGuard` redirects to `/login` without retrying the failed request.
- **Token refresh concurrency**: `acquireAccessTokenRefresh()` in `frontend/src/api/client.js` uses a shared in-flight promise so simultaneous 401 responses trigger only one refresh request.
- **Input handling**: All form text is sanitized before submit (`frontend/src/utils/sanitize.js`). UI renders values via JSX only (no `dangerouslySetInnerHTML`).
- **Authorization model**: Backend enforces `IsAdminUser` on all inventory API endpoints (`inventory/views.py`). This is a single-admin system; authenticated admins are intended to access the full dataset. Client-side filtering is a performance/UI concern, not row-level access control.
- **Dev proxy**: Vite proxies `/api` to `http://127.0.0.1:8000` so no backend CORS changes were required for local development.
- **Dashboard stats**: Computed client-side from `/api/products/` and `/api/transactions/` (no dedicated dashboard endpoint in backend).
- **Filtering**: Product and transaction filters run client-side because the backend ViewSets do not expose query filters.
- **Stock editing**: `stock_quantity` is read-only in product forms; the edit modal shows current stock as disabled with guidance to use Inventory Transactions.
- **Stock status**: `out` (0 stock), `low` (≤ minimum threshold), `in_stock` otherwise.
- **UI**: Custom CSS admin shell with sidebar navigation, modal forms, toast notifications, and responsive breakpoints for tablet/desktop.

## Files Changed

| File / Area | Purpose |
|-------------|---------|
| `frontend/package.json` | Dependencies and scripts (`dev`, `build`, `test`) |
| `frontend/vite.config.js` | React plugin, API proxy, Vitest config |
| `frontend/SECURITY.md` | Security trade-offs, authorization notes, hardening guidance |
| `frontend/src/api/client.js` | HTTP client, refresh lock, session failure handling |
| `frontend/src/api/session.js` | Session-expired event helper |
| `frontend/src/api/*` | Auth, resource API modules |
| `frontend/src/context/*` | Auth and notification providers |
| `frontend/src/components/*` | Layout, protected route, session guard, modal, loading |
| `frontend/src/pages/*` | Login, Dashboard, Products, Categories, Transactions |
| `frontend/src/utils/*` | Sanitization, validation, stock status, filters, formatters |
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
python3 manage.py test inventory
```

Frontend tests cover: auth token storage/logout, session expiry events, token refresh locking and failure handling, input sanitization, form validation, protected-route redirect, login validation/session-expired UI, dashboard stat utilities, and API error parsing.

## Assumptions

- Admin credentials come from `python manage.py setup_admin` (default `admin` / `admin123`).
- Production API base URL is configured via `VITE_API_URL` (see `frontend/.env.example`).
- Product stock is read-only in the UI; changes go through inventory transactions per backend rules.
- No server-side JWT blacklist endpoint exists; logout is client-side token removal.

## Open Questions / Follow-ups

- **Security (preferred):** Move JWT storage to httpOnly cookies (requires backend changes).
- **Performance:** Add `/api/dashboard/` for aggregated stats instead of client-side aggregation over full lists.
- **Performance:** Add server-side query filters (`django-filter` / DRF `filter_backends`) for products and transactions.
- Production deployment may need `django-cors-headers` if frontend and API are served from different origins without a reverse proxy.
- Deploy with a strict Content Security Policy (see `frontend/SECURITY.md`).
