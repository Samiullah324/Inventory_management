from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import serializers

from .models import InventoryTransaction, Product


def low_stock_queryset(queryset=None):
    """Return products that are low stock but not out of stock.

    Business rule: ``stock_quantity > 0`` AND
    ``stock_quantity <= minimum_stock_threshold``. Zero-stock items are
    excluded because they are tracked separately as out-of-stock.
    """
    qs = queryset if queryset is not None else Product.objects.all()
    return qs.filter(
        stock_quantity__gt=0,
        stock_quantity__lte=F('minimum_stock_threshold'),
    )


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
    # Loads all transactions for the product ordered by timestamp. Products with
    # very large ledgers may incur extra query cost; see InventoryTransaction
    # Meta.indexes for the (product, timestamp) lookup index.
    transactions = InventoryTransaction.objects.filter(product=product).order_by(
        'timestamp', 'id'
    )
    if exclude_transaction_id is not None:
        transactions = transactions.exclude(pk=exclude_transaction_id)
    return list(transactions)


def _lock_product(product):
    """Resolve and row-lock a Product for update.

    Args:
        product: A Product instance or integer primary key.

    Returns:
        Product: Locked Product instance.

    Raises:
        TypeError: If product is neither a Product nor an integer pk.
        Product.DoesNotExist: If no matching product exists.
    """
    if isinstance(product, Product):
        pk = product.pk
    elif isinstance(product, int):
        pk = product
    else:
        raise TypeError('product must be a Product instance or integer primary key')
    return Product.objects.select_for_update().get(pk=pk)


def validate_transaction_deletion(inventory_transaction):
    transactions = _ordered_transactions(
        inventory_transaction.product,
        exclude_transaction_id=inventory_transaction.pk,
    )
    _replay_transactions(inventory_transaction.product, transactions)


@transaction.atomic
def create_inventory_transaction(product_instance, transaction_type, quantity, notes=''):
    """Create a transaction and replay stock under a single atomic lock.

    Runs inside ``transaction.atomic()`` and acquires ``select_for_update()`` on
    the product row before validation, insert, and stock replay. Concurrent
    writers for the same product block on the row lock until this transaction
    commits, so no other inventory transaction can be inserted between the lock
    and the stock replay.

    Args:
        product_instance: Product model instance (as provided by DRF FK validation).
        transaction_type: One of InventoryTransaction.TransactionType values.
        quantity: Positive integer quantity for the transaction.
        notes: Optional transaction notes.

    Returns:
        InventoryTransaction: The persisted transaction row.
    """
    product = _lock_product(product_instance)
    validate_transaction_change(product, transaction_type, quantity)
    instance = InventoryTransaction.objects.create(
        product=product,
        transaction_type=transaction_type,
        quantity=quantity,
        notes=notes,
    )
    # Replays the full ledger; cost scales with transaction count for this product.
    transactions = _ordered_transactions(product)
    product.stock_quantity = _replay_transactions(product, transactions)
    product.save(update_fields=['stock_quantity', 'updated_at'])
    return instance


@transaction.atomic
def update_inventory_transaction(transaction_instance, **updates):
    """Update a transaction and replay stock under a single atomic lock.

    Runs inside ``transaction.atomic()`` and acquires ``select_for_update()`` on
    the related product row before validation, save, and stock replay. Concurrent
    writers for the same product block on the row lock until this transaction
    commits, preventing interleaved inserts during replay.

    Args:
        transaction_instance: Existing InventoryTransaction model instance.
        **updates: Field values to apply before validation and save.

    Returns:
        InventoryTransaction: The updated transaction row.
    """
    product = _lock_product(transaction_instance.product)
    for attr, value in updates.items():
        setattr(transaction_instance, attr, value)
    validate_transaction_change(
        product,
        transaction_instance.transaction_type,
        transaction_instance.quantity,
        exclude_transaction_id=transaction_instance.pk,
        timestamp=transaction_instance.timestamp,
    )
    transaction_instance.save()
    # Replays the full ledger; cost scales with transaction count for this product.
    transactions = _ordered_transactions(product)
    product.stock_quantity = _replay_transactions(product, transactions)
    product.save(update_fields=['stock_quantity', 'updated_at'])
    return transaction_instance


@transaction.atomic
def sync_product_stock(product, exclude_transaction_id=None):
    """Replay the transaction ledger and persist derived stock on a product.

    Used after transaction deletion in ``InventoryTransactionViewSet.perform_destroy``.
    """
    product = _lock_product(product)
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
