/**
 * JWT token storage for the admin SPA.
 *
 * Security notes:
 * - The API uses JWT bearer auth only (no session cookies), so CSRF tokens are not required.
 * - Tokens are stored in localStorage for persistence across reloads. This is acceptable for
 *   a trusted admin-only SPA but is vulnerable to XSS; avoid rendering untrusted HTML and
 *   keep dependencies patched in production.
 */
const ACCESS_TOKEN_KEY = 'inventory_access_token'
const REFRESH_TOKEN_KEY = 'inventory_refresh_token'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens({ access, refresh }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function isAuthenticated() {
  return Boolean(getAccessToken())
}
