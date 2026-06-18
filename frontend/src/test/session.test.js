import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_EXPIRED_EVENT, notifySessionExpired } from '../utils/session'

describe('session expiry', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('dispatches a session expired event', () => {
    const handler = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, handler)
    notifySessionExpired()
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener(SESSION_EXPIRED_EVENT, handler)
  })
})
