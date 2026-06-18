import { useEffect, useMemo, useState } from 'react'
import { isAuthenticated } from '../api/auth'
import { login as apiLogin, logout as apiLogout } from '../api/client'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(isAuthenticated())

  useEffect(() => {
    const handleLogout = () => setAuthenticated(false)
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  const value = useMemo(() => ({
    isAuthenticated: authenticated,
    login: async (username, password) => {
      await apiLogin(username, password)
      setAuthenticated(true)
    },
    logout: () => {
      apiLogout()
      setAuthenticated(false)
    },
  }), [authenticated])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
