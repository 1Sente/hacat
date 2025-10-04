import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface AdminRouteProps {
  children: ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user } = useAuthStore()

  if (!user || !['admin', 'approver'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
