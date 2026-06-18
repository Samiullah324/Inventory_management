import client from './client'

const ACCESS_KEY = 'inventory_access_token'
const REFRESH_KEY = 'inventory_refresh_token'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(access, refresh) {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function isAuthenticated() {
  return Boolean(getAccessToken())
}

export async function login(username, password) {
  const response = await client.post('/auth/token/', { username, password })
  setTokens(response.data.access, response.data.refresh)
  return response.data
}

export function logout() {
  clearTokens()
}
