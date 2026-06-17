import { sanitizeErrorMessage, sanitizePayload } from '../utils/security';

let csrfToken = null;
let refreshPromise = null;
const sessionExpiredListeners = new Set();

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function onSessionExpired(callback) {
  sessionExpiredListeners.add(callback);
  return () => sessionExpiredListeners.delete(callback);
}

function notifySessionExpired() {
  csrfToken = null;
  sessionExpiredListeners.forEach((callback) => callback());
}

async function performFetch(path, requestInit) {
  try {
    return await fetch(path, requestInit);
  } catch {
    throw new Error('Network error. Check your connection and try again.');
  }
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value != null) {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function fetchCsrfToken() {
  const response = await fetch('/api/auth/csrf/', { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Unable to initialize security token.');
  }
  const data = await response.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

async function ensureCsrfToken() {
  if (!csrfToken) {
    await fetchCsrfToken();
  }
  return csrfToken;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      await ensureCsrfToken();
      const response = await fetch('/api/auth/token/refresh/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
      });
      if (!response.ok) {
        throw new Error('Session expired');
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function parseErrorPayload(data) {
  if (!data) {
    return null;
  }
  if (typeof data === 'string') {
    return data;
  }
  if (typeof data.detail === 'string') {
    return data.detail;
  }
  if (Array.isArray(data)) {
    return data.filter((item) => typeof item === 'string').join(', ');
  }

  const messages = [];
  for (const [field, value] of Object.entries(data)) {
    if (field === 'non_field_errors' && Array.isArray(value)) {
      messages.push(...value.filter((item) => typeof item === 'string'));
    } else if (Array.isArray(value)) {
      messages.push(...value.filter((item) => typeof item === 'string').map((item) => `${field}: ${item}`));
    } else if (typeof value === 'string') {
      messages.push(`${field}: ${value}`);
    }
  }
  return messages.length ? messages.join('; ') : null;
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (MUTATING_METHODS.has(method)) {
    headers['X-CSRFToken'] = await ensureCsrfToken();
  }

  const requestInit = {
    ...options,
    method,
    headers,
    credentials: 'include',
  };

  let response = await performFetch(path, requestInit);

  if (response.status === 401 && !path.includes('/auth/token/')) {
    try {
      await refreshAccessToken();
      if (MUTATING_METHODS.has(method)) {
        headers['X-CSRFToken'] = await ensureCsrfToken();
      }
      response = await performFetch(path, { ...requestInit, headers });
    } catch {
      notifySessionExpired();
      throw new Error('Session expired. Please sign in again.');
    }
  }

  if (response.status === 401) {
    notifySessionExpired();
    throw new Error('Session expired. Please sign in again.');
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = parseErrorPayload(data) || response.statusText || 'Request failed';
    throw new Error(sanitizeErrorMessage(message));
  }

  return data;
}

export async function checkSession() {
  try {
    await apiRequest('/api/auth/session/');
    return true;
  } catch {
    return false;
  }
}

export async function login(username, password) {
  await fetchCsrfToken();
  return apiRequest('/api/auth/token/', {
    method: 'POST',
    body: JSON.stringify(sanitizePayload({ username, password })),
  });
}

export async function logout() {
  try {
    await apiRequest('/api/auth/logout/', { method: 'POST' });
  } finally {
    csrfToken = null;
  }
}

export async function fetchDashboard() {
  return apiRequest('/api/dashboard/');
}

export async function fetchCategories() {
  const data = await apiRequest('/api/categories/');
  return data.results ?? data;
}

export async function createCategory(payload) {
  return apiRequest('/api/categories/', {
    method: 'POST',
    body: JSON.stringify(sanitizePayload(payload)),
  });
}

export async function updateCategory(id, payload) {
  return apiRequest(`/api/categories/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(sanitizePayload(payload)),
  });
}

export async function deleteCategory(id) {
  return apiRequest(`/api/categories/${id}/`, { method: 'DELETE' });
}

export async function fetchProducts(filters = {}, page = 1) {
  const query = buildQuery({
    name: filters.name,
    sku: filters.sku,
    category: filters.categoryId,
    stock_status: filters.stockStatus,
    page,
  });
  return apiRequest(`/api/products/${query}`);
}

export async function createProduct(payload) {
  return apiRequest('/api/products/', {
    method: 'POST',
    body: JSON.stringify(sanitizePayload(payload)),
  });
}

export async function updateProduct(id, payload) {
  return apiRequest(`/api/products/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(sanitizePayload(payload)),
  });
}

export async function deleteProduct(id) {
  return apiRequest(`/api/products/${id}/`, { method: 'DELETE' });
}

export async function fetchTransactions(filters = {}, page = 1) {
  const query = buildQuery({
    product: filters.productId,
    transaction_type: filters.type,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    page,
  });
  return apiRequest(`/api/transactions/${query}`);
}

export async function createTransaction(payload) {
  return apiRequest('/api/transactions/', {
    method: 'POST',
    body: JSON.stringify(sanitizePayload(payload)),
  });
}

export async function updateTransaction(id, payload) {
  return apiRequest(`/api/transactions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(sanitizePayload(payload)),
  });
}

export async function deleteTransaction(id) {
  return apiRequest(`/api/transactions/${id}/`, { method: 'DELETE' });
}
