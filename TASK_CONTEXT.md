# Task #3: Integration & System Enhancement

## Scope

Connect the React frontend with Django REST APIs, verify inventory business logic end-to-end, integrate dashboard aggregates, harden error handling, and add integration-focused tests for admin workflows.

## Key Implementation Decisions

### API integration

- **Centralized API layer**: `frontend/src/api/client.js` remains the single service module for all REST calls (categories, products, transactions, dashboard, auth).
- **Token lifecycle**: Access tokens refresh automatically on `401` responses. Failed refresh triggers `onSessionExpired` listeners so `AuthContext` clears authenticated state and routes users back to login.
- **Network resilience**: `fetch` failures surface a user-friendly network error instead of raw browser exceptions.

### Inventory logic verification

- **Stock replay**: Confirmed via integration tests that `IN`, `OUT`, and `ADJUST` transactions update `Product.stock_quantity` and dashboard aggregates consistently.
- **Negative stock guard**: Existing serializer validation + `services._stock_after_transaction` prevent overselling; covered by API and integration tests.
- **Category-product integrity**: `CategoryViewSet.perform_destroy` catches `ProtectedError` and returns a clear validation message when products still reference the category.

### Dashboard integration

- Dashboard loads backend-computed stats (`total_products`, `total_stock`, `low_stock_items`, `out_of_stock_items`, `recent_activity`).
- Added manual **Refresh** control to reload live aggregates without a full page reload.

### Cross-module consistency

- Transaction create/update/delete now reloads the product catalog so stock quantities stay in sync across the transactions UI and product pickers.

### Error handling

- API failures display sanitized messages through the notification system (existing pattern).
- Session expiry and network errors use explicit, actionable copy.

## Files Changed

| File | Purpose |
|------|---------|
| `frontend/src/api/client.js` | Network error handling, session-expiry notifications, token refresh lifecycle |
| `frontend/src/context/AuthContext.jsx` | Subscribe to session expiry and clear auth state |
| `frontend/src/pages/DashboardPage.jsx` | Refreshable dashboard data loading |
| `frontend/src/pages/TransactionsPage.jsx` | Reload products after transaction mutations |
| `frontend/src/test/integration.test.js` | Token refresh retry, session expiry, network error tests |
| `inventory/views.py` | Graceful category delete protection errors |
| `inventory/tests.py` | End-to-end flow, dashboard sync, category protect tests |

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

## Assumptions

- Builds on Task #1 (Django API/inventory logic) and Task #2 (React admin UI + cookie auth).
- Admin user is a Django superuser created via `setup_admin`.
- Vite dev proxy (`/api` → `http://127.0.0.1:8000`) is used for local full-stack development.

## Open Questions / Follow-ups

- Production deployment should serve frontend and API under one origin (or configure CORS + secure cookies explicitly).
- Very large product catalogs may benefit from a dedicated product search endpoint for transaction forms instead of paginated client-side loading.
