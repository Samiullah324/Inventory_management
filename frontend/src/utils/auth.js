const ACCESS_KEY = 'inventory_access_token'
const REFRESH_KEY = 'inventory_refresh_token'

export function getToken() {
  return getAccessToken()
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function setToken(token) {
  localStorage.setItem(ACCESS_KEY, token)
}

export function setTokens(access, refresh) {
  localStorage.setItem(ACCESS_KEY, access)
  if (refresh) {
    localStorage.setItem(REFRESH_KEY, refresh)
  }
}

export function removeToken() {
  clearTokens()
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function isAuthenticated() {
  return Boolean(getAccessToken())
}

function decodeAccessTokenPayload(token) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export function isAccessTokenExpired(token = getAccessToken()) {
  if (!token) return true
  const payload = decodeAccessTokenPayload(token)
  if (!payload?.exp) return true
  return payload.exp * 1000 <= Date.now()
}

export function isSessionValid() {
  return isAuthenticated() && !isAccessTokenExpired()
}

export const DASHBOARD_POLL_MS = Number(import.meta.env.VITE_DASHBOARD_POLL_MS) || 60000
