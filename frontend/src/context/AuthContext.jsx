import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { checkSession, fetchCsrfToken, login as apiLogin, logout as apiLogout } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrapAuth() {
      try {
        await fetchCsrfToken();
        const isValid = await checkSession();
        if (active) {
          setAuthenticated(isValid);
        }
      } catch {
        if (active) {
          setAuthenticated(false);
        }
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    }

    bootstrapAuth();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    await apiLogin(username, password);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ authenticated, initializing, login, logout }),
    [authenticated, initializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
