import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCsrfToken, login, logout } from '../api/client';

describe('api client auth flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads CSRF token before login', async () => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (String(url).includes('/api/auth/csrf/')) {
        return new Response(JSON.stringify({ csrfToken: 'csrf-token' }), { status: 200 });
      }
      if (String(url).includes('/api/auth/token/')) {
        expect(options.headers['X-CSRFToken']).toBe('csrf-token');
        expect(options.credentials).toBe('include');
        return new Response(JSON.stringify({ detail: 'Login successful' }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await login('admin', 'admin123');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('sends CSRF token on logout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, options = {}) => {
        if (String(url).includes('/api/auth/csrf/')) {
          return new Response(JSON.stringify({ csrfToken: 'csrf-token' }), { status: 200 });
        }
        if (String(url).includes('/api/auth/logout/')) {
          expect(options.method).toBe('POST');
          expect(options.headers['X-CSRFToken']).toBe('csrf-token');
          return new Response(JSON.stringify({ detail: 'Logged out' }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      }),
    );

    await fetchCsrfToken();
    await logout();
  });
});
