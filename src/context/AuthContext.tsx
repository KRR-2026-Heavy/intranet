import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser } from '../types/auth'
import { getSession } from '../services/authService'

interface AuthContextValue {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  isLoading: boolean
  sessionError: string | null
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    getSession()
      .then((session) => {
        if (active) {
          setUser(session?.user ?? null)
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setSessionError(
            error instanceof Error ? error.message : 'Unable to verify your login session.',
          )
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const updateUser = (nextUser: AuthUser | null) => {
    setUser(nextUser)
    setSessionError(null)
    setIsLoading(false)
  }
  const value = useMemo(
    () => ({ user, setUser: updateUser, isLoading, sessionError }),
    [user, isLoading, sessionError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
