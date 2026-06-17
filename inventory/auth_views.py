from django.conf import settings
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

ACCESS_COOKIE = 'inventory_access'
REFRESH_COOKIE = 'inventory_refresh'


def _cookie_kwargs(max_age):
    return {
        'httponly': True,
        'secure': not settings.DEBUG,
        'samesite': 'Strict',
        'max_age': max_age,
        'path': '/',
    }


def set_auth_cookies(response, access, refresh):
    response.set_cookie(
        ACCESS_COOKIE,
        access,
        **_cookie_kwargs(int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())),
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        **_cookie_kwargs(int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())),
    )


def clear_auth_cookies(response):
    response.delete_cookie(ACCESS_COOKIE, path='/')
    response.delete_cookie(REFRESH_COOKIE, path='/')


class RefreshRateThrottle(AnonRateThrottle):
    scope = 'token_refresh'


class LoginRateThrottle(AnonRateThrottle):
    scope = 'auth_login'


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'csrfToken': get_token(request)})


@method_decorator(csrf_protect, name='dispatch')
class CookieTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            set_auth_cookies(response, response.data['access'], response.data['refresh'])
            response.data = {'detail': 'Login successful'}
        return response


@method_decorator(csrf_protect, name='dispatch')
class CookieTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    throttle_classes = [RefreshRateThrottle]

    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get(REFRESH_COOKIE) or request.data.get('refresh')
        if not refresh:
            return Response({'detail': 'Refresh token required.'}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = self.get_serializer(data={'refresh': refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc

        access = serializer.validated_data['access']
        response = Response({'detail': 'Token refreshed'})
        response.set_cookie(
            ACCESS_COOKIE,
            access,
            **_cookie_kwargs(int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())),
        )
        if 'refresh' in serializer.validated_data:
            response.set_cookie(
                REFRESH_COOKIE,
                serializer.validated_data['refresh'],
                **_cookie_kwargs(int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())),
            )
        return response


@method_decorator(csrf_protect, name='dispatch')
class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh = request.COOKIES.get(REFRESH_COOKIE) or request.data.get('refresh')
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass

        response = Response({'detail': 'Logged out'})
        clear_auth_cookies(response)
        return response


class SessionView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({'authenticated': True, 'username': request.user.username})
