import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ERPModule } from '../types'

const PORTAL_MODULES: Record<string, ERPModule> = {
  admin: 'ams',
  auction: 'ams',
  vendor: 'vendor',
  fleet: 'fleet',
  customer: 'customer',
}

export function RouteGuard({
  children,
  portal,
  module,
}: {
  children: ReactNode
  portal?: string
  module?: string
}) {
  const { hasModuleAccess, isAuthenticated, loading } = useAuth()

  if (loading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const requiredModule = portal ? PORTAL_MODULES[portal] : module
  if (requiredModule && PORTAL_MODULES[requiredModule]) {
    const normalizedModule = PORTAL_MODULES[requiredModule]
    if (!hasModuleAccess(normalizedModule)) return <Navigate to="/modules" replace />
  } else if (!portal && module && hasModuleAccess(module as ERPModule) === false) {
    return <Navigate to="/modules" replace />
  }

  return <>{children}</>
}

export const ProtectedRoute = RouteGuard
