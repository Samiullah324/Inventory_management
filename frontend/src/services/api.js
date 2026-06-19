import axios from 'axios'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../utils/auth'
import { notifySessionExpired } from '../utils/session'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise = null

export function resetRefreshState() {
  refreshPromise = null
}

export async function refreshAccessToken(refresh) {
  const response = await axios.post(`${API_BASE}/auth/refresh/`, { refresh })
  if (!response.data?.access) {
    throw new Error('Invalid refresh response')
  }
  setTokens(response.data.access, refresh)
  return response.data.access
}

function handleAuthFailure() {
  clearTokens()
  notifySessionExpired()
}

export function acquireAccessTokenRefresh() {
  const refresh = getRefreshToken()
  if (!refresh) {
    handleAuthFailure()
    return Promise.reject(new Error('No refresh token'))
  }

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(refresh)
      .catch((refreshError) => {
        handleAuthFailure()
        throw refreshError
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    try {
      const access = await acquireAccessTokenRefresh()
      original._retry = true
      original.headers.Authorization = `Bearer ${access}`
      return client(original)
    } catch (refreshError) {
      return Promise.reject(refreshError)
    }
  },
)

export function extractErrorMessage(error) {
  const data = error.response?.data
  if (!data) {
    if (!error.response) {
      return 'Unable to connect to the server. Please try again.'
    }
    return error.message || 'An unexpected error occurred'
  }
  if (typeof data === 'string') return data
  if (data.error) return data.error
  if (data.detail) return data.detail
  if (Array.isArray(data)) return data.join(', ')
  if (data.details && typeof data.details === 'object') {
    return Object.entries(data.details)
      .map(([field, messages]) => {
        const text = Array.isArray(messages) ? messages.join(', ') : messages
        return `${field}: ${text}`
      })
      .join('; ')
  }
  return Object.entries(data)
    .map(([field, messages]) => {
      const text = Array.isArray(messages) ? messages.join(', ') : messages
      return `${field}: ${text}`
    })
    .join('; ')
}

export function extractFieldErrors(error) {
  const data = error.response?.data
  if (!data) return {}
  if (data.details && typeof data.details === 'object' && !Array.isArray(data.details)) {
    return Object.fromEntries(
      Object.entries(data.details).map(([field, messages]) => [
        field,
        Array.isArray(messages) ? messages[0] : messages,
      ]),
    )
  }
  if (typeof data === 'object' && !Array.isArray(data) && !data.error) {
    return Object.fromEntries(
      Object.entries(data).map(([field, messages]) => [
        field,
        Array.isArray(messages) ? messages[0] : messages,
      ]),
    )
  }
  return {}
}

// Auth
export async function login(username, password) {
  const { data } = await client.post('/auth/login/', { username, password })
  setTokens(data.access, data.refresh)
  return data
}

export async function logout() {
  try {
    await client.post('/auth/logout/')
  } finally {
    clearTokens()
  }
}

export async function refreshToken() {
  const refresh = getRefreshToken()
  if (!refresh) {
    throw new Error('No refresh token')
  }
  return refreshAccessToken(refresh)
}

// Products
export async function getProducts() {
  const { data } = await client.get('/products/')
  return data
}

export async function getProduct(id) {
  const { data } = await client.get(`/products/${id}/`)
  return data
}

export async function createProduct(payload) {
  const { data } = await client.post('/products/', payload)
  return data
}

export async function updateProduct(id, payload) {
  const { data } = await client.put(`/products/${id}/`, payload)
  return data
}

export async function deleteProduct(id) {
  await client.delete(`/products/${id}/`)
}

// Categories
export async function getCategories() {
  const { data } = await client.get('/categories/')
  return data
}

export async function getCategory(id) {
  const { data } = await client.get(`/categories/${id}/`)
  return data
}

export async function createCategory(payload) {
  const { data } = await client.post('/categories/', payload)
  return data
}

export async function updateCategory(id, payload) {
  const { data } = await client.put(`/categories/${id}/`, payload)
  return data
}

export async function deleteCategory(id) {
  await client.delete(`/categories/${id}/`)
}

// Transactions
export async function getTransactions() {
  const { data } = await client.get('/transactions/')
  return data
}

export async function getTransaction(id) {
  const { data } = await client.get(`/transactions/${id}/`)
  return data
}

export async function createTransaction(payload) {
  const { data } = await client.post('/transactions/', payload)
  return data
}

export async function deleteTransaction(id) {
  await client.delete(`/transactions/${id}/`)
}

// Dashboard
export async function getDashboardStats() {
  const { data } = await client.get('/dashboard/stats/')
  return data
}

export default client
