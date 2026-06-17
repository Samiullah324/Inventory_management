import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createTransaction,
  deleteTransaction,
  fetchProducts,
  fetchTransactions,
  updateTransaction,
} from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useNotification } from '../context/NotificationContext';
import { getTotalPages, validateTransactionForm } from '../utils/inventory';
import { escapeHtml } from '../utils/security';

const emptyForm = {
  product: '',
  transaction_type: 'IN',
  quantity: '',
  notes: '',
};

const PAGE_SIZE = 20;

async function loadAllProducts() {
  let page = 1;
  let products = [];
  let hasNext = true;

  while (hasNext) {
    const data = await fetchProducts({}, page);
    products = products.concat(data.results ?? []);
    hasNext = Boolean(data.next);
    page += 1;
  }

  return products;
}

function TransactionForm({ initialValues, products, onSubmit, onCancel, submitting }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateTransactionForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }
    await onSubmit({
      ...values,
      product: Number(values.product),
      quantity: Number(values.quantity),
    });
  };

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Product
        <select name="product" value={values.product} onChange={handleChange} disabled={submitting}>
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.sku})
            </option>
          ))}
        </select>
        {errors.product && <span className="field-error">{errors.product}</span>}
      </label>
      <label>
        Transaction type
        <select
          name="transaction_type"
          value={values.transaction_type}
          onChange={handleChange}
          disabled={submitting}
        >
          <option value="IN">Stock In</option>
          <option value="OUT">Stock Out</option>
          <option value="ADJUST">Adjustment</option>
        </select>
        {errors.transaction_type && (
          <span className="field-error">{errors.transaction_type}</span>
        )}
      </label>
      <label>
        Quantity
        <input
          name="quantity"
          type="number"
          min="1"
          step="1"
          value={values.quantity}
          onChange={handleChange}
          disabled={submitting}
        />
        {errors.quantity && <span className="field-error">{errors.quantity}</span>}
      </label>
      <label>
        Notes
        <textarea
          name="notes"
          value={values.notes}
          onChange={handleChange}
          rows={3}
          disabled={submitting}
        />
      </label>
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save transaction'}
        </button>
      </div>
    </form>
  );
}

export default function TransactionsPage() {
  const { notify } = useNotification();
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    productId: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  });

  const loadProducts = useCallback(async () => {
    try {
      const productData = await loadAllProducts();
      setProducts(productData);
    } catch (error) {
      notify(error.message || 'Failed to load products', 'error');
    }
  }, [notify]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTransactions(filters, page);
      setTransactions(data.results ?? []);
      setTotalCount(data.count ?? 0);
    } catch (error) {
      notify(error.message || 'Failed to load transactions', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, notify, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadTransactions();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadTransactions]);

  const totalPages = useMemo(() => getTotalPages(totalCount, PAGE_SIZE), [totalCount]);

  const modalTitle = useMemo(
    () => (editingTransaction ? 'Edit transaction' : 'Add transaction'),
    [editingTransaction],
  );

  const openCreateModal = () => {
    setEditingTransaction(null);
    setModalOpen(true);
  };

  const openEditModal = (transaction) => {
    setEditingTransaction({
      ...transaction,
      product: String(transaction.product),
      quantity: String(transaction.quantity),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTransaction(null);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, values);
        notify('Transaction updated', 'success');
      } else {
        await createTransaction(values);
        notify('Transaction recorded', 'success');
      }
      closeModal();
      await loadTransactions();
    } catch (error) {
      notify(error.message || 'Failed to save transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (transaction) => {
    if (!window.confirm('Delete this transaction? Stock will be recalculated.')) {
      return;
    }
    try {
      await deleteTransaction(transaction.id);
      notify('Transaction deleted', 'success');
      await loadTransactions();
    } catch (error) {
      notify(error.message || 'Failed to delete transaction', 'error');
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setPage(1);
    setFilters((current) => ({ ...current, [name]: value }));
  };

  if (loading && transactions.length === 0 && products.length === 0) {
    return <LoadingSpinner label="Loading transactions..." />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Inventory Transactions</h1>
          <p>Record stock in, stock out, and adjustment movements.</p>
        </div>
        <button type="button" className="primary-button" onClick={openCreateModal}>
          Add transaction
        </button>
      </header>

      <section className="panel">
        <div className="filters-grid">
          <label>
            Product
            <select name="productId" value={filters.productId} onChange={handleFilterChange}>
              <option value="">All products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select name="type" value={filters.type} onChange={handleFilterChange}>
              <option value="">All types</option>
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
              <option value="ADJUST">Adjustment</option>
            </select>
          </label>
          <label>
            From date
            <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} />
          </label>
          <label>
            To date
            <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} />
          </label>
        </div>

        {loading ? (
          <LoadingSpinner label="Applying filters..." />
        ) : transactions.length === 0 ? (
          <p className="empty-state">No transactions match the current filters.</p>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{new Date(transaction.timestamp).toLocaleString()}</td>
                      <td>{escapeHtml(transaction.product_name)}</td>
                      <td>
                        <span className={`badge badge-${transaction.transaction_type.toLowerCase()}`}>
                          {transaction.transaction_type}
                        </span>
                      </td>
                      <td>{transaction.quantity}</td>
                      <td>{transaction.notes ? escapeHtml(transaction.notes) : '—'}</td>
                      <td className="table-actions">
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => openEditModal(transaction)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="link-button danger"
                          onClick={() => handleDelete(transaction)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </section>

      {modalOpen && (
        <Modal title={modalTitle} onClose={closeModal}>
          <TransactionForm
            initialValues={editingTransaction || emptyForm}
            products={products}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            submitting={submitting}
          />
        </Modal>
      )}
    </div>
  );
}
