import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="auth-guard-loading" aria-live="polite">
        Checking your secure session...
      </main>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to={user?.role === 'EMPLOYEE' ? '/employee' : '/admin/login'} replace />
  }

  return children
}
