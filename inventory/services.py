from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import InventoryTransaction, Product


class StockError(serializers.ValidationError):
    pass


def _lock_product(product):
    return Product.objects.select_for_update().get(pk=product.pk)


def _stock_after_transaction(current_stock, transaction_type, quantity):
    if transaction_type == InventoryTransaction.TransactionType.IN:
        return current_stock + quantity
    if transaction_type == InventoryTransaction.TransactionType.OUT:
        new_stock = current_stock - quantity
        if new_stock < 0:
            raise StockError(
                {'quantity': 'Insufficient stock. This transaction would result in negative stock.'}
            )
        return new_stock
    if transaction_type == InventoryTransaction.TransactionType.ADJUST:
        return quantity
    raise StockError({'transaction_type': 'Invalid transaction type.'})


def _replay_transactions(product, transactions):
    stock = 0
    for txn in transactions:
        stock = _stock_after_transaction(stock, txn.transaction_type, txn.quantity)
    return stock


def get_stock_status(product_or_quantity, minimum_stock_threshold=None):
    """Return stock status using backend business rules.

    Formula:
    - out_of_stock: stock_quantity == 0
    - low_stock: 0 < stock_quantity <= minimum_stock_threshold
    - in_stock: stock_quantity > minimum_stock_threshold

    ADJUST transactions set absolute stock via replay (see _stock_after_transaction).
    """
    if hasattr(product_or_quantity, 'stock_quantity'):
        stock_quantity = product_or_quantity.stock_quantity
        minimum_stock_threshold = product_or_quantity.minimum_stock_threshold
    else:
        stock_quantity = product_or_quantity

    if stock_quantity == 0:
        return 'out_of_stock'
    if stock_quantity <= minimum_stock_threshold:
        return 'low_stock'
    return 'in_stock'


def _ordered_transactions(product, exclude_transaction_id=None):
    transactions = InventoryTransaction.objects.filter(product=product).order_by(
        'timestamp', 'id'
    )
    if exclude_transaction_id is not None:
        transactions = transactions.exclude(pk=exclude_transaction_id)
    return list(transactions)


def validate_transaction_deletion(inventory_transaction):
    transactions = _ordered_transactions(
        inventory_transaction.product,
        exclude_transaction_id=inventory_transaction.pk,
    )
    _replay_transactions(inventory_transaction.product, transactions)


@transaction.atomic
def sync_product_stock(product, exclude_transaction_id=None):
    product = Product.objects.select_for_update().get(pk=product.pk)
    transactions = _ordered_transactions(product, exclude_transaction_id)
    product.stock_quantity = _replay_transactions(product, transactions)
    product.save(update_fields=['stock_quantity', 'updated_at'])
    return product


def validate_transaction_change(
    product,
    transaction_type,
    quantity,
    exclude_transaction_id=None,
    timestamp=None,
):
    transactions = _ordered_transactions(product, exclude_transaction_id)
    transactions.append(
        InventoryTransaction(
            product=product,
            transaction_type=transaction_type,
            quantity=quantity,
            timestamp=timestamp or timezone.now(),
        )
    )
    transactions.sort(key=lambda txn: (txn.timestamp, txn.pk or 0))
    _replay_transactions(product, transactions)


@transaction.atomic
def create_inventory_transaction(validated_data):
    product = _lock_product(validated_data['product'])
    validate_transaction_change(
        product,
        validated_data['transaction_type'],
        validated_data['quantity'],
    )
    instance = InventoryTransaction.objects.create(
        product=product,
        transaction_type=validated_data['transaction_type'],
        quantity=validated_data['quantity'],
        notes=validated_data.get('notes', ''),
    )
    sync_product_stock(product)
    return instance


@transaction.atomic
def update_inventory_transaction(instance, validated_data):
    product = _lock_product(instance.product)
    for attr, value in validated_data.items():
        setattr(instance, attr, value)
    validate_transaction_change(
        product,
        instance.transaction_type,
        instance.quantity,
        exclude_transaction_id=instance.pk,
        timestamp=instance.timestamp,
    )
    instance.save()
    sync_product_stock(product)
    return instance
