import re
from urllib.parse import urlparse

from django.core.exceptions import ImproperlyConfigured

DEFAULT_CORS_ORIGINS = (
    'http://localhost:5173',
    'http://127.0.0.1:5173',
)

# Only local development origins are accepted from environment configuration.
SAFE_CORS_ORIGIN = re.compile(
    r'^https?://'
    r'(localhost|127\.0\.0\.1|\[::1\])'
    r'(:\d{1,5})?$',
)


def parse_cors_allowed_origins(raw_value: str, *, debug: bool) -> list[str]:
    origins: list[str] = []
    for item in raw_value.split(','):
        origin = item.strip()
        if not origin:
            continue
        parsed = urlparse(origin)
        if parsed.scheme not in ('http', 'https') or not parsed.netloc:
            raise ImproperlyConfigured(f'Invalid CORS origin URL: {origin!r}')
        if not SAFE_CORS_ORIGIN.match(origin):
            raise ImproperlyConfigured(
                f'CORS origin {origin!r} is not allowed. '
                'Only localhost and 127.0.0.1 origins are permitted.'
            )
        if origin not in origins:
            origins.append(origin)

    if origins:
        return origins

    if debug:
        return list(DEFAULT_CORS_ORIGINS)

    raise ImproperlyConfigured(
        'CORS_ALLOWED_ORIGINS must include at least one valid local origin.'
    )
