import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'

export default function Login() {
  const { authenticated, login } = useAuth()
  const { notify } = useNotification()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  if (authenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const validate = () => {
    const next = {}
    if (!username.trim()) next.username = 'Username is required'
    if (!password) next.password = 'Password is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await login(username.trim(), password)
      notify('Signed in successfully')
      const redirectTo = location.state?.from?.pathname || '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (error) {
      notify(extractErrorMessage(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Admin Login</h1>
        <p className="login-card__subtitle">Sign in to manage inventory</p>

        <label className="field">
          <span>Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            disabled={loading}
          />
          {errors.username && <span className="field__error">{errors.username}</span>}
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
          {errors.password && <span className="field__error">{errors.password}</span>}
        </label>

        <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
