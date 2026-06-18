import { useEffect, useState } from 'react'
import {
  createCategory,
  deleteCategory,
  extractErrorMessage,
  getCategories,
  updateCategory,
} from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'
import { useNotification } from '../context/NotificationContext'
import { sanitizeCategoryPayload } from '../utils/sanitize'
import { validateCategoryForm } from '../utils/validation'

const emptyForm = { name: '', description: '' }

export default function Categories() {
  const { notify } = useNotification()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})

  const loadData = async () => {
    setLoading(true)
    try {
      setCategories(await getCategories())
    } catch (error) {
      notify(extractErrorMessage(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (category) => {
    setEditing(category)
    setForm({
      name: category.name,
      description: category.description || '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const validateForm = () => {
    const errors = validateCategoryForm(form)
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    const payload = sanitizeCategoryPayload(form)

    setSaving(true)
    try {
      if (editing) {
        await updateCategory(editing.id, payload)
        notify('Category updated')
      } else {
        await createCategory(payload)
        notify('Category created')
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
      await deleteCategory(deleteTarget.id)
      notify('Category deleted')
      setDeleteTarget(null)
      await loadData()
    } catch (error) {
      notify(extractErrorMessage(error), 'error')
    }
  }

  if (loading) return <LoadingSpinner label="Loading categories..." />

  return (
    <div className="page">
      <div className="page__header page__header--actions">
        <div>
          <h2>Categories</h2>
          <p>Organize products into categories</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          Add Category
        </button>
      </div>

      <section className="panel">
        {categories.length === 0 ? (
          <p className="empty-state">No categories yet. Create your first category.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.description || '—'}</td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => openEdit(category)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--danger-text"
                        onClick={() => setDeleteTarget(category)}
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
        <Modal
          title={editing ? 'Edit Category' : 'Add Category'}
          onClose={() => setModalOpen(false)}
        >
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
          title="Delete Category"
          message={`Delete "${deleteTarget.name}"? Products using this category may block deletion.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
