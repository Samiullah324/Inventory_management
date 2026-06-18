import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SESSION_EXPIRED_EVENT } from '../utils/session'
import { useAuth } from '../context/AuthContext'

export default function SessionGuard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleSessionExpired = () => {
      logout()
      if (location.pathname !== '/login') {
        navigate('/login', {
          replace: true,
          state: { sessionExpired: true },
        })
      }
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [logout, navigate, location.pathname])

  return null
}
