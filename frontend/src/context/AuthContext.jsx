import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isAuthenticated as checkAuth, login as apiLogin, logout as apiLogout } from '../api/auth'
import { refreshToken } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(checkAuth)

  useEffect(() => {
    let active = true

    async function validateSession() {
      if (!checkAuth()) return
      try {
        await refreshToken()
        if (active) setAuthenticated(true)
      } catch {
        apiLogout()
        if (active) setAuthenticated(false)
      }
    }

    validateSession()
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (username, password) => {
    await apiLogin(username, password)
    setAuthenticated(true)
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setAuthenticated(false)
  }, [])

  const value = useMemo(
    () => ({ authenticated, login, logout }),
    [authenticated, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
