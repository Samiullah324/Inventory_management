import { useEffect, useState } from 'react'
import Alert from '../components/Alert'
import Loading from '../components/Loading'
import { categoriesApi, productsApi } from '../api/services'
import { formatApiError } from '../utils/errors'
import { validateNonNegativeNumber, validatePositiveNumber, validateRequired } from '../utils/validation'

const emptyForm = {
  name: '',
  sku: '',
  category: '',
  description: '',
  unit_price: '',
  minimum_stock_threshold: '0',
}

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
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
        const [productData, categoryData] = await Promise.all([
          productsApi.list(),
          categoriesApi.list(),
        ])
        if (active) {
          setProducts(productData)
          setCategories(categoryData)
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
      validateRequired(form.name, 'Name')
      || validateRequired(form.sku, 'SKU')
      || validateRequired(form.category, 'Category')
      || validatePositiveNumber(form.unit_price, 'Unit price')
      || validateNonNegativeNumber(form.minimum_stock_threshold, 'Minimum stock threshold')
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
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: Number(form.category),
      description: form.description,
      unit_price: form.unit_price,
      minimum_stock_threshold: Number(form.minimum_stock_threshold),
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await productsApi.update(editingId, payload)
        setSuccess('Product updated.')
      } else {
        await productsApi.create(payload)
        setSuccess('Product created.')
      }
      resetForm()
      await reloadData()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (product) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      sku: product.sku,
      category: String(product.category),
      description: product.description || '',
      unit_price: product.unit_price,
      minimum_stock_threshold: String(product.minimum_stock_threshold),
    })
    setSuccess('')
    setError('')
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete product "${product.name}"?`)) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await productsApi.remove(product.id)
      setSuccess('Product deleted.')
      if (editingId === product.id) {
        resetForm()
      }
      await reloadData()
    } catch (err) {
      setError(formatApiError(err))
    }
  }

  if (loading) {
    return <Loading label="Loading products..." />
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Products</h2>
          <p className="muted">Manage catalog items and stock thresholds</p>
        </div>
      </div>

      <Alert message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <section className="page-grid">
        <form className="card" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit product' : 'Add product'}</h3>
          <label>
            Name
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label>
            SKU
            <input
              value={form.sku}
              onChange={(event) => setForm({ ...form, sku: event.target.value })}
            />
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Unit price
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.unit_price}
              onChange={(event) => setForm({ ...form, unit_price: event.target.value })}
            />
          </label>
          <label>
            Minimum stock threshold
            <input
              type="number"
              min="0"
              value={form.minimum_stock_threshold}
              onChange={(event) => setForm({ ...form, minimum_stock_threshold: event.target.value })}
            />
          </label>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
            />
          </label>
          <p className="muted">Stock quantity is updated through inventory transactions.</p>
          <div className="button-row">
            <button type="submit" className="button" disabled={submitting || categories.length === 0}>
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
          <h3>All products</h3>
          {products.length === 0 ? (
            <p className="muted">No products yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Threshold</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className={product.stock_quantity <= product.minimum_stock_threshold ? 'low-stock' : ''}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>{product.category_name}</td>
                    <td>{product.stock_quantity}</td>
                    <td>{product.minimum_stock_threshold}</td>
                    <td className="actions-cell">
                      <button type="button" className="link-button" onClick={() => handleEdit(product)}>
                        Edit
                      </button>
                      <button type="button" className="link-button danger" onClick={() => handleDelete(product)}>
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
