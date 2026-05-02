export const DEMO_ROLES = [
  'CEO (All Access)',
  'Administration',
  'Fleet Manager',
  'Finance Manager',
  'Auction Head',
  'CBD',
  'TMS',
  'Vendor',
  'Procurement Head',
  'Ops Head',
  'Regional Manager',
  'Track and Trace',
  'Platform Admin',
  'Tenant Admin',
  'Driver',
] as const

export type DemoRole = (typeof DEMO_ROLES)[number]

export const ROLE_CONSTANTS = {
  ceo: 'CEO (All Access)',
  administration: 'Administration',
  fleetManager: 'Fleet Manager',
  financeManager: 'Finance Manager',
  auctionHead: 'Auction Head',
  cbd: 'CBD',
  tms: 'TMS',
  vendor: 'Vendor',
  procurementHead: 'Procurement Head',
  opsHead: 'Ops Head',
  regionalManager: 'Regional Manager',
  trackAndTrace: 'Track and Trace',
  platformAdmin: 'Platform Admin',
  tenantAdmin: 'Tenant Admin',
  driver: 'Driver',
} as const

export function isDemoRole(value: string | null): value is DemoRole {
  return DEMO_ROLES.includes(value as DemoRole)
}

export function isCeoRole(role = localStorage.getItem('userRole') ?? '') {
  return role === ROLE_CONSTANTS.ceo
}
