import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '../types'
import * as api from '../api'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

function decodeToken(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return { id: Number(payload.sub), email: payload.email }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('token')
    return token ? decodeToken(token) : null
  })

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      api.refreshAccessToken()
    }, 25 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    localStorage.setItem('token', res.access_token)
    localStorage.setItem('refresh_token', res.refresh_token)
    setUser(decodeToken(res.access_token))
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    await api.register(email, password)
    await login(email, password)
  }, [login])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // still clear locally even if server unreachable
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
