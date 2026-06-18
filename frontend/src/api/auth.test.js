import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isAuthenticated,
  setTokens,
} from './auth'

describe('auth token storage', () => {
  beforeEach(() => {
    clearTokens()
  })

  it('stores and reads tokens', () => {
    setTokens({ access: 'access-token', refresh: 'refresh-token' })
    expect(getAccessToken()).toBe('access-token')
    expect(getRefreshToken()).toBe('refresh-token')
    expect(isAuthenticated()).toBe(true)
  })

  it('clears tokens on logout', () => {
    setTokens({ access: 'access-token', refresh: 'refresh-token' })
    clearTokens()
    expect(isAuthenticated()).toBe(false)
  })
})
