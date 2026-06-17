# Task #3: Integration & System Enhancement

## Scope

Connect the React frontend with Django REST APIs, verify inventory business logic end-to-end, integrate dashboard aggregates, harden error handling, and add integration-focused tests for admin workflows.

## Merge strategy

This PR is **self-contained** and merges directly into `main`. It includes the full Django backend and React frontend because Tasks #1 and #2 were developed on separate branches (`sunset/task/1`, `sunset/task/2`) that were not yet merged to `main`. No dependency on other open PRs is required to build, test, or deploy from this branch.

## Key Implementation Decisions

### API integration

- **Centralized API layer**: `frontend/src/api/client.js` is the single service module for all REST calls (categories, products, transactions, dashboard, auth).
- **Token lifecycle**: Access tokens refresh automatically on `401` responses. Failed refresh triggers `onSessionExpired` listeners so `AuthContext` clears authenticated state and routes users back to login.
- **Network resilience**: `fetch` failures surface a user-friendly network error instead of raw browser exceptions.
- **Pagination**: `fetchProducts` / `fetchTransactions` pass `page` query params; `ProductsPage` and `TransactionsPage` render `Pagination` controls aligned with backend `PAGE_SIZE=20`.
- **Dev proxy**: `frontend/vite.config.js` proxies `/api` → `http://127.0.0.1:8000` for local development.

### Security hardening

- **SECRET_KEY**: Tests (`manage.py test` only) may use an ephemeral key via `config('SECRET_KEY', default=get_random_secret_key())`. All other commands require `SECRET_KEY` in the environment — no bypass via user-controlled flags.
- **RUNNING_TESTS**: Derived solely from `sys.argv[1] == 'test'`; cannot be set via environment.
- **ALLOWED_HOSTS**: Required via environment when `DEBUG=False` and not running tests; dev/test defaults limited to `localhost`, `127.0.0.1`, `testserver`.
- **CORS**: `django-cors-headers` with `CORS_ALLOWED_ORIGINS` env var. Required when `DEBUG=False` (except test runner). Wildcards rejected when `CORS_ALLOW_CREDENTIALS=True`. Dev defaults allow Vite origins only when `DEBUG=True`.
- **JWT rotation**: `ROTATE_REFRESH_TOKENS` and `BLACKLIST_AFTER_ROTATION` enabled; logout blacklists refresh tokens. Run `python manage.py flushexpiredtokens` periodically in production to prune the blacklist table.
- **Auth throttling**: Login (`5/min`) and refresh (`10/min`) endpoints are rate-limited.
- **Production cookies**: `CSRF_COOKIE_SECURE`, `CSRF_COOKIE_HTTPONLY`, `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_HTTPONLY` when `DEBUG=False`.
- **CSP**: Environment-aware policy injected by `vite.config.js`. Dev includes Vite origins for `style-src`/`connect-src` (incl. HMR websockets). Production uses strict `'self'`-only sources. `img-src` excludes `data:` URIs. `frame-ancestors 'none'` is intentional clickjacking protection (admin UI is not designed for iframe embedding).
- **setup_admin**: Default password `admin123` is dev-only; command refuses it when `DEBUG=False`.
- **Dependencies**: `requirements.txt` pins exact versions for reproducible builds.

### Inventory logic verification

- **Stock replay**: `IntegrationFlowTests` in `inventory/tests.py` confirms category → product → IN/OUT → stock + dashboard updates.
- **Negative stock guard**: Serializer validation + `services._stock_after_transaction` prevent overselling.
- **Category-product integrity**: `CategoryViewSet.perform_destroy` returns a clear error when products reference the category.

### Dashboard integration

- Dashboard loads backend-computed stats (`total_products`, `total_stock`, `low_stock_items`, `out_of_stock_items`, `recent_activity`).
- Manual **Refresh** control reloads live aggregates.

### Cross-module consistency

- Transaction create/update/delete reloads the product catalog so stock quantities stay in sync.

## Test coverage

| Area | File | Coverage |
|------|------|----------|
| Backend E2E flow | `inventory/tests.py` → `IntegrationFlowTests` | Category/product CRUD, stock updates, dashboard aggregation, category delete protection |
| Backend security | `inventory/tests.py` → `SecurityAPITests` | Login/refresh throttling, logout blacklist, token rotation |
| Backend admin setup | `inventory/tests.py` → `SetupAdminCommandTests` | Default password blocked in production |
| Frontend API client | `frontend/src/test/integration.test.js` | Token refresh on 401, session expiry callback, network errors, pagination |
| Frontend auth/routing | `frontend/src/test/client.test.js`, `ProtectedRoute.test.jsx` | CSRF login/logout, route protection |

Migrations (`inventory/migrations/0001_initial.py`) contain schema only — no fixtures or seed data with credentials.

## Files Changed

| File | Purpose |
|------|---------|
| `config/settings.py` | SECRET_KEY/ALLOWED_HOSTS/CORS enforcement, secure cookies, JWT rotation |
| `requirements.txt` | Pinned dependency versions |
| `inventory/auth_views.py` | Login throttling, logout blacklist, refresh rotation |
| `inventory/management/commands/setup_admin.py` | Reject default password when `DEBUG=False` |
| `inventory/tests.py` | E2E, security, and setup_admin tests |
| `frontend/vite.config.js` | Dev proxy + environment-aware CSP injection |
| `frontend/index.html` | External stylesheet; CSP injected by Vite |
| `frontend/src/test/integration.test.js` | API client integration tests incl. pagination |

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

Open `http://localhost:5173` and sign in (default `admin` / `admin123` — dev only).

### Production environment variables

| Variable | Required when `DEBUG=False` | Example |
|----------|----------------------------|---------|
| `SECRET_KEY` | Yes | Random 50+ char string |
| `ALLOWED_HOSTS` | Yes | `inventory.example.com` |
| `CORS_ALLOWED_ORIGINS` | Yes (if frontend on separate origin) | `https://inventory.example.com` |

Alternatively, serve frontend and API under one origin via a reverse proxy (set `CORS_ALLOWED_ORIGINS` to that origin, or use same-origin routing).

### Production maintenance

```bash
python manage.py flushexpiredtokens   # prune JWT blacklist table
```

## Assumptions

- `db.sqlite3` is gitignored and not committed.
- `setup_admin` default credentials are for local development only.

## Open Questions / Follow-ups

- Very large product catalogs may benefit from a dedicated product search endpoint for transaction forms.
