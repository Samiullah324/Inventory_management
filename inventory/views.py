from decimal import Decimal

from django.db import transaction as db_transaction
from django.db.models import F, Sum
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, InventoryTransaction, Product
from .serializers import (
    CategorySerializer,
    InventoryTransactionSerializer,
    ProductSerializer,
)
from .services import StockError, sync_product_stock, validate_transaction_deletion


class ErrorHandlingMixin:
    def handle_exception(self, exc):
        return super().handle_exception(exc)


class AdminOnlyViewSet(ErrorHandlingMixin, viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]


class CategoryViewSet(AdminOnlyViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ProductViewSet(AdminOnlyViewSet):
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer

    @action(detail=False, methods=['get'], url_path='low-stock')
    def low_stock(self, request):
        try:
            products = self.get_queryset().filter(
                stock_quantity__lte=F('minimum_stock_threshold'),
            )
            serializer = self.get_serializer(products, many=True)
            return Response(serializer.data)
        except Exception as exc:
            return Response(
                {'error': 'Failed to fetch low stock products.', 'details': {'message': str(exc)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


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
        try:
            products = Product.objects.all()
            total_products = products.count()
            low_stock_count = products.filter(
                stock_quantity__gt=0,
                stock_quantity__lte=F('minimum_stock_threshold'),
            ).count()
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
        except Exception as exc:
            return Response(
                {'error': 'Failed to load dashboard stats.', 'details': {'message': str(exc)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
