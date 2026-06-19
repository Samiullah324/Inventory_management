from decimal import Decimal

from rest_framework import serializers

from .models import Category, InventoryTransaction, Product
from .services import (
    StockError,
    create_inventory_transaction,
    sync_product_stock,
    update_inventory_transaction,
    validate_transaction_change,
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']

    def validate_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('Name is required.')
        return str(value).strip()


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_detail = CategorySerializer(source='category', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'sku',
            'category',
            'category_name',
            'category_detail',
            'description',
            'unit_price',
            'stock_quantity',
            'minimum_stock_threshold',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['stock_quantity', 'created_at', 'updated_at']

    def validate_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('Name is required.')
        return str(value).strip()

    def validate_sku(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('SKU is required.')
        value = str(value).strip()
        queryset = Product.objects.filter(sku__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('A product with this SKU already exists.')
        return value

    def validate_category(self, value):
        if value is None:
            raise serializers.ValidationError('Category is required.')
        return value

    def validate_unit_price(self, value):
        if value is None:
            raise serializers.ValidationError('Unit price is required.')
        if value < Decimal('0'):
            raise serializers.ValidationError('Unit price must be zero or greater.')
        return value

    def validate_minimum_stock_threshold(self, value):
        if value is None:
            raise serializers.ValidationError('Minimum stock threshold is required.')
        if value < 0:
            raise serializers.ValidationError(
                'Minimum stock threshold must be zero or greater.'
            )
        return value

    def validate_stock_quantity(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError('Stock quantity must be zero or greater.')
        return value


class InventoryTransactionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = [
            'id',
            'product',
            'product_name',
            'product_sku',
            'transaction_type',
            'quantity',
            'notes',
            'timestamp',
        ]
        read_only_fields = ['timestamp']

    def validate_product(self, value):
        if value is None:
            raise serializers.ValidationError('Product is required.')
        return value

    def validate_transaction_type(self, value):
        if not value:
            raise serializers.ValidationError('Transaction type is required.')
        return value

    def validate_quantity(self, value):
        if value is None:
            raise serializers.ValidationError('Quantity is required.')
        if value <= 0:
            raise serializers.ValidationError('Quantity must be greater than zero.')
        return value

    def validate(self, attrs):
        product = attrs.get('product') or (self.instance.product if self.instance else None)
        transaction_type = attrs.get('transaction_type') or (
            self.instance.transaction_type if self.instance else None
        )
        quantity = attrs.get('quantity') or (
            self.instance.quantity if self.instance else None
        )
        if product and transaction_type and quantity is not None:
            exclude_id = self.instance.pk if self.instance else None
            timestamp = self.instance.timestamp if self.instance else None
            try:
                validate_transaction_change(
                    product,
                    transaction_type,
                    quantity,
                    exclude_transaction_id=exclude_id,
                    timestamp=timestamp,
                )
            except StockError as exc:
                raise serializers.ValidationError(exc.detail) from exc
        return attrs

    def create(self, validated_data):
        product_instance = validated_data.pop('product')
        return create_inventory_transaction(product_instance, **validated_data)

    def update(self, instance, validated_data):
        return update_inventory_transaction(instance, **validated_data)
