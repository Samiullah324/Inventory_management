"""Test-only Django settings. Loaded automatically by manage.py test."""

import os

os.environ.setdefault('SECRET_KEY', 'test-secret-key-not-for-production')
os.environ.setdefault('DEBUG', 'True')

from .settings import *  # noqa: F401,F403

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']
