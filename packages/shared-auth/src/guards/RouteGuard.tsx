import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { ModulePermission } from '../permissions'
import { canAccessModule } from '../modulePermissions'
import { getPortalDashboardPath, hasValidAuthState, type Portal } from '../utils/authStorage'

export function RouteGuard({
  children,
  portal,
  module,
}: {
  children: ReactNode
  portal: Portal
  module?: ModulePermission
}) {
  if (!hasValidAuthState(portal)) {
    return <Navigate to="/login" replace />
  }

  if (module && !canAccessModule(module)) {
    return <Navigate to={getPortalDashboardPath(portal)} replace />
  }

  return <>{children}</>
}

export const ProtectedRoute = RouteGuard
