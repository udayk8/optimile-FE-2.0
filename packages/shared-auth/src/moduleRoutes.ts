import type { ERPModule, User } from './types'

export interface ModuleRouteConfig {
  id: ERPModule
  label: string
  description: string
  dashboardPath: string
  available: boolean
  submodules: ModuleSubmoduleConfig[]
}

export interface ModuleSubmoduleConfig {
  id: string
  label: string
  path: string
  permission?: string
  description?: string
}

export const MODULE_ROUTE_CONFIG: ModuleRouteConfig[] = [
  {
    id: 'ams',
    label: 'Auction',
    description: 'Contract auctions, procurement and SLA management',
    dashboardPath: '/auction/dashboard',
    available: true,
    submodules: [
      { id: 'ams-dashboard', label: 'Dashboard', path: '/auction/dashboard', description: 'Auction performance and procurement overview' },
      { id: 'ams-auctions', label: 'Auctions', path: '/auction/auctions', permission: 'ams:read', description: 'Live, upcoming and completed sourcing events' },
      { id: 'ams-create-auction', label: 'Create Auction', path: '/auction/auctions/new', permission: 'ams:write', description: 'Create spot, bulk and lot auctions' },
      { id: 'ams-contracts', label: 'Contracts', path: '/auction/contracts', permission: 'ams:read', description: 'Contract registry and award history' },
    ],
  },
  {
    id: 'fleet',
    label: 'Fleet Control',
    description: 'Vehicles, drivers, maintenance, tyres, and fuel',
    dashboardPath: '/fleet',
    available: true,
    submodules: [
      { id: 'fleet-dashboard', label: 'Dashboard', path: '/fleet', description: 'Fleet operations overview' },
      { id: 'fleet-vehicles', label: 'Vehicles', path: '/fleet#vehicles', permission: 'fleet:read', description: 'Vehicle master, utilization and health' },
      { id: 'fleet-drivers', label: 'Drivers', path: '/fleet#drivers', permission: 'fleet:read', description: 'Driver readiness and compliance' },
      { id: 'fleet-maintenance', label: 'Maintenance', path: '/fleet#maintenance', permission: 'fleet:read', description: 'Work orders and service planning' },
      { id: 'fleet-tyres', label: 'Tyres', path: '/fleet#tyres', permission: 'fleet:read', description: 'Tyre inventory, inspections and job cards' },
      { id: 'fleet-fuel', label: 'Fuel & Energy', path: '/fleet#fuel', permission: 'fleet:read', description: 'Fuel events and cost health' },
    ],
  },
  {
    id: 'vendor',
    label: 'Vendor',
    description: 'Vendor profiles, ratings, documents and agreements',
    dashboardPath: '/vendor',
    available: true,
    submodules: [
      { id: 'vendor-dashboard', label: 'Dashboard', path: '/vendor', description: 'Vendor operations overview' },
      { id: 'vendor-sourcing', label: 'Sourcing', path: '/vendor/sourcing', permission: 'vendor:read', description: 'Auction invitations and bidding' },
      { id: 'vendor-contracts', label: 'Contracts', path: '/vendor/contracts', permission: 'vendor:read', description: 'Rate contracts and validity' },
      { id: 'vendor-trips', label: 'Trips', path: '/vendor/trips', permission: 'vendor:read', description: 'Indents, active trips and delivery status' },
      { id: 'vendor-fleet', label: 'Fleet', path: '/vendor/fleet', permission: 'vendor:read', description: 'Vendor vehicles and drivers' },
      { id: 'vendor-invoices', label: 'Invoices', path: '/vendor/invoices', permission: 'vendor:read', description: 'Billing, ledger and payment status' },
    ],
  },
  {
    id: 'customer',
    label: 'Customer',
    description: 'Customer accounts, SLAs, contracts and support',
    dashboardPath: '/customer',
    available: true,
    submodules: [
      { id: 'customer-dashboard', label: 'Dashboard', path: '/customer', description: 'Customer portal scaffold' },
      { id: 'customer-contracts', label: 'Contracts', path: '/customer#contracts', permission: 'customer:read', description: 'Future customer contract workspace' },
      { id: 'customer-requests', label: 'Requests', path: '/customer#requests', permission: 'customer:read', description: 'Future service request workspace' },
    ],
  },
  {
    id: 'driver',
    label: 'Driver',
    description: 'Driver profiles, assignments and compliance',
    dashboardPath: '/driver',
    available: true,
    submodules: [
      { id: 'driver-dashboard', label: 'Dashboard', path: '/driver', description: 'Driver portal scaffold' },
      { id: 'driver-assignments', label: 'Assignments', path: '/driver#assignments', permission: 'driver:read', description: 'Future driver trip assignment workspace' },
      { id: 'driver-compliance', label: 'Compliance', path: '/driver#compliance', permission: 'driver:read', description: 'Future driver document and compliance workspace' },
    ],
  },
  {
    id: 'tms',
    label: 'Booking',
    description: 'Transport and freight bookings',
    dashboardPath: '/booking',
    available: false,
    submodules: [
      { id: 'tms-bookings', label: 'Bookings', path: '/booking', permission: 'tms:read' },
      { id: 'tms-control-tower', label: 'Control Tower', path: '/booking#control-tower', permission: 'tms:read' },
    ],
  },
  {
    id: 'tracking',
    label: 'Tracking',
    description: 'Live trip visibility and ETA',
    dashboardPath: '/tracking',
    available: false,
    submodules: [
      { id: 'tracking-live', label: 'Live Map', path: '/tracking', permission: 'tracking:read' },
      { id: 'tracking-exceptions', label: 'Exceptions', path: '/tracking#exceptions', permission: 'tracking:read' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Invoicing, ledgers and settlements',
    dashboardPath: '/finance',
    available: false,
    submodules: [
      { id: 'finance-dashboard', label: 'Dashboard', path: '/finance', permission: 'finance:read' },
      { id: 'finance-invoices', label: 'Invoices', path: '/finance#invoices', permission: 'finance:read' },
      { id: 'finance-ledger', label: 'Ledger', path: '/finance#ledger', permission: 'finance:read' },
    ],
  },
  {
    id: 'reporting',
    label: 'Reporting',
    description: 'Dashboards and analytics',
    dashboardPath: '/reporting',
    available: false,
    submodules: [
      { id: 'reporting-dashboard', label: 'Dashboards', path: '/reporting', permission: 'reporting:read' },
      { id: 'reporting-exports', label: 'Exports', path: '/reporting#exports', permission: 'reporting:read' },
    ],
  },
  {
    id: 'ptl',
    label: 'PTL',
    description: 'Part-truck-load operations',
    dashboardPath: '/ptl',
    available: false,
    submodules: [
      { id: 'ptl-bookings', label: 'Bookings', path: '/ptl', permission: 'ptl:read' },
      { id: 'ptl-hubs', label: 'Hub Operations', path: '/ptl#hubs', permission: 'ptl:read' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    description: 'System configuration, users and tenants',
    dashboardPath: '/admin',
    available: true,
    submodules: [
      { id: 'admin-dashboard', label: 'Dashboard', path: '/admin', description: 'Administration landing workspace' },
      { id: 'admin-users', label: 'Users', path: '/admin#users', permission: 'admin:read', description: 'Future user administration' },
      { id: 'admin-tenants', label: 'Tenants', path: '/admin#tenants', permission: 'admin:read', description: 'Future tenant administration' },
    ],
  },
]

export const MODULE_ROUTES = MODULE_ROUTE_CONFIG.reduce(
  (routes, module) => {
    routes[module.id] = module.dashboardPath
    return routes
  },
  {} as Record<ERPModule, string>
)

export function getModuleConfig(module: ERPModule) {
  return MODULE_ROUTE_CONFIG.find((item) => item.id === module)
}

export function getAvailableModuleConfigs() {
  return MODULE_ROUTE_CONFIG.filter((item) => item.available)
}

export function canUserAccessModule(user: User | null, module: ERPModule) {
  if (!user) return false
  if (user.permissions.includes('all')) return true
  return user.modules.includes(module)
}

export function canUserAccessSubmodule(user: User | null, submodule: ModuleSubmoduleConfig) {
  if (!user) return false
  if (!submodule.permission) return true
  if (user.permissions.includes('all')) return true
  return user.permissions.includes(submodule.permission)
}

export function getAccessibleSubmodules(user: User | null, module: ModuleRouteConfig) {
  return module.submodules.filter((submodule) => canUserAccessSubmodule(user, submodule))
}

export function getAccessibleModules(user: User | null, options: { availableOnly?: boolean } = {}) {
  return MODULE_ROUTE_CONFIG.filter((module) => {
    if (options.availableOnly && !module.available) return false
    return canUserAccessModule(user, module.id)
  })
}

export function getPostLoginRouteForUser(user: User | null) {
  if (!user) return '/login'

  const availableModules = getAccessibleModules(user, { availableOnly: true })
  const onlyModule = availableModules[0]
  if (availableModules.length === 1 && onlyModule) return onlyModule.dashboardPath

  return '/modules'
}
