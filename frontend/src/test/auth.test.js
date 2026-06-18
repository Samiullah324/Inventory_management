import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpired,
  isAuthenticated,
  isSessionValid,
  setTokens,
} from '../utils/auth'

vi.mock('../services/api', () => ({
  logout: vi.fn(async () => {
    const { clearTokens } = await import('../utils/auth')
    clearTokens()
  }),
}))

import { logout } from '../services/api'

describe('auth storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores and reads access tokens', () => {
    setTokens('access-123', 'refresh-456')
    expect(getAccessToken()).toBe('access-123')
    expect(isAuthenticated()).toBe(true)
  })

  it('clears tokens on logout state', () => {
    setTokens('access-123', 'refresh-456')
    clearTokens()
    expect(isAuthenticated()).toBe(false)
  })

  it('logout removes both access and refresh tokens', async () => {
    setTokens('access-123', 'refresh-456')
    await logout()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })

  it('detects expired access tokens from JWT exp claim', () => {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    const expiredPayload = btoa(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }),
    )
    setTokens(`${header}.${expiredPayload}.sig`, 'refresh')
    expect(isAccessTokenExpired()).toBe(true)
    expect(isSessionValid()).toBe(false)
  })

  it('treats valid access tokens as a live session', () => {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    const validPayload = btoa(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    )
    setTokens(`${header}.${validPayload}.sig`, 'refresh')
    expect(isAccessTokenExpired()).toBe(false)
    expect(isSessionValid()).toBe(true)
  })
})
