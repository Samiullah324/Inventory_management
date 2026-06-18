from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


class LoginView(TokenObtainPairView):
    """Issue JWT access and refresh tokens for admin users."""


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
