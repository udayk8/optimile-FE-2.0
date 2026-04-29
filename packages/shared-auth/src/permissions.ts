export const MODULE_PERMISSIONS = [
  'dashboard',
  'auction',
  'vendor-management',
  'sourcing',
  'contracts',
  'fleet-management',
  'ftl-booking',
  'track-and-trace',
  'finance',
  'trips',
  'expenses',
  'fleet',
  'invoices',
  'profile',
] as const

export type ModulePermission = (typeof MODULE_PERMISSIONS)[number]

export const PERMISSION_CONSTANTS = {
  modules: MODULE_PERMISSIONS,
} as const
