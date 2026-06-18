/**
 * Centralized API client for Django REST Framework.
 *
 * Authentication: JWT bearer tokens only (Authorization header). No session cookies are used,
 * so CSRF protection does not apply to these requests.
 */
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './auth'

const API_BASE = import.meta.env.VITE_API_URL || ''

let refreshPromise = null

function isAuthPath(path) {
  return path.includes('/api/auth/token/')
}

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) {
    throw new Error('No refresh token available')
  }

  const response = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })

  if (!response.ok) {
    clearTokens()
    throw new Error('Session expired')
  }

  const data = await parseResponse(response)
  setTokens({ access: data.access, refresh })
  return data.access
}

async function getValidAccessToken() {
  const token = getAccessToken()
  if (token) {
    return token
  }
  return refreshAccessToken()
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return { detail: 'Unexpected server response.' }
  }
}

function sanitizeClientError(data, status) {
  if (!data || typeof data !== 'object') {
    return { detail: 'Request failed.' }
  }

  if (data.detail) {
    return { detail: data.detail }
  }

  const fieldErrors = {}
  for (const [field, value] of Object.entries(data)) {
    if (field === 'access' || field === 'refresh' || field === 'password') {
      continue
    }
    fieldErrors[field] = value
  }

  if (Object.keys(fieldErrors).length > 0) {
    return fieldErrors
  }

  return { detail: `Request failed with status ${status}.` }
}

export async function apiRequest(path, options = {}, allowRefreshRetry = true) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  }

  if (!isAuthPath(path)) {
    const token = await getValidAccessToken()
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (
    response.status === 401
    && allowRefreshRetry
    && !isAuthPath(path)
    && getRefreshToken()
  ) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null
      })
    }

    try {
      await refreshPromise
      return apiRequest(path, options, false)
    } catch {
      clearTokens()
      window.dispatchEvent(new Event('auth:logout'))
      throw { detail: 'Session expired. Please sign in again.' }
    }
  }

  const data = await parseResponse(response)

  if (!response.ok) {
    throw sanitizeClientError(data, response.status)
  }

  return data
}

export async function login(username, password) {
  const data = await apiRequest('/api/auth/token/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }, false)

  setTokens({ access: data.access, refresh: data.refresh })
  return data
}

export function logout() {
  clearTokens()
}
