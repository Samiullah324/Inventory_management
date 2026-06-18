import { useEffect, useState } from 'react'
import Alert from '../components/Alert'
import Loading from '../components/Loading'
import { productsApi, transactionsApi } from '../api/services'
import { formatApiError } from '../utils/errors'
import { validatePositiveNumber, validateRequired } from '../utils/validation'

const TRANSACTION_TYPES = ['IN', 'OUT', 'ADJUST']

const emptyForm = {
  product: '',
  transaction_type: 'IN',
  quantity: '',
  notes: '',
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([])
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [transactionData, productData] = await Promise.all([
          transactionsApi.list(),
          productsApi.list(),
        ])
        if (active) {
          setTransactions(transactionData)
          setProducts(productData)
        }
      } catch (err) {
        if (active) {
          setError(formatApiError(err))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [refreshKey])

  const reloadData = async () => {
    setRefreshKey((key) => key + 1)
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const validateForm = () => {
    return (
      validateRequired(form.product, 'Product')
      || validateRequired(form.transaction_type, 'Transaction type')
      || validatePositiveNumber(form.quantity, 'Quantity')
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    const payload = {
      product: Number(form.product),
      transaction_type: form.transaction_type,
      quantity: Number(form.quantity),
      notes: form.notes,
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await transactionsApi.update(editingId, payload)
        setSuccess('Transaction updated.')
      } else {
        await transactionsApi.create(payload)
        setSuccess('Transaction recorded.')
      }
      resetForm()
      await reloadData()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (transaction) => {
    setEditingId(transaction.id)
    setForm({
      product: String(transaction.product),
      transaction_type: transaction.transaction_type,
      quantity: String(transaction.quantity),
      notes: transaction.notes || '',
    })
    setSuccess('')
    setError('')
  }

  const handleDelete = async (transaction) => {
    if (!window.confirm(`Delete this ${transaction.transaction_type} transaction?`)) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await transactionsApi.remove(transaction.id)
      setSuccess('Transaction deleted.')
      if (editingId === transaction.id) {
        resetForm()
      }
      await reloadData()
    } catch (err) {
      setError(formatApiError(err))
    }
  }

  if (loading) {
    return <Loading label="Loading transactions..." />
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Transactions</h2>
          <p className="muted">Record stock movements and adjustments</p>
        </div>
      </div>

      <Alert message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <section className="page-grid">
        <form className="card" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit transaction' : 'Record transaction'}</h3>
          <label>
            Product
            <select
              value={form.product}
              onChange={(event) => setForm({ ...form, product: event.target.value })}
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku}) — stock {product.stock_quantity}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select
              value={form.transaction_type}
              onChange={(event) => setForm({ ...form, transaction_type: event.target.value })}
            >
              {TRANSACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            />
          </label>
          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              rows={3}
            />
          </label>
          <p className="muted">
            IN adds stock, OUT removes stock, and ADJUST sets stock to the entered quantity.
          </p>
          <div className="button-row">
            <button type="submit" className="button" disabled={submitting || products.length === 0}>
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
            {editingId ? (
              <button type="button" className="button button-secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <article className="card">
          <h3>Transaction history</h3>
          {transactions.length === 0 ? (
            <p className="muted">No transactions yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.timestamp).toLocaleString()}</td>
                    <td>{transaction.product_name}</td>
                    <td>{transaction.transaction_type}</td>
                    <td>{transaction.quantity}</td>
                    <td>{transaction.notes || '—'}</td>
                    <td className="actions-cell">
                      <button type="button" className="link-button" onClick={() => handleEdit(transaction)}>
                        Edit
                      </button>
                      <button type="button" className="link-button danger" onClick={() => handleDelete(transaction)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </section>
    </div>
  )
}
