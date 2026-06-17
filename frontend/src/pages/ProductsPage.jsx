import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createProduct,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  updateProduct,
} from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useNotification } from '../context/NotificationContext';
import { getStockStatusLabel, getTotalPages, validateProductForm } from '../utils/inventory';

const emptyForm = {
  name: '',
  sku: '',
  category: '',
  description: '',
  unit_price: '',
  minimum_stock_threshold: '0',
};

const PAGE_SIZE = 20;

function ProductForm({ initialValues, categories, onSubmit, onCancel, submitting }) {
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
    const nextErrors = validateProductForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }
    await onSubmit({
      ...values,
      category: Number(values.category),
      unit_price: Number(values.unit_price),
      minimum_stock_threshold: Number(values.minimum_stock_threshold),
    });
  };

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Name
        <input name="name" value={values.name} onChange={handleChange} disabled={submitting} />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <label>
        SKU
        <input name="sku" value={values.sku} onChange={handleChange} disabled={submitting} />
        {errors.sku && <span className="field-error">{errors.sku}</span>}
      </label>
      <label>
        Category
        <select name="category" value={values.category} onChange={handleChange} disabled={submitting}>
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.category && <span className="field-error">{errors.category}</span>}
      </label>
      <label>
        Unit price
        <input
          name="unit_price"
          type="number"
          min="0"
          step="0.01"
          value={values.unit_price}
          onChange={handleChange}
          disabled={submitting}
        />
        {errors.unit_price && <span className="field-error">{errors.unit_price}</span>}
      </label>
      <label>
        Minimum stock threshold
        <input
          name="minimum_stock_threshold"
          type="number"
          min="0"
          step="1"
          value={values.minimum_stock_threshold}
          onChange={handleChange}
          disabled={submitting}
        />
        {errors.minimum_stock_threshold && (
          <span className="field-error">{errors.minimum_stock_threshold}</span>
        )}
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
          {submitting ? 'Saving...' : 'Save product'}
        </button>
      </div>
    </form>
  );
}

export default function ProductsPage() {
  const { notify } = useNotification();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    name: '',
    sku: '',
    categoryId: '',
    stockStatus: '',
  });

  const loadCategories = useCallback(async () => {
    try {
      const categoryData = await fetchCategories();
      setCategories(categoryData);
    } catch (error) {
      notify(error.message || 'Failed to load categories', 'error');
    }
  }, [notify]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProducts(filters, page);
      setProducts(data.results ?? []);
      setTotalCount(data.count ?? 0);
    } catch (error) {
      notify(error.message || 'Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, notify, page]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadProducts();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  const totalPages = useMemo(() => getTotalPages(totalCount, PAGE_SIZE), [totalCount]);

  const modalTitle = useMemo(
    () => (editingProduct ? 'Edit product' : 'Add product'),
    [editingProduct],
  );

  const openCreateModal = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct({
      ...product,
      category: String(product.category),
      unit_price: String(product.unit_price),
      minimum_stock_threshold: String(product.minimum_stock_threshold),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, values);
        notify('Product updated', 'success');
      } else {
        await createProduct(values);
        notify('Product created', 'success');
      }
      closeModal();
      await loadProducts();
    } catch (error) {
      notify(error.message || 'Failed to save product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete product "${product.name}"?`)) {
      return;
    }
    try {
      await deleteProduct(product.id);
      notify('Product deleted', 'success');
      await loadProducts();
    } catch (error) {
      notify(error.message || 'Failed to delete product', 'error');
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setPage(1);
    setFilters((current) => ({ ...current, [name]: value }));
  };

  if (loading && products.length === 0) {
    return <LoadingSpinner label="Loading products..." />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage catalog items, pricing, and stock thresholds.</p>
        </div>
        <button type="button" className="primary-button" onClick={openCreateModal}>
          Add product
        </button>
      </header>

      <section className="panel">
        <div className="filters-grid">
          <label>
            Name
            <input name="name" value={filters.name} onChange={handleFilterChange} placeholder="Search by name" />
          </label>
          <label>
            SKU
            <input name="sku" value={filters.sku} onChange={handleFilterChange} placeholder="Search by SKU" />
          </label>
          <label>
            Category
            <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Stock status
            <select name="stockStatus" value={filters.stockStatus} onChange={handleFilterChange}>
              <option value="">All statuses</option>
              <option value="in_stock">In stock</option>
              <option value="low_stock">Low stock</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </label>
        </div>

        {loading ? (
          <LoadingSpinner label="Applying filters..." />
        ) : products.length === 0 ? (
          <p className="empty-state">No products match the current filters.</p>
        ) : (
          <>
            <div className="table-wrapper">
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
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.sku}</td>
                      <td>{product.category_name}</td>
                      <td>${Number(product.unit_price).toFixed(2)}</td>
                      <td>{product.stock_quantity}</td>
                      <td>
                        <span className={`badge badge-${product.stock_status}`}>
                          {getStockStatusLabel(product.stock_status)}
                        </span>
                      </td>
                      <td className="table-actions">
                        <button type="button" className="link-button" onClick={() => openEditModal(product)}>
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
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </section>

      {modalOpen && (
        <Modal title={modalTitle} onClose={closeModal}>
          <ProductForm
            initialValues={editingProduct || emptyForm}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            submitting={submitting}
          />
        </Modal>
      )}
    </div>
  );
}
