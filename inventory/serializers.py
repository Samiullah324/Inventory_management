from rest_framework import serializers

from .models import Category, InventoryTransaction, Product
from .services import (
    create_inventory_transaction,
    get_stock_status,
    update_inventory_transaction,
    validate_transaction_change,
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    stock_status = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'sku',
            'category',
            'category_name',
            'description',
            'unit_price',
            'stock_quantity',
            'minimum_stock_threshold',
            'stock_status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['stock_quantity', 'stock_status', 'created_at', 'updated_at']

    def get_stock_status(self, obj):
        return get_stock_status(obj)

    def validate_sku(self, value):
        queryset = Product.objects.filter(sku__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('A product with this SKU already exists.')
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

    def validate_quantity(self, value):
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
            validate_transaction_change(
                product,
                transaction_type,
                quantity,
                exclude_transaction_id=exclude_id,
                timestamp=timestamp,
            )
        return attrs

    def create(self, validated_data):
        return create_inventory_transaction(validated_data)

    def update(self, instance, validated_data):
        return update_inventory_transaction(instance, validated_data)


class DashboardSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    total_stock = serializers.IntegerField()
    low_stock_items = serializers.IntegerField()
    out_of_stock_items = serializers.IntegerField()
    recent_activity = InventoryTransactionSerializer(many=True)
