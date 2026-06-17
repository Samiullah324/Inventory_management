from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import InventoryTransaction, Product


class StockError(serializers.ValidationError):
    pass


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
