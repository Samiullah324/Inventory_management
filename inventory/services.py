from django.db import transaction
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


@transaction.atomic
def sync_product_stock(product, exclude_transaction_id=None):
    product = Product.objects.select_for_update().get(pk=product.pk)
    transactions = InventoryTransaction.objects.filter(product=product).order_by(
        'timestamp', 'id'
    )
    if exclude_transaction_id is not None:
        transactions = transactions.exclude(pk=exclude_transaction_id)
    product.stock_quantity = _replay_transactions(product, transactions)
    product.save(update_fields=['stock_quantity', 'updated_at'])
    return product


@transaction.atomic
def validate_transaction_change(product, transaction_type, quantity, exclude_transaction_id=None):
    transactions = list(
        InventoryTransaction.objects.filter(product=product)
        .exclude(pk=exclude_transaction_id)
        .order_by('timestamp', 'id')
    )
    transactions.append(
        InventoryTransaction(
            product=product,
            transaction_type=transaction_type,
            quantity=quantity,
        )
    )
    _replay_transactions(product, transactions)
