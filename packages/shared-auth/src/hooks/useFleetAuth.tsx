import { createContext, type ReactNode, useContext, useMemo } from 'react'
import {
  FLEET_PAGE_PERMISSIONS,
  getFleetSelectedRole,
  type FleetAppPage,
  type Permission,
  permissionsForRole,
  type Role,
} from '../modulePermissions'

export interface FleetAuthUser {
  id: string
  name: string
  role: Role
}

interface FleetAuthContextValue {
  can: (permission: Permission) => boolean
  canAccessPage: (page: FleetAppPage) => boolean
  permissions: Permission[]
  user: FleetAuthUser
}

const FleetAuthContext = createContext<FleetAuthContextValue | undefined>(undefined)

export function FleetAuthProvider({ children }: { children: ReactNode }) {
  const user = useMemo<FleetAuthUser>(
    () => ({
      id: 'usr-demo-fleet',
      name: 'Uday Yaduwanshi',
      role: getFleetSelectedRole(),
    }),
    [],
  )

  const permissions = useMemo(() => permissionsForRole(user.role), [user.role])
  const permissionSet = useMemo(() => new Set<Permission>(permissions), [permissions])

  const value = useMemo<FleetAuthContextValue>(
    () => ({
      can: (permission) => permissionSet.has(permission),
      canAccessPage: (page) => permissionSet.has(FLEET_PAGE_PERMISSIONS[page]),
      permissions,
      user,
    }),
    [permissionSet, permissions, user],
  )

  return <FleetAuthContext.Provider value={value}>{children}</FleetAuthContext.Provider>
}

export function useFleetAuth() {
  const context = useContext(FleetAuthContext)
  if (!context) {
    throw new Error('useFleetAuth must be used within FleetAuthProvider')
  }
  return context
}
