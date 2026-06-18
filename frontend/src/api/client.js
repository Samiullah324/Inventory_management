import axios from 'axios'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth'
import { notifySessionExpired } from './session'

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
  const response = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh })
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

export default client

export function extractErrorMessage(error) {
  const data = error.response?.data
  if (!data) return error.message || 'An unexpected error occurred'
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  if (Array.isArray(data)) return data.join(', ')
  return Object.entries(data)
    .map(([field, messages]) => {
      const text = Array.isArray(messages) ? messages.join(', ') : messages
      return `${field}: ${text}`
    })
    .join('; ')
}
