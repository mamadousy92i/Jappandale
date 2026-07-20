/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"

import { ApiError, apiFetch } from "@/lib/api"
import type { RegisterData, User } from "@/lib/types"

const ACCESS_KEY = "jappandale_access"
const REFRESH_KEY = "jappandale_refresh"

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  authFetch: (path: string, options?: RequestInit) => Promise<unknown>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return null
  try {
    const data = (await apiFetch("/auth/token/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh }),
    })) as { access: string }
    localStorage.setItem(ACCESS_KEY, data.access)
    return data.access
  } catch {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const authFetch = useCallback(
    async (path: string, options?: RequestInit): Promise<unknown> => {
      const access = localStorage.getItem(ACCESS_KEY)
      const withToken = (token: string | null): RequestInit => ({
        ...options,
        headers: {
          ...options?.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      try {
        return await apiFetch(path, withToken(access))
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const newAccess = await refreshAccessToken()
          if (newAccess) return apiFetch(path, withToken(newAccess))
          setUser(null)
        }
        throw error
      }
    },
    []
  )

  useEffect(() => {
    const bootstrap = async () => {
      if (!localStorage.getItem(ACCESS_KEY) && !localStorage.getItem(REFRESH_KEY)) {
        setLoading(false)
        return
      }
      try {
        setUser((await authFetch("/auth/me/")) as User)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    void bootstrap()
  }, [authFetch])

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = (await apiFetch("/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })) as { access: string; refresh: string }
      localStorage.setItem(ACCESS_KEY, tokens.access)
      localStorage.setItem(REFRESH_KEY, tokens.refresh)
      setUser((await authFetch("/auth/me/")) as User)
    },
    [authFetch]
  )

  const register = useCallback(
    async (data: RegisterData) => {
      await apiFetch("/auth/register/", { method: "POST", body: JSON.stringify(data) })
      await login(data.email, data.password)
    },
    [login]
  )

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth doit être utilisé sous <AuthProvider>")
  return ctx
}
