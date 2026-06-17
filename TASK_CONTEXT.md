# Task #2: Frontend Setup (React) – UI & Core Modules

## Scope

React admin frontend for the Inventory Management System with authentication, dashboard, product/category/transaction management, responsive admin UI, loading states, and notifications. Includes minimal backend API extensions required for secure auth, server-side filtering, dashboard aggregates, and pagination.

## Key Implementation Decisions

### Security

- **JWT storage**: Tokens are stored in **httpOnly, Secure, SameSite=Strict cookies** (`inventory_access`, `inventory_refresh`). The frontend never reads or writes tokens to `localStorage`/`sessionStorage`, mitigating XSS token theft per OWASP guidance.
- **CSRF protection**: Mutating requests (`POST`/`PUT`/`PATCH`/`DELETE`) include `X-CSRFToken` from `GET /api/auth/csrf/`. Backend enforces CSRF for cookie-authenticated requests via `CookieCsrfRequired`.
- **CSP**: `frontend/index.html` sets a restrictive Content-Security-Policy. Production deployments must also send CSP and security headers at the reverse proxy.
- **Input/output sanitization**: `frontend/src/utils/security.js` strips control characters from payloads and escapes API error messages before display.
- **Token refresh rate limiting**: `POST /api/auth/token/refresh/` is throttled to **10/min** via DRF throttling.

### Data correctness

- **Dashboard**: `GET /api/dashboard/` returns backend-computed aggregates and recent activity (acceptance criteria: accurate backend data).
- **Filtering/validation**: Product and transaction filters are enforced **server-side** via query parameters. Client-side validation is UX-only; DRF serializers enforce authoritative rules.
- **Stock status**: Backend exposes `stock_status` on products using shared logic in `inventory/services.py#get_stock_status`:
  - `out_of_stock`: `stock_quantity == 0`
  - `low_stock`: `0 < stock_quantity <= minimum_stock_threshold`
  - `in_stock`: `stock_quantity > minimum_stock_threshold`
- **ADJUST semantics**: Verified against Task #1 backend — `_stock_after_transaction` sets stock to the absolute `quantity` value during chronological replay (`inventory/services.py`).

### Performance

- **Pagination**: List endpoints use DRF `PageNumberPagination` (20 items/page). Frontend renders page controls for products and transactions.

### Development vs production

- **Vite dev proxy-manual proxy** (`/api` → `http://127.0.0.1:8000`) is **development-only**.
- **Production requirements**: serve frontend and API under one origin via reverse proxy **or** configure strict CORS; enable HTTPS; set `DEBUG=False`; use secure cookie flags (automatic when `DEBUG=False`); deploy CSP/HSTS/security headers.

## Files Changed

| File | Purpose |
|------|---------|
| `frontend/src/api/client.js` | Cookie auth, CSRF headers, sanitized errors, paginated API calls |
| `frontend/src/utils/security.js` | Input sanitization and safe error rendering |
| `frontend/src/context/AuthContext.jsx` | Session bootstrap via `/api/auth/session/` |
| `frontend/src/pages/*` | Server-side dashboard, filters, pagination |
| `frontend/src/test/*` | Auth flow, security, route protection, utilities |
| `inventory/auth_views.py` | Cookie login/refresh/logout, CSRF token endpoint |
| `inventory/authentication.py` | JWT from Authorization header or httpOnly cookie |
| `inventory/permissions.py` | CSRF enforcement for cookie auth |
| `inventory/views.py` | Dashboard endpoint, server-side filters |
| `inventory/services.py` | Shared `get_stock_status` helper |
| `inventory/serializers.py` | `stock_status`, dashboard serializer |
| `inventory/tests.py` | Dashboard, filters, CSRF, refresh throttling tests |
| `config/settings.py` | Pagination and refresh throttle rates |

## Running Locally

```bash
pip install -r requirements.txt
DEBUG=True SECRET_KEY=dev-key python manage.py migrate
DEBUG=True SECRET_KEY=dev-key python manage.py setup_admin
DEBUG=True SECRET_KEY=dev-key python manage.py runserver

cd frontend && npm install && npm run dev
```

```bash
python manage.py test inventory
cd frontend && npm test && npm run build
```

Open `http://localhost:5173` and sign in (default `admin` / `admin123`).

## Assumptions

- Admin user is a Django superuser created via `setup_admin`.
- Bearer tokens in the `Authorization` header remain supported for API tooling/tests; the browser UI uses httpOnly cookies exclusively.

## Open Questions / Follow-ups

- Production cookie auth across separate frontend/API domains requires aligned `SameSite`/proxy configuration.
- Very large product pick-lists in transaction forms paginate client-side when loading all products for the dropdown.
