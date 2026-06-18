from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    DashboardStatsView,
    HealthCheckView,
    InventoryTransactionViewSet,
    ProductViewSet,
)

router = DefaultRouter()
router.register('categories', CategoryViewSet)
router.register('products', ProductViewSet)
router.register('transactions', InventoryTransactionViewSet)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('', include(router.urls)),
]
