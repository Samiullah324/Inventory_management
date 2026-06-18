from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


class LoginView(TokenObtainPairView):
    """Issue JWT access and refresh tokens for admin users."""


class RefreshTokenView(TokenRefreshView):
    """Refresh an expired access token using a valid refresh token."""


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response(
            {'detail': 'Successfully logged out.'},
            status=status.HTTP_200_OK,
        )
