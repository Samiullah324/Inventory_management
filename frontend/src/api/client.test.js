import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './auth'
import { apiRequest, login, logout } from './client'

function mockJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  }
}

describe('api client', () => {
  beforeEach(() => {
    clearTokens()
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('dispatchEvent', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('attaches bearer token to protected requests', async () => {
    setTokens({ access: 'access-token', refresh: 'refresh-token' })
    fetch.mockResolvedValueOnce(mockJsonResponse([{ id: 1 }]))

    await apiRequest('/api/categories/')

    expect(fetch).toHaveBeenCalledWith('/api/categories/', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer access-token',
      }),
    }))
  })

  it('refreshes access token once on 401 and retries the request', async () => {
    setTokens({ access: 'expired-token', refresh: 'refresh-token' })
    fetch
      .mockResolvedValueOnce({ ok: false, status: 401, text: async () => '{}' })
      .mockResolvedValueOnce(mockJsonResponse({ access: 'new-access-token' }))
      .mockResolvedValueOnce(mockJsonResponse([{ id: 1 }]))

    const data = await apiRequest('/api/products/')

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(getAccessToken()).toBe('new-access-token')
    expect(data).toEqual([{ id: 1 }])
  })

  it('does not retry indefinitely after a failed refresh', async () => {
    setTokens({ access: 'expired-token', refresh: 'refresh-token' })
    fetch
      .mockResolvedValueOnce({ ok: false, status: 401, text: async () => '{}' })
      .mockResolvedValueOnce({ ok: false, status: 401, text: async () => '{}' })

    await expect(apiRequest('/api/products/')).rejects.toEqual({
      detail: 'Session expired. Please sign in again.',
    })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(getAccessToken()).toBeNull()
    expect(window.dispatchEvent).toHaveBeenCalled()
  })

  it('sanitizes API errors and omits sensitive fields', async () => {
    setTokens({ access: 'access-token', refresh: 'refresh-token' })
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({
        quantity: ['Insufficient stock.'],
        password: 'secret',
        refresh: 'secret-refresh',
      }),
    })

    await expect(apiRequest('/api/transactions/', {
      method: 'POST',
      body: JSON.stringify({ quantity: 1 }),
    })).rejects.toEqual({
      quantity: ['Insufficient stock.'],
    })
  })

  it('stores tokens on login without leaking credentials in errors', async () => {
    fetch.mockResolvedValueOnce(mockJsonResponse({
      access: 'access-token',
      refresh: 'refresh-token',
    }))

    await login('admin', 'admin123')

    expect(getAccessToken()).toBe('access-token')
    expect(getRefreshToken()).toBe('refresh-token')
  })

  it('clears tokens on logout', () => {
    setTokens({ access: 'access-token', refresh: 'refresh-token' })
    logout()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})
