import type { ERPModule, User } from './types'

// ── The 4 active modules and their routes ────────────────────
export const MODULE_ROUTES: Record<ERPModule, string> = {
  ams:      '/auction/dashboard',
  fleet:    '/fleet',
  vendor:   '/vendor',
  customer: '/customer',
  // reserved — not yet built
  admin:     '/auction/dashboard',
  tms:       '/booking',
  tracking:  '/tracking',
  finance:   '/finance',
  reporting: '/reporting',
  ptl:       '/ptl',
}

export function canUserAccessModule(user: User | null, module: ERPModule): boolean {
  if (!user) return false
  if (user.permissions.includes('all')) return true
  return user.modules.includes(module)
}

export function getAccessibleModules(user: User | null) {
  const active: ERPModule[] = ['ams', 'fleet', 'vendor', 'customer']
  return active
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
