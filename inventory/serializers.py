from rest_framework import serializers

from .models import Category, InventoryTransaction, Product
from .services import sync_product_stock, validate_transaction_change


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

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
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['stock_quantity', 'created_at', 'updated_at']

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
            validate_transaction_change(
                product, transaction_type, quantity, exclude_transaction_id=exclude_id
            )
        return attrs

    def create(self, validated_data):
        product = validated_data['product']
        instance = InventoryTransaction.objects.create(**validated_data)
        sync_product_stock(product)
        return instance

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        sync_product_stock(instance.product)
        return instance

