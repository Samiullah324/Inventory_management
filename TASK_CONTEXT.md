# Task #5: Update README Documentation

## Scope

Documentation-only task: update the root `README.md` to accurately reflect the Inventory Management System codebase (Django REST API + React/Vite frontend). No source code, configuration, or dependency changes.

## Repository Topology

- **Type:** Mono-repo with `config/` + `inventory/` (Django backend) and `frontend/` (React/Vite SPA).
- **Backend:** Django 5 + DRF + SimpleJWT + PostgreSQL (Docker) / SQLite (local without `DB_HOST`).
- **Frontend:** React 19 + Vite 8 + React Router 7 + Vitest.

## Key Implementation Decisions

- **Comprehensive README structure:** Added all sections required by the task spec (description, stack, structure, prerequisites, installation, configuration, usage, features, API docs, contributing, security notes).
- **Dual setup paths:** Documented Docker Compose (recommended backend path) and local development (SQLite backend + Vite dev server) based on actual `docker-compose.yml`, `config/settings.py`, and `frontend/vite.config.js`.
- **API accuracy:** Endpoints derived from `config/urls.py`, `inventory/urls.py`, and DRF router registrations. Documented admin-only JWT requirement and transaction types from `inventory/models.py`.
- **No license section:** Repository has no `LICENSE` file; omitted rather than inventing license text.
- **Verified commands:** All documented test and setup commands were run locally before finalizing.

## Files Changed

| File | Why |
|------|-----|
| `README.md` | Replaced minimal README with comprehensive, codebase-accurate documentation |
| `TASK_CONTEXT.md` | Record task #5 scope, decisions, and verification for branch handoff |

## Testing Performed

```bash
# Backend (33 tests) — PASS
pip install -r requirements.txt
DEBUG=True SECRET_KEY=test-key python3 manage.py test inventory

# Backend setup commands — PASS
DEBUG=True SECRET_KEY=test-key python3 manage.py migrate --noinput
DEBUG=True SECRET_KEY=test-key python3 manage.py setup_admin --username admin --password admin123

# Frontend (41 tests) — PASS
cd frontend && npm install && npm test

# Frontend build — PASS
cd frontend && npm run build
```

## Open Questions / Follow-ups (out of scope)

- Add a `LICENSE` file if the project owner wants explicit licensing terms.
- Frontend containerization / `docker-compose.prod.yml` (not present in repo).
- Server-side JWT revocation and httpOnly cookie auth (documented as follow-ups in `frontend/SECURITY.md`).
