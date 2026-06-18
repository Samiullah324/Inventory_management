import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearTokens,
  getAccessToken,
  isAuthenticated,
  setTokens,
} from '../api/auth'

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
})
