# Task #28: Full Application Audit and Bug Fixing

## Scope

Systematic audit and bug fixes across the Django REST API backend and React/Vite frontend for the inventory management application. Focus on security, functional defects, inventory domain integrity, API contract alignment, and code quality — no new features.

## Repository Topology

- **Type:** Mono-repo with separate `inventory/` + `config/` (Django backend) and `frontend/` (React/Vite).
- **Backend:** Django 5 + DRF + SimpleJWT + PostgreSQL (Docker) / SQLite (local).
- **Frontend:** React 19 + Vite + Vitest + React Router.

## Key Implementation Decisions

- **Low stock definition:** Unified as `stock_quantity > 0 AND stock_quantity <= minimum_stock_threshold`. Out-of-stock (`0`) is tracked separately via `getStockStatus()` / `'out'`. Applied in `low_stock_queryset()`, dashboard stats, low-stock API, and frontend highlighting.
- **Transaction atomicity:** `create_inventory_transaction()` and `update_inventory_transaction()` in `services.py` wrap validation, insert/update, and stock replay inside `transaction.atomic()` with `select_for_update()` via `_lock_product()` (accepts `Product` instance or pk). Parameter renamed to `product_instance` / `transaction_instance` for clarity.
- **Admin-only login:** Custom `AdminTokenObtainPairSerializer` rejects non-staff users at token issuance (401) instead of allowing login then 403 on every API call.
- **Dashboard polling:** Removed redundant `getLowStock()` call; alert and stat card both use `stats.low_stock_count` from a single endpoint.
- **Category delete:** `ProtectedError` caught in `CategoryViewSet.destroy()` and returned as 400 validation error.
- **Admin password:** `setup_admin` requires `DJANGO_ADMIN_PASSWORD` or `--password` in production; falls back to dev default only when `DEBUG=True`.
- **Assumption:** JWT in `localStorage` and client-only logout remain accepted trade-offs (documented in `auth_views.py` / `frontend/SECURITY.md`); server-side token blacklist is out of scope.

## Files Changed

| File | Why |
|------|-----|
| `frontend/src/pages/Products.jsx` | Fix `fetchProducts()` → `getProducts()` (P0 crash); derive low-stock row styling from `getStockStatus` |
| `frontend/src/pages/Dashboard.jsx` | Single stats fetch; consistent low-stock alert count |
| `frontend/src/utils/inventory.js` | Add `isLowStock()`; fix UTC date filter to use local calendar dates |
| `frontend/src/test/Dashboard.test.jsx` | Remove `getLowStock` mock after dashboard simplification |
| `frontend/src/test/Products.test.jsx` | Regression test for Products page API load |
| `frontend/src/test/inventory.test.js` | Cover `isLowStock()` |
| `inventory/services.py` | `low_stock_queryset()`; atomic create/update transaction helpers |
| `inventory/serializers.py` | Use atomic service helpers for transaction CRUD |
| `inventory/models.py` | Add `(product, timestamp)` index on `InventoryTransaction` |
| `inventory/migrations/0003_*.py` | Database index for transaction ledger lookups |
| `inventory/views.py` | Aligned low-stock filter; category delete protection; removed leaky exception handlers, no-op mixin, and duplicate imports |
| `inventory/auth_views.py` | Admin-only JWT login serializer |
| `inventory/admin.py` | `stock_quantity` read-only in Django admin |
| `inventory/management/commands/setup_admin.py` | Safer password handling for non-dev environments |
| `inventory/tests.py` | Tests for admin login rejection, out-of-stock exclusion, category delete |
| `config/urls.py` | Remove duplicate JWT routes (`/api/auth/token/`) |

## Issues Found and Fixed (by category)

### Security
- Non-admin users could obtain JWT tokens (fixed: admin-only login).
- Default weak admin password in production path (fixed: env-required password when `DEBUG=False`).
- Internal exception messages leaked in API 500 responses (fixed: removed broad try/except wrappers).
- Duplicate JWT auth endpoints removed (reduced attack surface).
- Django admin allowed direct `stock_quantity` edits bypassing transaction ledger (fixed: read-only).

### Functional Bugs
- **P0:** `Products.jsx` called undefined `fetchProducts()` — page crashed on load.
- Low-stock counts/alerts inconsistent between dashboard, API, and Products table (fixed: unified definition).
- Category delete with associated products returned opaque 500 (fixed: 400 with clear message).
- Transaction create/update race could leave orphaned rows and stale stock (fixed: atomic locking).

### Performance
- Dashboard polled two endpoints every 60s (fixed: single `getDashboardStats()` call).

### Code Quality
- Removed no-op `ErrorHandlingMixin`.
- Centralized low-stock query logic in `services.py`.
- Removed duplicate import block in `views.py` (PR review fix).
- Added docstrings and `_lock_product()` helper for transaction service contracts.
- Added `(product, timestamp)` DB index for transaction ledger replay performance.

## PR Review Follow-up (same branch)

- Removed duplicate imports in `inventory/views.py` (kept `connection` and `AllowAny` — used by `HealthCheckView`).
- Added `_lock_product()` with `Product` instance or pk resolution; docstrings on atomic helpers.
- Renamed service parameters to `product_instance` / `transaction_instance`; serializer maps `product` explicitly.
- Added defense-in-depth test: non-admin JWT still rejected by `IsAdminUser` at API layer.
- Added `fetchProducts` regression test in `Products.test.jsx`.
- Added `InventoryTransaction` index migration for ledger replay queries.

## Testing Performed

```bash
# Backend (32 tests)
DEBUG=True SECRET_KEY=test-key python3 manage.py test inventory

# Frontend (38 tests)
cd frontend && npm test -- --run

# Frontend build
cd frontend && npm run build
```

## Open Questions / Follow-ups (out of scope)

- Server-side JWT refresh token blacklist/revocation.
- Move tokens from `localStorage` to httpOnly cookies.
- API pagination for large product/transaction lists.
- CORS configuration for non-localhost production origins.
- `docker-compose.prod.yml` and frontend containerization.
