import { apiRequest } from './client'

export const dashboardApi = {
  getStats: (limit = 10) => apiRequest(`/api/dashboard/stats/?limit=${limit}`),
}

export const categoriesApi = {
  list: () => apiRequest('/api/categories/'),
  create: (payload) => apiRequest('/api/categories/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (id, payload) => apiRequest(`/api/categories/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  remove: (id) => apiRequest(`/api/categories/${id}/`, { method: 'DELETE' }),
}

export const productsApi = {
  list: () => apiRequest('/api/products/'),
  create: (payload) => apiRequest('/api/products/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (id, payload) => apiRequest(`/api/products/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  remove: (id) => apiRequest(`/api/products/${id}/`, { method: 'DELETE' }),
}

export const transactionsApi = {
  list: () => apiRequest('/api/transactions/'),
  create: (payload) => apiRequest('/api/transactions/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (id, payload) => apiRequest(`/api/transactions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  remove: (id) => apiRequest(`/api/transactions/${id}/`, { method: 'DELETE' }),
}
