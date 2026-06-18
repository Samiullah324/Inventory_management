import axios from 'axios'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth'

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

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    const refresh = getRefreshToken()
    if (!refresh) {
      clearTokens()
      return Promise.reject(error)
    }

    if (!refreshPromise) {
      refreshPromise = axios
        .post(`${API_BASE}/auth/token/refresh/`, { refresh })
        .then((res) => {
          setTokens(res.data.access, refresh)
          return res.data.access
        })
        .catch(() => {
          clearTokens()
          throw error
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    try {
      const access = await refreshPromise
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
