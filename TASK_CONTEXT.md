# Task #3: Integration & System Enhancement

## Scope

Connect the React frontend with Django REST APIs, verify inventory business logic end-to-end, integrate dashboard aggregates, harden error handling, and add integration-focused tests for admin workflows.

## Key Implementation Decisions

### API integration

- **Centralized API layer**: `frontend/src/api/client.js` is the single service module for all REST calls (categories, products, transactions, dashboard, auth).
- **Token lifecycle**: Access tokens refresh automatically on `401` responses. Failed refresh triggers `onSessionExpired` listeners so `AuthContext` clears authenticated state and routes users back to login.
- **Network resilience**: `fetch` failures surface a user-friendly network error instead of raw browser exceptions.
- **Pagination**: `fetchProducts` / `fetchTransactions` pass `page` query params; `ProductsPage` and `TransactionsPage` render `Pagination` controls aligned with backend `PAGE_SIZE=20`.

### Security hardening (review follow-up)

- **SECRET_KEY**: Required via environment for all non-test runs; no hardcoded fallback keys in `settings.py`. Tests generate an ephemeral key at runtime.
- **ALLOWED_HOSTS**: Required via environment when `DEBUG=False`; dev/test defaults to `localhost`, `127.0.0.1`, `testserver` only.
- **CORS**: `django-cors-headers` configured via `CORS_ALLOWED_ORIGINS` env var; dev defaults allow Vite (`http://localhost:5173`). `CORS_ALLOW_CREDENTIALS=True` for cookie auth.
- **JWT rotation**: `ROTATE_REFRESH_TOKENS` and `BLACKLIST_AFTER_ROTATION` enabled; logout blacklists the refresh token.
- **Auth throttling**: Login (`auth_login` 5/min) and refresh (`token_refresh` 10/min) endpoints are rate-limited.
- **Production cookies**: `CSRF_COOKIE_SECURE`, `CSRF_COOKIE_HTTPONLY`, `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_HTTPONLY` set when `DEBUG=False`.
- **CSP**: Removed `unsafe-inline` from `style-src`; styles load from external `/src/index.css`. Added `upgrade-insecure-requests`.

### Inventory logic verification

- **Stock replay**: Integration tests confirm `IN`, `OUT`, and `ADJUST` transactions update `Product.stock_quantity` and dashboard aggregates consistently.
- **Negative stock guard**: Serializer validation + `services._stock_after_transaction` prevent overselling.
- **Category-product integrity**: `CategoryViewSet.perform_destroy` catches `ProtectedError` and returns a clear validation message when products still reference the category.

### Dashboard integration

- Dashboard loads backend-computed stats (`total_products`, `total_stock`, `low_stock_items`, `out_of_stock_items`, `recent_activity`).
- Manual **Refresh** control reloads live aggregates without a full page reload.

### Cross-module consistency

- Transaction create/update/delete reloads the product catalog so stock quantities stay in sync across the transactions UI and product pickers.

## Files Changed

| File | Purpose |
|------|---------|
| `config/settings.py` | SECRET_KEY/ALLOWED_HOSTS enforcement, CORS, secure cookies, JWT rotation, auth throttles |
| `requirements.txt` | Added `django-cors-headers` |
| `inventory/auth_views.py` | Login throttling, logout blacklist, refresh rotation support |
| `inventory/tests.py` | Security tests for login throttle, logout blacklist, refresh rotation |
| `frontend/index.html` | Stricter CSP without `unsafe-inline` |
| `frontend/src/main.jsx` | External stylesheet link (CSP compliance) |
| `frontend/src/api/client.js` | Network error handling, session-expiry notifications, token refresh lifecycle |
| `frontend/src/context/AuthContext.jsx` | Subscribe to session expiry and clear auth state |
| `frontend/src/pages/DashboardPage.jsx` | Refreshable dashboard data loading |
| `frontend/src/pages/TransactionsPage.jsx` | Reload products after transaction mutations |
| `frontend/src/test/integration.test.js` | Token refresh retry, session expiry, network error tests |

## Running Locally

```bash
pip install -r requirements.txt
DEBUG=True SECRET_KEY=dev-key python3 manage.py migrate
DEBUG=True SECRET_KEY=dev-key python3 manage.py setup_admin
DEBUG=True SECRET_KEY=dev-key python3 manage.py runserver

cd frontend && npm install && npm run dev
```

```bash
DEBUG=True SECRET_KEY=dev-key python3 manage.py test inventory
cd frontend && npm test && npm run build
```

Open `http://localhost:5173` and sign in (default `admin` / `admin123`).

### Production environment variables

| Variable | Required when `DEBUG=False` | Example |
|----------|----------------------------|---------|
| `SECRET_KEY` | Yes | Random 50+ char string |
| `ALLOWED_HOSTS` | Yes | `inventory.example.com` |
| `CORS_ALLOWED_ORIGINS` | Yes (if frontend on separate origin) | `https://inventory.example.com` |

Alternatively, serve frontend and API under one origin via a reverse proxy (no CORS needed).

## Assumptions

- Tasks #1 and #2 were developed on separate branches (`sunset/task/1`, `sunset/task/2`) not yet merged to `main`; this PR delivers the integrated full-stack system.
- Admin user is a Django superuser created via `setup_admin`.
- `db.sqlite3` is gitignored and not committed; no secrets in the repository database.
- Vite dev proxy (`/api` → `http://127.0.0.1:8000`) is used for local full-stack development.

## Open Questions / Follow-ups

- Production deployments on separate frontend/API domains must set `CORS_ALLOWED_ORIGINS` and align cookie `SameSite`/proxy headers.
- Very large product catalogs may benefit from a dedicated product search endpoint for transaction forms instead of paginated client-side loading.
