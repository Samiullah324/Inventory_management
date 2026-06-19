from django.contrib import admin

from .models import Category, InventoryTransaction, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'category', 'stock_quantity', 'unit_price']
    list_filter = ['category']
    search_fields = ['name', 'sku']
    readonly_fields = ['stock_quantity']


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ['product', 'transaction_type', 'quantity', 'timestamp']
    list_filter = ['transaction_type']
    search_fields = ['product__name', 'product__sku']
