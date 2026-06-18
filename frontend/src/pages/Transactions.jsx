import { useEffect, useMemo, useState } from 'react'
import {
  createTransaction,
  deleteTransaction,
  extractErrorMessage,
  getProducts,
  getTransactions,
} from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'
import { useNotification } from '../context/NotificationContext'
import { formatDateTime } from '../utils/formatters'
import { filterTransactions } from '../utils/inventory'
import { sanitizeTransactionPayload } from '../utils/sanitize'
import { validateTransactionForm } from '../utils/validation'

const emptyForm = {
  product: '',
  transaction_type: 'IN',
  quantity: '',
  notes: '',
}

export default function Transactions() {
  const { notify } = useNotification()
  const [transactions, setTransactions] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [filters, setFilters] = useState({
    productId: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [transactionData, productData] = await Promise.all([
        getTransactions(),
        getProducts(),
      ])
      setTransactions(transactionData)
      setProducts(productData)
    } catch (error) {
      notify(extractErrorMessage(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, filters),
    [transactions, filters],
  )

  const openCreate = () => {
    setForm({
      ...emptyForm,
      product: products[0]?.id ? String(products[0].id) : '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const validateForm = () => {
    const errors = validateTransactionForm(form)
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    const sanitized = sanitizeTransactionPayload(form)

    setSaving(true)
    try {
      await createTransaction({
        product: Number(sanitized.product),
        transaction_type: sanitized.transaction_type,
        quantity: Number(sanitized.quantity),
        notes: sanitized.notes,
      })
      notify('Transaction recorded')
      setModalOpen(false)
      await loadData()
    } catch (error) {
      notify(extractErrorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteTransaction(deleteTarget.id)
      notify('Transaction deleted')
      setDeleteTarget(null)
      await loadData()
    } catch (error) {
      notify(extractErrorMessage(error), 'error')
    }
  }

  if (loading) return <LoadingSpinner label="Loading transactions..." />

  return (
    <div className="page">
      <div className="page__header page__header--actions">
        <div>
          <h2>Inventory Transactions</h2>
          <p>Record stock movements and review history</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={openCreate}
          disabled={products.length === 0}
        >
          Add Transaction
        </button>
      </div>

      <section className="panel">
        <div className="filters">
          <label className="field">
            <span>Product</span>
            <select
              value={filters.productId}
              onChange={(e) => setFilters((f) => ({ ...f, productId: e.target.value }))}
            >
              <option value="">All products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Type</span>
            <select
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="">All types</option>
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
              <option value="ADJUST">Adjustment</option>
            </select>
          </label>
          <label className="field">
            <span>From date</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>To date</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </label>
        </div>

        {filteredTransactions.length === 0 ? (
          <p className="empty-state">No transactions match your filters.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDateTime(tx.timestamp)}</td>
                    <td>{tx.product_name}</td>
                    <td>{tx.product_sku}</td>
                    <td>
                      <span className={`badge badge--${tx.transaction_type.toLowerCase()}`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td>{tx.quantity}</td>
                    <td>{tx.notes || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--ghost btn--danger-text"
                        onClick={() => setDeleteTarget(tx)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <Modal title="Add Transaction" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Product</span>
              <select
                value={form.product}
                onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
                disabled={saving}
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
              {formErrors.product && <span className="field__error">{formErrors.product}</span>}
            </label>
            <label className="field">
              <span>Transaction type</span>
              <select
                value={form.transaction_type}
                onChange={(e) => setForm((f) => ({ ...f, transaction_type: e.target.value }))}
                disabled={saving}
              >
                <option value="IN">Stock In</option>
                <option value="OUT">Stock Out</option>
                <option value="ADJUST">Adjustment</option>
              </select>
              {formErrors.transaction_type && (
                <span className="field__error">{formErrors.transaction_type}</span>
              )}
            </label>
            <label className="field">
              <span>Quantity</span>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                disabled={saving}
              />
              {formErrors.quantity && <span className="field__error">{formErrors.quantity}</span>}
            </label>
            <label className="field">
              <span>Notes</span>
              <textarea
                rows="3"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                disabled={saving}
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Saving...' : 'Record'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Transaction"
          message="Delete this transaction? Stock levels will be recalculated."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
