import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import { NotificationProvider } from '../context/NotificationContext'
import { ThemeProvider } from '../context/ThemeContext'
import Login from '../pages/Login'

vi.mock('../utils/auth', () => ({
  isAuthenticated: () => false,
  isSessionValid: () => false,
  isAccessTokenExpired: () => true,
  clearTokens: vi.fn(),
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens: vi.fn(),
}))

vi.mock('../services/api', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
}))

function renderLogin(initialEntries = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('Login page', () => {
  it('shows validation errors for empty credentials', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByText('Username is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('shows session expired message when redirected after auth failure', () => {
    renderLogin([{ pathname: '/login', state: { sessionExpired: true } }])

    expect(screen.getByText('Your session has expired. Please sign in again.')).toBeInTheDocument()
  })
})
