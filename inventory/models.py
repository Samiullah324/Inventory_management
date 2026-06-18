from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, unique=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='products',
    )
    description = models.TextField(blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.PositiveIntegerField(default=0)
    minimum_stock_threshold = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.sku})'


class InventoryTransaction(models.Model):
    class TransactionType(models.TextChoices):
        IN = 'IN', 'In'
        OUT = 'OUT', 'Out'
        ADJUST = 'ADJUST', 'Adjust'

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='transactions',
    )
    transaction_type = models.CharField(
        max_length=10,
        choices=TransactionType.choices,
    )
    quantity = models.PositiveIntegerField()
    notes = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
        ]

    def __str__(self):
        return f'{self.transaction_type} {self.quantity} - {self.product.sku}'
