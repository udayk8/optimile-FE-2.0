import type { ReactNode } from 'react'
import type { Permission } from '../modulePermissions'
import { useFleetAuth } from '../hooks/useFleetAuth'

interface FleetAccessGateProps {
  children: ReactNode
  fallback?: ReactNode
  permission: Permission
}

export function FleetAccessGate({ children, fallback = null, permission }: FleetAccessGateProps) {
  const { can } = useFleetAuth()
  return can(permission) ? <>{children}</> : <>{fallback}</>
}
