import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface AuthState {
  token: string | null
  username: string | null
  role: string | null
}

interface AuthContextValue extends AuthState {
  login: (token: string, username: string, role: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'zutibus_auth'

function loadAuth(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { token: null, username: null, role: null }
    return JSON.parse(raw)
  } catch {
    return { token: null, username: null, role: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadAuth)

  useEffect(() => {
    if (auth.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [auth])

  function login(token: string, username: string, role: string) {
    setAuth({ token, username, role })
  }

  function logout() {
    setAuth({ token: null, username: null, role: null })
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, isAuthenticated: !!auth.token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
