import type { ERPModule, User } from './types'

export const MODULE_ROUTES: Record<ERPModule, string> = {
  ams: '/auction/dashboard',
  fleet: '/fleet',
  vendor: '/vendor',
  customer: '/customer',
  admin: '/admin/dashboard',
  tms: '/tms/booking/bookings',
  tracking: '/tracking',
  finance: '/finance',
  reporting: '/reporting',
  ptl: '/ptl',
  'platform-admin': '/platform-admin/dashboard',
  'tenant-admin': '/tenant-admin/dashboard',
  'driver-app': '/driver-app/tenant/tenant-northstar/driver-app/login',
}

export function canUserAccessModule(user: User | null, module: ERPModule): boolean {
  if (!user) return false
  if (user.permissions.includes('all')) return true
  return user.modules.includes(module)
}

export function getAccessibleModules(user: User | null) {
  const enabledModules: ERPModule[] = ['admin', 'ams', 'fleet', 'vendor', 'customer', 'tms', 'tracking', 'platform-admin', 'tenant-admin', 'driver-app']
  return enabledModules
    .filter((module) => canUserAccessModule(user, module))
    .map((module) => ({ id: module, dashboardPath: MODULE_ROUTES[module] }))
}

const SHELL_LANDING_BY_MODULE: Partial<Record<ERPModule, string>> = {
  fleet: '/fleet/dashboard',
  ams: '/auction/dashboard',
  vendor: '/vendor',
}

export function getPostLoginRouteForUser(user: User | null): string {
  if (!user) return '/login'

  if (user.permissions.includes('all')) return '/platform-admin/dashboard'

  for (const module of ['platform-admin', 'tenant-admin', 'tracking', 'tms', 'driver-app', 'customer'] as const) {
    if (user.modules.includes(module)) {
      return MODULE_ROUTES[module]
    }
  }

  for (const module of ['fleet', 'ams', 'vendor'] as const) {
    const route = SHELL_LANDING_BY_MODULE[module]
    if (route && user.modules.includes(module)) {
      return route
    }
  }

  return '/modules'
}
