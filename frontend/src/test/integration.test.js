import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, fetchCsrfToken, onSessionExpired } from '../api/client';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retries once after refreshing an expired access token', async () => {
    let productsCallCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        if (String(url).includes('/api/auth/csrf/')) {
          return jsonResponse({ csrfToken: 'csrf-token' });
        }
        if (String(url).includes('/api/auth/token/refresh/')) {
          return jsonResponse({ detail: 'Token refreshed' });
        }
        if (String(url).includes('/api/products/')) {
          productsCallCount += 1;
          if (productsCallCount === 1) {
            return jsonResponse({ detail: 'Unauthorized' }, 401);
          }
          return jsonResponse({ count: 0, results: [] });
        }
        return jsonResponse({}, 404);
      }),
    );

    await fetchCsrfToken();
    const data = await apiRequest('/api/products/');
    expect(data.results).toEqual([]);
    expect(productsCallCount).toBe(2);
  });

  it('notifies listeners when the session cannot be refreshed', async () => {
    const expired = vi.fn();
    const unsubscribe = onSessionExpired(expired);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('/api/auth/csrf/')) {
          return jsonResponse({ csrfToken: 'csrf-token' });
        }
        if (String(url).includes('/api/auth/token/refresh/')) {
          return jsonResponse({ detail: 'Invalid token' }, 401);
        }
        return jsonResponse({ detail: 'Unauthorized' }, 401);
      }),
    );

    await fetchCsrfToken();
    await expect(apiRequest('/api/dashboard/')).rejects.toThrow('Session expired');
    expect(expired).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('surfaces network failures with a user-friendly message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));

    await expect(apiRequest('/api/categories/')).rejects.toThrow(
      'Network error. Check your connection and try again.',
    );
  });
});
