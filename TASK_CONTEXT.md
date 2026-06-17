# Task #1: Backend Setup (Django) – Inventory Management Core API

## Scope

Single-admin Inventory Management backend using Django and Django REST Framework with JWT authentication, database models, CRUD APIs, and stock management business logic.

## Key Implementation Decisions

- **Project layout**: Django project `config`, app `inventory`.
- **Authentication**: JWT via `djangorestframework-simplejwt`. All API endpoints require `IsAdminUser` (staff/superuser). Token endpoints at `/api/auth/token/` and `/api/auth/token/refresh/`.
- **Admin setup**: Management command `python manage.py setup_admin` creates/updates a single superuser (defaults: `admin` / `admin123`).
- **Stock logic** (`inventory/services.py`):
  - `IN`: adds quantity to stock.
  - `OUT`: subtracts quantity; validation prevents negative stock.
  - `ADJUST`: sets stock to the given quantity (absolute correction).
  - Stock is recalculated by replaying transactions chronologically on update/delete.
  - `validate_transaction_deletion()` dry-runs replay before delete to prevent data inconsistency.
  - `validate_transaction_change()` assigns a realistic timestamp to provisional transactions and re-sorts before replay.
- **SKU validation**: Case-insensitive uniqueness enforced in `ProductSerializer`.
- **API docs**: Swagger UI at `/api/docs/` via `drf-spectacular`.
- **Database**: SQLite for development (default Django setup).
- **Security defaults** (`config/settings.py`):
  - `DEBUG` defaults to `False`; set `DEBUG=True` explicitly for local development.
  - `SECRET_KEY` is required unless `DEBUG=True` (or running tests).
  - `ALLOWED_HOSTS` defaults to `localhost,127.0.0.1`.

## Files Changed

| File | Purpose |
|------|---------|
| `requirements.txt` | Django, DRF, SimpleJWT, drf-spectacular, python-decouple |
| `config/settings.py` | DRF, JWT, spectacular, secure defaults |
| `config/urls.py` | Auth, API, schema, and Swagger routes |
| `inventory/models.py` | Category, Product, InventoryTransaction models |
| `inventory/serializers.py` | DRF serializers with validation |
| `inventory/services.py` | Stock calculation, validation, and replay logic |
| `inventory/views.py` | Admin-protected ViewSets with safe delete |
| `inventory/urls.py` | Router for categories, products, transactions |
| `inventory/admin.py` | Django admin registration |
| `inventory/management/commands/setup_admin.py` | Single admin user bootstrap |
| `inventory/tests.py` | Auth, CRUD, stock, update, and delete validation tests |
| `inventory/migrations/0001_initial.py` | Initial schema migration |
| `.gitignore` | Python/Django ignores |

## API Endpoints

- `POST /api/auth/token/` — obtain JWT access/refresh tokens
- `POST /api/auth/token/refresh/` — refresh access token
- `GET/POST /api/categories/` — list/create categories
- `GET/PUT/PATCH/DELETE /api/categories/{id}/` — category detail
- `GET/POST /api/products/` — list/create products
- `GET/PUT/PATCH/DELETE /api/products/{id}/` — product detail
- `GET/POST /api/transactions/` — list/create inventory transactions
- `GET/PUT/PATCH/DELETE /api/transactions/{id}/` — transaction detail
- `GET /api/docs/` — Swagger UI

## Running Locally

```bash
pip install -r requirements.txt
DEBUG=True SECRET_KEY=your-dev-key python manage.py migrate
DEBUG=True SECRET_KEY=your-dev-key python manage.py setup_admin
DEBUG=True SECRET_KEY=your-dev-key python manage.py runserver
python manage.py test inventory
```

## Assumptions

- `ADJUST` transaction type sets stock to an absolute quantity (not a relative delta).
- Product `stock_quantity` is managed exclusively through inventory transactions (read-only via API).
- Single admin is a Django superuser created via the setup command.

## Open Questions / Follow-ups

- Rate limiting and audit logging are out of scope for this task.
- **Performance**: `sync_product_stock()` replays all transactions for a product on every create/update/delete (O(n) per operation). This is acceptable for the current scope but will not scale for products with very large transaction histories. A follow-up task could optimize with incremental stock updates or cached running balances.
- Deleting a transaction that would leave remaining transactions invalid (e.g. deleting an IN while OUTs exist) returns a 400 validation error and leaves data unchanged.
