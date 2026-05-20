import type { ERPModule, User } from './types'

// ── The 4 active modules and their routes ────────────────────
export const MODULE_ROUTES: Record<ERPModule, string> = {
  ams:      '/auction/dashboard',
  fleet:    '/fleet',
  vendor:   '/vendor',
  customer: '/customer',
  // reserved — not yet built
  admin:     '/admin/dashboard',
  tms:       '/tms/booking/tenant/tenant-northstar/bookings',
  tracking:  '/tracking',
  finance:   '/finance',
  reporting: '/reporting',
  ptl:       '/ptl',
  // extracted console modules
  'platform-admin': '/platform-admin/dashboard',
  'tenant-admin':   '/tenant-admin/tenant/tenant-northstar/dashboard',
  'driver-app':     '/driver-app/tenant/tenant-northstar/driver-app/login',
}

export function canUserAccessModule(user: User | null, module: ERPModule): boolean {
  if (!user) return false
  if (user.permissions.includes('all')) return true
  return user.modules.includes(module)
}

export function getAccessibleModules(user: User | null) {
  const enabledModules: ERPModule[] = ['admin', 'ams', 'fleet', 'vendor', 'customer', 'tms', 'tracking', 'platform-admin', 'tenant-admin', 'driver-app']
  return enabledModules
    .filter(m => canUserAccessModule(user, m))
    .map(m => ({ id: m, dashboardPath: MODULE_ROUTES[m] }))
}

export function getPostLoginRouteForUser(user: User | null): string {
  if (!user) return '/login'
  const accessible = getAccessibleModules(user)
  if (accessible.length === 1) {
    const [onlyModule] = accessible
    return onlyModule?.dashboardPath ?? '/modules'
  }
  return '/modules'
}
