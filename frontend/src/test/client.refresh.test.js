import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearTokens, setTokens } from '../api/auth'
import { acquireAccessTokenRefresh, refreshAccessToken, resetRefreshState } from '../api/client'

describe('token refresh lock', () => {
  beforeEach(() => {
    localStorage.clear()
    resetRefreshState()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    resetRefreshState()
  })

  it('reuses a single in-flight refresh for concurrent callers', async () => {
    setTokens('old-access', 'refresh-token')
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'new-access' } })

    const [first, second] = await Promise.all([
      acquireAccessTokenRefresh(),
      acquireAccessTokenRefresh(),
    ])

    expect(first).toBe('new-access')
    expect(second).toBe('new-access')
    expect(postSpy).toHaveBeenCalledTimes(1)
  })

  it('stores the refreshed access token', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'new-access' } })
    await refreshAccessToken('refresh-token')
    expect(localStorage.getItem('inventory_access_token')).toBe('new-access')
  })

  it('clears tokens and dispatches session expiry when refresh fails', async () => {
    setTokens('old-access', 'refresh-token')
    const handler = vi.fn()
    window.addEventListener('inventory:session-expired', handler)
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('invalid refresh'))

    await expect(acquireAccessTokenRefresh()).rejects.toThrow('invalid refresh')

    expect(localStorage.getItem('inventory_access_token')).toBeNull()
    expect(localStorage.getItem('inventory_refresh_token')).toBeNull()
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener('inventory:session-expired', handler)
  })

  it('does not retry when refresh token is missing', async () => {
    const handler = vi.fn()
    window.addEventListener('inventory:session-expired', handler)
    const postSpy = vi.spyOn(axios, 'post')

    await expect(acquireAccessTokenRefresh()).rejects.toThrow('No refresh token')

    expect(postSpy).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener('inventory:session-expired', handler)
  })
})
