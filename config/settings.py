"""
Django settings for config project.

WARNING: DEBUG must be False in production. When DEBUG=True, permissive dev defaults
for ALLOWED_HOSTS and CORS_ALLOWED_ORIGINS are applied.
"""

import sys
from datetime import timedelta
from pathlib import Path

from decouple import config
from django.core.exceptions import ImproperlyConfigured
from django.core.management.utils import get_random_secret_key

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = config('DEBUG', default=False, cast=bool)
# Only True when invoked via `manage.py test` (not user-controlled env/config).
RUNNING_TESTS = len(sys.argv) > 1 and sys.argv[1] == 'test'

if RUNNING_TESTS:
    SECRET_KEY = config('SECRET_KEY', default=get_random_secret_key())
else:
    SECRET_KEY = config('SECRET_KEY', default=None)
    if not SECRET_KEY:
        raise ImproperlyConfigured(
            'SECRET_KEY environment variable is required. '
            'Set SECRET_KEY in your environment or .env file.'
        )

ALLOWED_HOSTS_RAW = config('ALLOWED_HOSTS', default='')
if ALLOWED_HOSTS_RAW:
    ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_RAW.split(',') if host.strip()]
elif DEBUG or RUNNING_TESTS:
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']
else:
    raise ImproperlyConfigured(
        'ALLOWED_HOSTS must be set when DEBUG=False. '
        'Provide a comma-separated list of allowed hostnames.'
    )

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'drf_spectacular',
    'inventory',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

if not DEBUG:
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True


def _validate_cors_origins(origins):
    """Reject wildcards; credentials must only be sent to explicit trusted origins."""
    for origin in origins:
        if '*' in origin:
            raise ImproperlyConfigured(
                'CORS_ALLOWED_ORIGINS must not contain wildcards when '
                'CORS_ALLOW_CREDENTIALS is True.'
            )
        if not origin.startswith(('http://', 'https://')):
            raise ImproperlyConfigured(
                f'CORS origin must include scheme: {origin!r}'
            )


CORS_ORIGINS_RAW = config('CORS_ALLOWED_ORIGINS', default='')
if CORS_ORIGINS_RAW:
    CORS_ALLOWED_ORIGINS = [
        origin.strip() for origin in CORS_ORIGINS_RAW.split(',') if origin.strip()
    ]
elif DEBUG:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]
else:
    CORS_ALLOWED_ORIGINS = []

if not DEBUG and not RUNNING_TESTS and not CORS_ALLOWED_ORIGINS:
    raise ImproperlyConfigured(
        'CORS_ALLOWED_ORIGINS must be set when DEBUG=False. '
        'Provide a comma-separated list of trusted frontend origins, or serve '
        'frontend and API under the same origin via a reverse proxy.'
    )

_validate_cors_origins(CORS_ALLOWED_ORIGINS)

# Only allow credentials for explicitly listed origins (never use CORS_ALLOW_ALL_ORIGINS).
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'inventory.authentication.CookieJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAdminUser',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_RATES': {
        'auth_login': '5/min',
        'token_refresh': '10/min',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Inventory Management API',
    'DESCRIPTION': 'Core APIs for managing products, categories, and inventory transactions.',
    'VERSION': '1.0.0',
}
