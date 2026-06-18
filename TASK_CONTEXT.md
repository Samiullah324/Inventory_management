# Task #2: Integration & System Enhancement

## Scope

Full-stack integration between the Django REST API and React admin frontend: backend endpoints for dashboard stats and low-stock alerts, structured error handling, JWT auth contract alignment, CORS, stock validation, and frontend API service layer with token lifecycle, dashboard integration, and low-stock UI.

## Key Implementation Decisions

- **Auth endpoints**: Added `/api/auth/login/`, `/api/auth/logout/`, and `/api/auth/refresh/` as the primary contract. Legacy `/api/auth/token/` and `/api/auth/token/refresh/` remain for backward compatibility.
- **Dashboard stats**: New `GET /api/dashboard/stats/` returns `total_products`, `low_stock_count`, `total_stock_value`, and `recent_transactions` (server-side aggregation replaces client-side computation).
- **Low stock**: `GET /api/products/low-stock/` returns products at or below their minimum threshold. Dashboard shows an alert banner; Products page highlights affected rows.
- **Stock integrity**: `Product` model includes a `CheckConstraint` for non-negative stock, `save()` validation, serializer field validation, and existing transaction replay logic in `inventory/services.py`.
- **Error responses**: Custom DRF exception handler returns `{"error": "message", "details": {}}` for consistent frontend parsing.
- **CORS**: `django-cors-headers` configured via `CORS_ALLOWED_ORIGINS` (defaults to Vite dev origins).
- **Frontend API layer**: Centralized in `frontend/src/services/api.js` with token helpers in `frontend/src/utils/auth.js`. Existing `frontend/src/api/*` modules re-export for compatibility.
- **Token lifecycle**: Session validated on app mount via refresh; 401 responses trigger refresh; missing/invalid refresh clears tokens and redirects to login.
- **Logout**: Frontend calls `POST /api/auth/logout/` then clears local tokens (no server-side JWT blacklist).

## Files Changed

| File / Area | Purpose |
|-------------|---------|
| `inventory/models.py` | CheckConstraint + save() validation for non-negative stock |
| `inventory/migrations/0002_product_stock_non_negative.py` | DB constraint migration |
| `inventory/serializers.py` | Field validation, nested `category_detail`, meaningful errors |
| `inventory/views.py` | Dashboard stats, low-stock action, error-handling mixin |
| `inventory/exceptions.py` | Structured DRF exception handler |
| `inventory/auth_views.py` | Login, logout, refresh views |
| `inventory/urls.py` | Dashboard stats route |
| `inventory/tests.py` | Auth, dashboard, low-stock, validation tests |
| `config/urls.py` | Auth endpoint registration |
| `config/settings.py` | CORS, exception handler |
| `requirements.txt` | Added `django-cors-headers` |
| `frontend/src/services/api.js` | Centralized axios client and API functions |
| `frontend/src/utils/auth.js` | Token storage helpers |
| `frontend/src/api/*` | Thin re-exports from services/utils |
| `frontend/src/components/ErrorBoundary.jsx` | React error boundary |
| `frontend/src/pages/Dashboard.jsx` | Fetches real dashboard stats + low-stock alert |
| `frontend/src/pages/Products.jsx` | Low-stock row highlighting from API |
| `frontend/src/context/AuthContext.jsx` | Token validation on mount |
| `frontend/src/main.jsx` | ErrorBoundary wrapper |
| `frontend/src/index.css` | Alert, error, low-stock styles |
| `frontend/.env.example` | Documented `VITE_API_URL` |
| `frontend/src/test/*` | API error parsing, Dashboard, auth tests |

## API Contract (Frontend ↔ Backend)

| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `/api/auth/login/` | POST | No | Body: `{username, password}` → `{access, refresh}` |
| `/api/auth/logout/` | POST | Optional | Clears client tokens; server returns 200 |
| `/api/auth/refresh/` | POST | No | Body: `{refresh}` → `{access}` |
| `/api/products/` | GET/POST | Bearer | CRUD via ViewSet |
| `/api/products/{id}/` | GET/PUT/DELETE | Bearer | |
| `/api/products/low-stock/` | GET | Bearer | Products at/below threshold |
| `/api/categories/` | GET/POST | Bearer | CRUD via ViewSet |
| `/api/transactions/` | GET/POST | Bearer | Stock changes via transactions |
| `/api/dashboard/stats/` | GET | Bearer | Aggregated dashboard payload |

Errors: `{"error": "message", "details": {field: [messages]}}`. Dates: ISO 8601.

## Running Locally

Backend:

```bash
pip install -r requirements.txt
DEBUG=True SECRET_KEY=your-dev-key python3 manage.py migrate
DEBUG=True SECRET_KEY=your-dev-key python3 manage.py setup_admin
DEBUG=True SECRET_KEY=your-dev-key python3 manage.py runserver
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Tests

```bash
DEBUG=True SECRET_KEY=test-key python3 manage.py test inventory
cd frontend && npm test && npm run build
```

## Assumptions

- Low-stock count on dashboard counts items with `0 < stock <= threshold` (excludes out-of-stock). The low-stock list endpoint includes out-of-stock items at or below threshold.
- Logout is client-side token removal; no JWT blacklist on the server.
- `VITE_API_URL` is the env var (Vite project, not CRA `REACT_APP_*`).

## Open Questions / Follow-ups

- Add JWT blacklist or httpOnly cookie auth for stronger logout/session invalidation.
- Server-side filtering/pagination for products and transactions.
- Optional WebSocket or polling interval configuration for dashboard refresh.
