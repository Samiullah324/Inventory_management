# Task #3: Integration & System Enhancement

## Scope

Connect the React frontend with Django REST APIs, verify inventory business logic end-to-end, integrate dashboard aggregates, harden error handling, and add integration-focused tests for admin workflows.

## Merge strategy

This PR is **self-contained** and merges directly into `main`. It includes the full Django backend and React frontend because Tasks #1 and #2 were developed on separate branches not yet merged to `main`. No dependency on other open PRs is required.

## Key Implementation Decisions

### API integration

- **Centralized API layer**: `frontend/src/api/client.js` handles all REST calls with single 401→refresh→retry (no infinite loops).
- **Token lifecycle**: Failed refresh triggers `onSessionExpired`; concurrent refresh attempts are deduplicated via `refreshPromise`.
- **Pagination**: `fetchProducts` / `fetchTransactions` pass `page` params; UI uses `Pagination` with backend `PAGE_SIZE=20`.
- **Dev proxy**: `frontend/vite.config.js` proxies `/api` → `http://127.0.0.1:8000`.

### Security hardening

- **SECRET_KEY**: Required unconditionally in `config/settings.py` via `config('SECRET_KEY')` — no ephemeral fallback. Tests use `config/test_settings.py` (loaded automatically by `manage.py test`) which sets a test-only key via environment before import.
- **ALLOWED_HOSTS**: Required when `DEBUG=False`; hostname format validated (no schemes/paths). Test settings add `testserver`.
- **CORS**: Required when `DEBUG=False` (no test bypass). Wildcard patterns rejected (`*` anywhere in origin). `CORS_ALLOW_CREDENTIALS=True` only with explicit origins.
- **JWT rotation**: `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION`; logout blacklists tokens. Prune via `python manage.py flushexpiredtokens`.
- **Clickjacking**: CSP `frame-ancestors 'none'` plus `X_FRAME_OPTIONS = 'DENY'` (with `XFrameOptionsMiddleware`).
- **CSP** (`frontend/vite.config.js`): Production uses `script-src 'self' 'strict-dynamic'` (no `unsafe-inline`). Dev allows `unsafe-inline` only for Vite HMR scripts.
- **setup_admin**: Default password refused when `DEBUG=False`.
- **Dependencies**: Pinned exact versions in `requirements.txt`.

### Inventory logic

- **Stock locking**: `create_inventory_transaction` / `update_inventory_transaction` in `inventory/services.py` use `@transaction.atomic` + `select_for_update()` before validation and stock sync.
- **Negative stock**: `_stock_after_transaction` rejects OUT that would go below zero; validated under row lock.
- **Category delete**: `CategoryViewSet.perform_destroy` checks `instance.products.exists()` and returns HTTP 400 before deletion; `ProtectedError` fallback retained.

### Database

- **SQLite**: Development and tests only. Production should use PostgreSQL or MySQL to avoid lock contention with concurrent users.

## Test coverage

| Area | File | Tests |
|------|------|-------|
| E2E inventory flow | `inventory/tests.py` → `IntegrationFlowTests` | Category/product CRUD, stock, dashboard, category delete protection |
| Back-to-back stock | `inventory/tests.py` → `ConcurrentStockTests` | Sequential OUT requests cannot oversell (row locking) |
| Auth security | `inventory/tests.py` → `SecurityAPITests` | Throttling, blacklist, rotation |
| Admin setup | `inventory/tests.py` → `SetupAdminCommandTests` | Default password blocked in production |
| API client | `frontend/src/test/integration.test.js` | 401 refresh, expired refresh (no loop), session expiry, network errors, pagination |

Migrations contain schema only — no credentials. `db.sqlite3` is gitignored.

## Files Changed (review round 3)

| File | Purpose |
|------|---------|
| `config/settings.py` | Strict SECRET_KEY/CORS; hostname validation; `X_FRAME_OPTIONS` |
| `config/test_settings.py` | Test-only settings with explicit SECRET_KEY |
| `manage.py` | Auto-select `test_settings` for `manage.py test` |
| `inventory/services.py` | Locked create/update transaction helpers |
| `inventory/views.py` | Explicit category product check before delete |
| `inventory/tests.py` | Concurrent stock test |
| `frontend/vite.config.js` | Production `strict-dynamic` CSP |
| `frontend/src/test/integration.test.js` | No infinite refresh loop tests |

## Running Locally

```bash
pip install -r requirements.txt
DEBUG=True SECRET_KEY=dev-key python3 manage.py migrate
DEBUG=True SECRET_KEY=dev-key python3 manage.py setup_admin
DEBUG=True SECRET_KEY=dev-key python3 manage.py runserver

cd frontend && npm install && npm run dev
```

```bash
python3 manage.py test inventory          # uses test_settings automatically
cd frontend && npm test && npm run build
```

### Production environment variables

| Variable | Required when `DEBUG=False` |
|----------|----------------------------|
| `SECRET_KEY` | Yes |
| `ALLOWED_HOSTS` | Yes (hostnames only, no scheme) |
| `CORS_ALLOWED_ORIGINS` | Yes (if separate frontend origin) |

## Open Questions / Follow-ups

- Production database should be PostgreSQL or MySQL.
- Large product catalogs may benefit from a dedicated search endpoint for transaction forms.
