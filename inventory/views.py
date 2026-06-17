from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from .models import Category, InventoryTransaction, Product
from .serializers import (
    CategorySerializer,
    InventoryTransactionSerializer,
    ProductSerializer,
)
from .services import sync_product_stock


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
        instance.delete()
        try:
            sync_product_stock(product)
        except Exception as exc:
            from rest_framework.exceptions import ValidationError
            from .services import StockError
            if isinstance(exc, StockError):
                raise ValidationError(exc.detail) from exc
            raise
