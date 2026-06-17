import { useEffect, useMemo, useState } from 'react';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { validateCategoryForm } from '../utils/inventory';

const emptyForm = { name: '', description: '' };

function CategoryForm({ initialValues, onSubmit, onCancel, submitting }) {
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
    const nextErrors = validateCategoryForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }
    await onSubmit(values);
  };

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Name
        <input name="name" value={values.name} onChange={handleChange} disabled={submitting} />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <label>
        Description
        <textarea
          name="description"
          value={values.description}
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
          {submitting ? 'Saving...' : 'Save category'}
        </button>
      </div>
    </form>
  );
}

export default function CategoriesPage() {
  const { notify } = useNotification();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      notify(error.message || 'Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const modalTitle = useMemo(
    () => (editingCategory ? 'Edit category' : 'Add category'),
    [editingCategory],
  );

  const openCreateModal = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, values);
        notify('Category updated', 'success');
      } else {
        await createCategory(values);
        notify('Category created', 'success');
      }
      closeModal();
      await loadCategories();
    } catch (error) {
      notify(error.message || 'Failed to save category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) {
      return;
    }
    try {
      await deleteCategory(category.id);
      notify('Category deleted', 'success');
      await loadCategories();
    } catch (error) {
      notify(error.message || 'Failed to delete category', 'error');
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading categories..." />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Categories</h1>
          <p>Organize products into reusable categories.</p>
        </div>
        <button type="button" className="primary-button" onClick={openCreateModal}>
          Add category
        </button>
      </header>

      <section className="panel">
        {categories.length === 0 ? (
          <p className="empty-state">No categories yet. Create your first category.</p>
        ) : (
          <div className="table-wrapper">
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
                      <button type="button" className="link-button" onClick={() => openEditModal(category)}>
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
          </div>
        )}
      </section>

      {modalOpen && (
        <Modal title={modalTitle} onClose={closeModal}>
          <CategoryForm
            initialValues={editingCategory || emptyForm}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            submitting={submitting}
          />
        </Modal>
      )}
    </div>
  );
}
