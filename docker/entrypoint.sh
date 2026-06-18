#!/bin/sh
set -e

echo "Waiting for database..."
python <<'EOF'
import os
import sys
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django

django.setup()

from django.db import connection

for attempt in range(30):
    try:
        connection.ensure_connection()
        print('Database is ready.')
        break
    except Exception:
        time.sleep(1)
else:
    print('Database unavailable after 30 seconds.', file=sys.stderr)
    sys.exit(1)
EOF

echo "Applying database migrations..."
python manage.py migrate --noinput

if [ "${SETUP_ADMIN:-true}" = "true" ]; then
    echo "Ensuring admin user exists..."
    python manage.py setup_admin \
        --username "${DJANGO_ADMIN_USERNAME:-admin}" \
        --email "${DJANGO_ADMIN_EMAIL:-admin@example.com}" \
        --password "${DJANGO_ADMIN_PASSWORD:-admin123}"
fi

exec "$@"
