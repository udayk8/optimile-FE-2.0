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

/** Unified-shell landing — every logged-in user enters the shell.
 *  RBAC filtering of sidebar sections handled by the shell. */
const SHELL_LANDING_BY_MODULE: Record<string, string> = {
  fleet: '/fleet/dashboard',
  ams: '/auction/dashboard',
  vendor: '/vendor',
}
const SHELL_LANDING_DEFAULT = '/fleet/dashboard'

export function getPostLoginRouteForUser(user: User | null): string {
  if (!user) return '/login'
  if (user.permissions.includes('all')) return SHELL_LANDING_DEFAULT
  for (const code of ['fleet', 'ams', 'vendor'] as const) {
    if (user.modules.includes(code) && SHELL_LANDING_BY_MODULE[code]) {
      return SHELL_LANDING_BY_MODULE[code]
    }
  }
  return SHELL_LANDING_DEFAULT
}
