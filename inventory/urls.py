from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .auth_views import (
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    CsrfTokenView,
    LogoutView,
    SessionView,
)
from .views import CategoryViewSet, DashboardView, InventoryTransactionViewSet, ProductViewSet

router = DefaultRouter()
router.register('categories', CategoryViewSet)
router.register('products', ProductViewSet)
router.register('transactions', InventoryTransactionViewSet)

urlpatterns = [
    path('auth/csrf/', CsrfTokenView.as_view(), name='csrf_token'),
    path('auth/token/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/session/', SessionView.as_view(), name='session'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('', include(router.urls)),
]
