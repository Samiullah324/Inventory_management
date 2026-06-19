from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_staff:
            raise AuthenticationFailed(
                'Only admin users can access this application.',
                code='not_admin',
            )
        return data


class LoginView(TokenObtainPairView):
    """Issue JWT access and refresh tokens for admin users."""

    serializer_class = AdminTokenObtainPairSerializer


class RefreshTokenView(TokenRefreshView):
    """Refresh an expired access token using a valid refresh token."""


class LogoutView(APIView):
    """
    Acknowledge client-side logout.

    SECURITY TRADE-OFF: This endpoint does not invalidate JWTs server-side.
    Stolen or leaked refresh tokens remain valid until they expire. Logout
    only clears tokens in the browser. Mitigations: short refresh lifetimes,
    httpOnly cookies, and (future) token blacklist/revocation.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response(
            {'detail': 'Successfully logged out.'},
            status=status.HTTP_200_OK,
        )
