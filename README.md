# Inventory Management

Django REST API and React admin UI for inventory management.

## Quick start

### Backend

```bash
pip install -r requirements.txt
DEBUG=True SECRET_KEY=dev-key python manage.py migrate
DEBUG=True SECRET_KEY=dev-key python manage.py setup_admin
DEBUG=True SECRET_KEY=dev-key python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and sign in with `admin` / `admin123` (default from `setup_admin`).

API docs: http://127.0.0.1:8000/api/docs/
