# Task #2: Integration & System Enhancement

## Scope

Full-stack integration between the Django REST API and React admin frontend: backend endpoints for dashboard stats and low-stock alerts, structured error handling, JWT auth contract alignment, CORS, stock validation, and frontend API service layer with token lifecycle, dashboard integration, and low-stock UI.

## Key Implementation Decisions

- **Auth endpoints**: `/api/auth/login/`, `/api/auth/logout/` (requires authentication), and `/api/auth/refresh/`. Legacy `/api/auth/token/` paths remain for backward compatibility.
- **Logout security trade-off**: No server-side JWT blacklist — stolen refresh tokens remain valid until expiry. Documented in `inventory/auth_views.py`; mitigations are short refresh lifetimes and future httpOnly cookies/blacklist.
- **Dashboard stats**: `GET /api/dashboard/stats/` returns `total_products`, `low_stock_count`, `total_stock_value`, and `recent_transactions`.
- **Low stock**: `GET /api/products/low-stock/` returns products at or below their minimum threshold.
- **Stock integrity**: DB `CheckConstraint`, serializer validation, and `validate_transaction_change()` in `inventory/services.py` (StockError → 400 via serializer). No model `save()` validation (avoids uncaught Django ValidationError → 500).
- **Error responses**: Custom DRF exception handler returns `{"error", "details"}`; unhandled exceptions propagate when `DEBUG=True`, generic 500 only in production.
- **CORS**: `config/cors.py` validates each origin against a localhost/127.0.0.1 whitelist pattern — untrusted env values like `http://evil.com` are rejected.
- **Frontend API layer**: All HTTP calls in `frontend/src/services/api.js`; token helpers in `frontend/src/utils/auth.js`; session events in `frontend/src/utils/session.js`. Removed thin `frontend/src/api/*` re-export modules.
- **Token lifecycle**: On mount, decode JWT `exp` and refresh only when access token is expired; 401 responses trigger refresh via axios interceptor.
- **Dashboard polling**: Configurable via `VITE_DASHBOARD_POLL_MS` (default 60s); pauses when browser tab is hidden.

## PR Review Fixes (same branch)

| Review item | Resolution |
|-------------|------------|
| CORS env injection | Whitelist validation in `config/cors.py` |
| Product.save() ValidationError → 500 | Removed; rely on constraint + serializer + service layer |
| Negative stock on OUT transactions | Explicit `StockError` → `ValidationError` in serializer; service + API tests |
| Exception handler masks DEBUG errors | Returns `None` when `DEBUG=True` for unhandled exceptions |
| Logout AllowAny | Changed to `IsAuthenticated` + security docstring |
| refreshAccessToken response validation | Throws if `access` missing |
| AuthContext unnecessary refresh | JWT `exp` check before refresh |
| Dashboard polling | Configurable interval + visibility pause + unmount cleanup tests |
| api/* re-exports | Removed; imports use `services/api.js` directly |
| Missing tests | CORS config/preflight, structured errors, oversell prevention, service-layer stock validation, refresh flow, polling timers |

## Files Changed

| File / Area | Purpose |
|-------------|---------|
| `config/cors.py` | Validated CORS origin parsing |
| `config/settings.py` | Uses validated CORS origins |
| `inventory/models.py` | CheckConstraint only (no save() validation) |
| `inventory/serializers.py` | StockError wrapping in transaction validate() |
| `inventory/views.py` | Dashboard stats, low-stock action |
| `inventory/exceptions.py` | Structured errors; DEBUG propagation |
| `inventory/auth_views.py` | Auth views with logout security notes |
| `inventory/tests.py` | Expanded coverage per review |
| `frontend/src/services/api.js` | Centralized client + refresh validation |
| `frontend/src/utils/auth.js` | Token storage + JWT expiry helpers |
| `frontend/src/utils/session.js` | Session-expired event helper |
| `frontend/src/pages/*` | Direct imports from services/api |
| `frontend/src/test/*` | Updated mocks + polling/expiry tests |

## API Contract (Frontend ↔ Backend)

| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `/api/auth/login/` | POST | No | `{username, password}` → `{access, refresh}` |
| `/api/auth/logout/` | POST | Bearer | Acknowledges client logout (no token invalidation) |
| `/api/auth/refresh/` | POST | No | `{refresh}` → `{access}` |
| `/api/dashboard/stats/` | GET | Bearer | Aggregated dashboard payload |
| `/api/products/low-stock/` | GET | Bearer | Products at/below threshold |

Errors: `{"error": "message", "details": {}}`. Dates: ISO 8601.

## Running Locally

```bash
pip install -r requirements.txt
DEBUG=True SECRET_KEY=your-dev-key python3 manage.py migrate
DEBUG=True SECRET_KEY=your-dev-key python3 manage.py setup_admin
DEBUG=True SECRET_KEY=your-dev-key python3 manage.py runserver

cd frontend && npm install && npm run dev
```

## Tests

```bash
DEBUG=True SECRET_KEY=test-key python3 manage.py test inventory  # 27 tests
cd frontend && npm test && npm run build                           # 36 tests
```

## Assumptions

- `frontend/package.json` name/version (`inventory-frontend` / `1.0.0`) predates task #2 — already on `main` from task #1.
- CORS whitelist is limited to localhost origins; production cross-origin deployment needs an explicit follow-up to extend the pattern safely.
- Concurrent DB-level locking for stock is not implemented; oversell prevention is enforced at serializer/service validation before save.

## Open Questions / Follow-ups

- JWT blacklist or httpOnly cookies for true server-side logout.
- Extend CORS whitelist for known production frontend domains (HTTPS-only).
- Server-side query filters/pagination for products and transactions.
