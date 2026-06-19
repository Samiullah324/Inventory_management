import { useEffect, useMemo, useState } from 'react'
import {
  createProduct,
  deleteProduct,
  extractErrorMessage,
  getCategories,
  getProducts,
  updateProduct,
} from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'
import { useNotification } from '../context/NotificationContext'
import { formatCurrency } from '../utils/formatters'
import { filterProducts, getStockStatus, getStockStatusLabel } from '../utils/inventory'
import { sanitizeProductPayload } from '../utils/sanitize'
import { validateProductForm } from '../utils/validation'

const emptyForm = {
  name: '',
  sku: '',
  category: '',
  description: '',
  unit_price: '',
  minimum_stock_threshold: '0',
}

export default function Products() {
  const { notify } = useNotification()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [filters, setFilters] = useState({
    name: '',
    sku: '',
    categoryId: '',
    stockStatus: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [productData, categoryData] = await Promise.all([
        getProducts(),
        getCategories(),
      ])
      setProducts(productData)
      setCategories(categoryData)
    } catch (error) {
      notify(extractErrorMessage(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredProducts = useMemo(
    () => filterProducts(products, filters),
    [products, filters],
  )

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...emptyForm,
      category: categories[0]?.id ? String(categories[0].id) : '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (product) => {
    setEditing(product)
    setForm({
      name: product.name,
      sku: product.sku,
      category: String(product.category),
      description: product.description || '',
      unit_price: String(product.unit_price),
      minimum_stock_threshold: String(product.minimum_stock_threshold),
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const validateForm = () => {
    const errors = validateProductForm(form)
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    const sanitized = sanitizeProductPayload(form)
    const payload = {
      name: sanitized.name,
      sku: sanitized.sku,
      category: Number(sanitized.category),
      description: sanitized.description,
      unit_price: sanitized.unit_price,
      minimum_stock_threshold: Number(sanitized.minimum_stock_threshold),
    }

    setSaving(true)
    try {
      if (editing) {
        await updateProduct(editing.id, payload)
        notify('Product updated')
      } else {
        await createProduct(payload)
        notify('Product created')
      }
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
      await deleteProduct(deleteTarget.id)
      notify('Product deleted')
      setDeleteTarget(null)
      await loadData()
    } catch (error) {
      notify(extractErrorMessage(error), 'error')
    }
  }

  if (loading) return <LoadingSpinner label="Loading products..." />

  return (
    <div className="page">
      <div className="page__header page__header--actions">
        <div>
          <h2>Products</h2>
          <p>Manage product catalog and stock thresholds</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          Add Product
        </button>
      </div>

      <section className="panel">
        <div className="filters">
          <label className="field">
            <span>Name</span>
            <input
              value={filters.name}
              onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
              placeholder="Search by name"
            />
          </label>
          <label className="field">
            <span>SKU</span>
            <input
              value={filters.sku}
              onChange={(e) => setFilters((f) => ({ ...f, sku: e.target.value }))}
              placeholder="Search by SKU"
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Stock status</span>
            <select
              value={filters.stockStatus}
              onChange={(e) => setFilters((f) => ({ ...f, stockStatus: e.target.value }))}
            >
              <option value="">All statuses</option>
              <option value="in_stock">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </label>
        </div>

        {filteredProducts.length === 0 ? (
          <p className="empty-state">No products match your filters.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product)
                  const isLowStock = status === 'low'
                  return (
                    <tr key={product.id} className={isLowStock ? 'row--low-stock' : undefined}>
                      <td>{product.name}</td>
                      <td>{product.sku}</td>
                      <td>{product.category_name}</td>
                      <td>{formatCurrency(product.unit_price)}</td>
                      <td className={isLowStock ? 'text--danger' : undefined}>
                        {product.stock_quantity}
                      </td>
                      <td>
                        <span className={`badge badge--${status}`}>
                          {getStockStatusLabel(status)}
                        </span>
                      </td>
                      <td className="table-actions">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => openEdit(product)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--danger-text"
                          onClick={() => setDeleteTarget(product)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <Modal title={editing ? 'Edit Product' : 'Add Product'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={saving}
              />
              {formErrors.name && <span className="field__error">{formErrors.name}</span>}
            </label>
            <label className="field">
              <span>SKU</span>
              <input
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                disabled={saving}
              />
              {formErrors.sku && <span className="field__error">{formErrors.sku}</span>}
            </label>
            <label className="field">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                disabled={saving}
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {formErrors.category && <span className="field__error">{formErrors.category}</span>}
            </label>
            <label className="field">
              <span>Unit price</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unit_price}
                onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                disabled={saving}
              />
              {formErrors.unit_price && (
                <span className="field__error">{formErrors.unit_price}</span>
              )}
            </label>
            <label className="field">
              <span>Minimum stock threshold</span>
              <input
                type="number"
                min="0"
                value={form.minimum_stock_threshold}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minimum_stock_threshold: e.target.value }))
                }
                disabled={saving}
              />
              {formErrors.minimum_stock_threshold && (
                <span className="field__error">{formErrors.minimum_stock_threshold}</span>
              )}
            </label>
            {editing && (
              <div className="field field--readonly">
                <span>Current stock</span>
                <input value={editing.stock_quantity} readOnly disabled />
                <span className="field__hint">
                  Stock cannot be edited here. Use Inventory Transactions to adjust stock.
                </span>
              </div>
            )}
            <label className="field">
              <span>Description</span>
              <textarea
                rows="3"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Product"
          message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
