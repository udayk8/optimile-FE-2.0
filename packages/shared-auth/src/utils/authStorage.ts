import { isDemoRole, type DemoRole } from '../roles'

export const PORTALS = ['auction', 'admin', 'vendor', 'fleet', 'driver', 'customer'] as const
export type Portal = (typeof PORTALS)[number]

export const AUTH_MODES = ['demo', 'token'] as const
export type AuthMode = (typeof AUTH_MODES)[number]

export const PORTAL_DASHBOARD_PATHS: Record<Portal, string> = {
  auction: '/auction',
  admin: '/admin',
  vendor: '/vendor',
  fleet: '/fleet',
  driver: '/driver',
  customer: '/customer',
}

export function isPortal(value: string | null): value is Portal {
  return PORTALS.includes(value as Portal)
}

export function isAuthMode(value: string | null): value is AuthMode {
  return AUTH_MODES.includes(value as AuthMode)
}

export function getSelectedPortal() {
  const portal = localStorage.getItem('selectedPortal')
  return isPortal(portal) ? portal : null
}

export function getAuthMode() {
  const authMode = localStorage.getItem('authMode')
  return isAuthMode(authMode) ? authMode : null
}

export function getSelectedRole() {
  const role = localStorage.getItem('userRole')
  return isDemoRole(role) ? role : null
}

export function storePortalSelection(portal: Portal) {
  localStorage.setItem('selectedPortal', portal)
}

export function storeDemoLogin(portal: Portal, role: DemoRole | string) {
  localStorage.setItem('authMode', 'demo')
  localStorage.setItem('selectedPortal', portal)
  localStorage.setItem('userRole', role)
}

export function storeTokenLogin(portal: Portal) {
  localStorage.setItem('authMode', 'token')
  localStorage.setItem('selectedPortal', portal)
  localStorage.removeItem('userRole')
}

export function clearAuthState() {
  localStorage.removeItem('authMode')
  localStorage.removeItem('selectedPortal')
  localStorage.removeItem('userRole')
  localStorage.removeItem('rememberMe')
}

export function getPortalDashboardPath(portal: Portal) {
  return PORTAL_DASHBOARD_PATHS[portal]
}

export function getPortalDashboardUrl(portal: Portal) {
  return PORTAL_DASHBOARD_PATHS[portal]
}

export function hasValidAuthState(expectedPortal?: Portal) {
  const authMode = getAuthMode()
  const selectedPortal = getSelectedPortal()

  if (!authMode || !selectedPortal) return false
  if (expectedPortal && selectedPortal !== expectedPortal) return false
  if (authMode === 'demo' && !getSelectedRole()) return false

  return true
}
