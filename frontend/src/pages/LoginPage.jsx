import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import Alert from '../components/Alert'
import { useAuth } from '../context/useAuth'
import { formatApiError } from '../utils/errors'
import { validateRequired } from '../utils/validation'

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const usernameError = validateRequired(username, 'Username')
    const passwordError = validateRequired(password, 'Password')
    if (usernameError || passwordError) {
      setError(usernameError || passwordError)
      return
    }

    setSubmitting(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>Inventory Management</h1>
        <p className="muted">Sign in with your admin account.</p>
        <Alert message={error} onClose={() => setError('')} />
        <label>
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
