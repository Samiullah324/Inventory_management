import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isAuthenticated,
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
})
