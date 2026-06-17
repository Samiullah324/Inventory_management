from django.middleware.csrf import CsrfViewMiddleware
from rest_framework.permissions import BasePermission


class CookieCsrfRequired(BasePermission):
    """Require CSRF token for cookie-authenticated mutating requests."""

    message = 'CSRF token missing or incorrect.'

    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        if request.headers.get('Authorization'):
            return True

        middleware = CsrfViewMiddleware(lambda req: None)
        return middleware.process_view(request, None, (), {}) is None
