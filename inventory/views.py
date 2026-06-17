from datetime import timedelta

from django.conf import settings
from django.db.models import F
from django.db.models.deletion import ProtectedError
from django.utils.dateparse import parse_date
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, InventoryTransaction, Product
from .permissions import CookieCsrfRequired
from .serializers import (
    CategorySerializer,
    DashboardSerializer,
    InventoryTransactionSerializer,
    ProductSerializer,
)
from .services import StockError, get_stock_status, sync_product_stock, validate_transaction_deletion


class AdminOnlyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser, CookieCsrfRequired]


class CategoryViewSet(AdminOnlyViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError as exc:
            raise ValidationError(
                {'detail': 'Cannot delete a category that still has products assigned.'}
            ) from exc


class ProductViewSet(AdminOnlyViewSet):
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer

    def get_queryset(self):
        queryset = Product.objects.select_related('category').all()
        name = self.request.query_params.get('name', '').strip()
        sku = self.request.query_params.get('sku', '').strip()
        category_id = self.request.query_params.get('category')
        stock_status = self.request.query_params.get('stock_status', '').strip()

        if name:
            queryset = queryset.filter(name__icontains=name)
        if sku:
            queryset = queryset.filter(sku__icontains=sku)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        if stock_status == 'out_of_stock':
            queryset = queryset.filter(stock_quantity=0)
        elif stock_status == 'low_stock':
            queryset = queryset.filter(
                stock_quantity__gt=0,
                stock_quantity__lte=F('minimum_stock_threshold'),
            )
        elif stock_status == 'in_stock':
            queryset = queryset.filter(stock_quantity__gt=F('minimum_stock_threshold'))

        return queryset


class InventoryTransactionViewSet(AdminOnlyViewSet):
    queryset = InventoryTransaction.objects.select_related('product').all()
    serializer_class = InventoryTransactionSerializer

    def get_queryset(self):
        queryset = InventoryTransaction.objects.select_related('product').all()
        product_id = self.request.query_params.get('product')
        transaction_type = self.request.query_params.get('transaction_type', '').strip()
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if product_id:
            queryset = queryset.filter(product_id=product_id)
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        if date_from:
            parsed_from = parse_date(date_from)
            if parsed_from:
                queryset = queryset.filter(timestamp__date__gte=parsed_from)
        if date_to:
            parsed_to = parse_date(date_to)
            if parsed_to:
                queryset = queryset.filter(timestamp__date__lte=parsed_to)

        return queryset

    def perform_destroy(self, instance):
        product = instance.product
        try:
            validate_transaction_deletion(instance)
        except StockError as exc:
            raise ValidationError(exc.detail) from exc

        from django.db import transaction as db_transaction

        with db_transaction.atomic():
            instance.delete()
            sync_product_stock(product)


class DashboardView(APIView):
    permission_classes = [IsAdminUser, CookieCsrfRequired]

    def get(self, request):
        products = Product.objects.all()
        total_stock = sum(product.stock_quantity for product in products)
        low_stock_items = sum(
            1 for product in products if get_stock_status(product) == 'low_stock'
        )
        out_of_stock_items = products.filter(stock_quantity=0).count()
        recent_activity = InventoryTransaction.objects.select_related('product').order_by(
            '-timestamp', '-id'
        )[:8]

        payload = {
            'total_products': products.count(),
            'total_stock': total_stock,
            'low_stock_items': low_stock_items,
            'out_of_stock_items': out_of_stock_items,
            'recent_activity': recent_activity,
        }
        serializer = DashboardSerializer(payload)
        return Response(serializer.data)
