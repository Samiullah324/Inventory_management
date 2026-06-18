import { useEffect, useState } from 'react'
import Alert from '../components/Alert'
import Loading from '../components/Loading'
import { categoriesApi } from '../api/services'
import { formatApiError } from '../utils/errors'
import { validateRequired } from '../utils/validation'

const emptyForm = { name: '', description: '' }

export default function CategoriesPage() {
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

    async function loadCategories() {
      setLoading(true)
      setError('')
      try {
        const data = await categoriesApi.list()
        if (active) {
          setCategories(data)
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

    loadCategories()
    return () => {
      active = false
    }
  }, [refreshKey])

  const reloadCategories = async () => {
    setRefreshKey((key) => key + 1)
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const nameError = validateRequired(form.name, 'Name')
    if (nameError) {
      setError(nameError)
      return
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await categoriesApi.update(editingId, form)
        setSuccess('Category updated.')
      } else {
        await categoriesApi.create(form)
        setSuccess('Category created.')
      }
      resetForm()
      await reloadCategories()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (category) => {
    setEditingId(category.id)
    setForm({ name: category.name, description: category.description || '' })
    setSuccess('')
    setError('')
  }

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await categoriesApi.remove(category.id)
      setSuccess('Category deleted.')
      if (editingId === category.id) {
        resetForm()
      }
      await reloadCategories()
    } catch (err) {
      setError(formatApiError(err))
    }
  }

  if (loading) {
    return <Loading label="Loading categories..." />
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Categories</h2>
          <p className="muted">Organize products by category</p>
        </div>
      </div>

      <Alert message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <section className="page-grid">
        <form className="card" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit category' : 'Add category'}</h3>
          <label>
            Name
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
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
          <div className="button-row">
            <button type="submit" className="button" disabled={submitting}>
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
          <h3>All categories</h3>
          {categories.length === 0 ? (
            <p className="muted">No categories yet.</p>
          ) : (
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
                    <td className="actions-cell">
                      <button type="button" className="link-button" onClick={() => handleEdit(category)}>
                        Edit
                      </button>
                      <button type="button" className="link-button danger" onClick={() => handleDelete(category)}>
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
