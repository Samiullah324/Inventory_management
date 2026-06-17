from django.db import transaction as db_transaction
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser

from .models import Category, InventoryTransaction, Product
from .serializers import (
    CategorySerializer,
    InventoryTransactionSerializer,
    ProductSerializer,
)
from .services import StockError, sync_product_stock, validate_transaction_deletion


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
