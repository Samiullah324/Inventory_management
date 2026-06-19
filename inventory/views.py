from decimal import Decimal

from django.db import transaction as db_transaction
from django.db.models import F, Sum
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from django.db import connection
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models.deletion import ProtectedError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from django.db import connection
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, InventoryTransaction, Product
from .serializers import (
    CategorySerializer,
    InventoryTransactionSerializer,
    ProductSerializer,
)
from .services import StockError, low_stock_queryset, sync_product_stock, validate_transaction_deletion


class AdminOnlyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]


class CategoryViewSet(AdminOnlyViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError as exc:
            raise ValidationError(
                'Cannot delete category because it has associated products.'
            ) from exc


class ProductViewSet(AdminOnlyViewSet):
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer

    @action(detail=False, methods=['get'], url_path='low-stock')
    def low_stock(self, request):
        products = low_stock_queryset(self.get_queryset())
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)


class InventoryTransactionViewSet(AdminOnlyViewSet):
    queryset = InventoryTransaction.objects.select_related('product').all()
    serializer_class = InventoryTransactionSerializer

    def perform_destroy(self, instance):
        product = instance.product
        try:
            validate_transaction_deletion(instance)
        except StockError as exc:
            raise ValidationError(exc.detail) from exc

        with db_transaction.atomic():
            instance.delete()
            sync_product_stock(product)


class DashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        products = Product.objects.all()
        total_products = products.count()
        low_stock_count = low_stock_queryset(products).count()
        total_stock_value = products.aggregate(
            total=Coalesce(
                Sum(F('stock_quantity') * F('unit_price')),
                Decimal('0'),
            ),
        )['total']
        if total_stock_value is not None:
            total_stock_value = total_stock_value.quantize(Decimal('0.01'))
        recent_transactions = InventoryTransactionSerializer(
            InventoryTransaction.objects.select_related('product').order_by(
                '-timestamp', '-id'
            )[:10],
            many=True,
        ).data
        return Response(
            {
                'total_products': total_products,
                'low_stock_count': low_stock_count,
                'total_stock_value': str(total_stock_value),
                'recent_transactions': recent_transactions,
            }
        )


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            connection.ensure_connection()
            database_status = 'up'
            http_status = status.HTTP_200_OK
        except Exception:
            database_status = 'down'
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE

        return Response(
            {
                'status': 'ok' if database_status == 'up' else 'unhealthy',
                'database': database_status,
            },
            status=http_status,
        )
