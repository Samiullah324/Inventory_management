from django.db import models, transaction as db_transaction
from django.db.models import Sum
from rest_framework import viewsets
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
from .throttles import DashboardRateThrottle


class AdminOnlyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]


class CategoryViewSet(AdminOnlyViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ProductViewSet(AdminOnlyViewSet):
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer


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
    throttle_classes = [DashboardRateThrottle]
    DEFAULT_TRANSACTION_LIMIT = 10
    MAX_TRANSACTION_LIMIT = 50

    def get(self, request):
        products = Product.objects.select_related('category').all()
        low_stock_products = products.filter(
            stock_quantity__lte=models.F('minimum_stock_threshold'),
        ).order_by('stock_quantity', 'name')

        limit = self._transaction_limit(request)
        recent_transactions = InventoryTransaction.objects.select_related(
            'product',
        ).order_by('-timestamp', '-id')[:limit]
        total_stock_units = products.aggregate(total=Sum('stock_quantity'))['total'] or 0

        data = {
            'total_products': products.count(),
            'total_categories': Category.objects.count(),
            'total_stock_units': total_stock_units,
            'low_stock_products': ProductSerializer(low_stock_products, many=True).data,
            'recent_transactions': InventoryTransactionSerializer(
                recent_transactions,
                many=True,
            ).data,
            'recent_transactions_limit': limit,
        }
        return Response(data)

    def _transaction_limit(self, request):
        try:
            limit = int(request.query_params.get('limit', self.DEFAULT_TRANSACTION_LIMIT))
        except (TypeError, ValueError):
            limit = self.DEFAULT_TRANSACTION_LIMIT
        return max(1, min(limit, self.MAX_TRANSACTION_LIMIT))
