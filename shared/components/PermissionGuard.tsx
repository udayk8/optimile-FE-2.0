import { PropsWithChildren, ReactNode } from 'react'
import { useAuth } from '@shared-auth'

interface PermissionGuardProps extends PropsWithChildren {
  permission: string | string[]
  fallback?: ReactNode
}

export function PermissionGuard({ children, fallback = null, permission }: PermissionGuardProps) {
  const { hasPermission } = useAuth()
  return <>{hasPermission(permission) ? children : fallback}</>
}
