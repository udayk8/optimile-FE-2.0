import type { ERPModule, User } from './types'

// ── The 4 active modules and their routes ────────────────────
export const MODULE_ROUTES: Record<ERPModule, string> = {
  ams:      '/auction/dashboard',
  fleet:    '/fleet',
  vendor:   '/vendor',
  customer: '/customer',
  // reserved — not yet built
  admin:     '/admin/dashboard',
  tms:       '/booking',
  tracking:  '/tracking',
  finance:   '/finance',
  reporting: '/reporting',
  ptl:       '/ptl',
  // extracted console modules
  'platform-admin': '/platform-admin/dashboard',
  'tenant-admin':   '/tenant-admin/tenant/tenant-northstar/dashboard',
  'tms-booking':    '/tms/booking/tenant/tenant-northstar/bookings',
  'driver-app':     '/driver-app',
}

export function canUserAccessModule(user: User | null, module: ERPModule): boolean {
  if (!user) return false
  if (user.permissions.includes('all')) return true
  return user.modules.includes(module)
}

export function getAccessibleModules(user: User | null) {
  const enabledModules: ERPModule[] = ['admin', 'ams', 'fleet', 'vendor', 'customer', 'tms', 'tracking', 'platform-admin', 'tenant-admin', 'tms-booking', 'driver-app']
  return enabledModules
    .filter(m => canUserAccessModule(user, m))
    .map(m => ({ id: m, dashboardPath: MODULE_ROUTES[m] }))
}

export function getPostLoginRouteForUser(user: User | null): string {
  if (!user) return '/login'
  // All authenticated users land in the unified shell. ShellHome chooses the first available module.
  return '/home'
}
