import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ProtectedRoute from '../components/ProtectedRoute'
import { AuthProvider } from '../context/AuthContext'

function renderProtectedRoute(initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', () => {
    renderProtectedRoute()
    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument()
  })
})
