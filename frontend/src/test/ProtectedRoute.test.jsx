import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';

function renderProtectedRoute(initialEntries) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Dashboard page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects unauthenticated users to login', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/api/auth/csrf/')) {
        return new Response(JSON.stringify({ csrfToken: 'csrf-test' }), { status: 200 });
      }
      return new Response(JSON.stringify({ detail: 'Unauthorized' }), { status: 401 });
    });

    renderProtectedRoute(['/']);
    await waitFor(() => {
      expect(screen.getByText('Login page')).toBeInTheDocument();
    });
  });

  it('renders protected content for authenticated sessions', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/api/auth/csrf/')) {
        return new Response(JSON.stringify({ csrfToken: 'csrf-test' }), { status: 200 });
      }
      if (String(url).includes('/api/auth/session/')) {
        return new Response(JSON.stringify({ authenticated: true, username: 'admin' }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    renderProtectedRoute(['/']);
    await waitFor(() => {
      expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    });
  });
});
