import type { DemoRole } from './roles'
import { getAuthMode, getSelectedRole } from './utils/authStorage'
import type { ModulePermission } from './permissions'

export const ROLE_MODULE_PERMISSIONS: Record<DemoRole, ModulePermission[] | 'all'> = {
  'CEO (All Access)': 'all',
  'Fleet Manager': ['dashboard', 'fleet-management', 'ftl-booking', 'fleet', 'trips'],
  'Finance Manager': ['dashboard', 'finance', 'expenses', 'invoices'],
  'Procurement Head': ['dashboard', 'auction', 'vendor-management', 'sourcing', 'contracts', 'profile'],
  'Ops Head': ['dashboard', 'fleet-management', 'track-and-trace', 'fleet', 'trips'],
  'Regional Manager': ['dashboard', 'sourcing', 'contracts', 'trips', 'fleet', 'profile'],
}

export function canAccessModule(module: ModulePermission, role = getSelectedRole()) {
  const authMode = getAuthMode()

  if (authMode === 'token') return true
  if (!role) return false

  const permissions = ROLE_MODULE_PERMISSIONS[role]
  return permissions === 'all' || permissions.includes(module)
}

export function getAllowedModules<T extends { module: ModulePermission }>(items: readonly T[]) {
  return items.filter((item) => canAccessModule(item.module))
}

export type FleetAppPage =
  | 'dashboard'
  | 'my-tasks'
  | 'ops-intelligence'
  | 'exception-center'
  | 'alert-management'
  | 'driver-behavior'
  | 'data-coverage'
  | 'reconciliation'
  | 'live-map'
  | 'dispatch-console'
  | 'vehicle-management'
  | 'driver-management'
  | 'compliance'
  | 'maintenance'
  | 'garage-mgmt'
  | 'battery-mgmt'
  | 'tyre-management'
  | 'tyre-inventory'
  | 'tyre-visual-tracker'
  | 'tyre-job-cards'
  | 'tyre-inspections'
  | 'vehicle-master'
  | 'vendor-ledger'
  | 'inventory'
  | 'inventory-transactions'
  | 'fuel-energy'
  | 'cost-health';

export type Role =
  | 'Fleet Manager'
  | 'Garage Manager'
  | 'Technician'
  | 'Operations Manager'
  | 'Finance Manager'
  | 'System Admin';

export const FLEET_DEMO_ROLES: Role[] = [
  'Fleet Manager',
  'Garage Manager',
  'Technician',
  'Operations Manager',
  'Finance Manager',
  'System Admin',
];

export type Permission =
  | 'fleet.dashboard.view'
  | 'fleet.tasks.view'
  | 'fleet.ops.view'
  | 'fleet.exception.view'
  | 'fleet.exception.resolve'
  | 'fleet.alert.view'
  | 'fleet.alert.create'
  | 'fleet.alert.edit'
  | 'fleet.alert.manage'
  | 'fleet.driver.view'
  | 'fleet.driver.create'
  | 'fleet.driver.edit'
  | 'fleet.driver.delete'
  | 'fleet.driver.behavior.view'
  | 'fleet.dataCoverage.view'
  | 'fleet.reconciliation.view'
  | 'fleet.liveMap.view'
  | 'fleet.dispatch.view'
  | 'fleet.dispatch.assign'
  | 'fleet.vehicle.view'
  | 'fleet.vehicle.create'
  | 'fleet.vehicle.edit'
  | 'fleet.vehicle.delete'
  | 'fleet.vehicle.export'
  | 'fleet.compliance.view'
  | 'fleet.compliance.upload'
  | 'fleet.maintenance.view'
  | 'fleet.maintenance.create'
  | 'fleet.maintenance.update'
  | 'fleet.maintenance.approve'
  | 'fleet.maintenance.close'
  | 'fleet.garage.view'
  | 'fleet.battery.view'
  | 'fleet.battery.create'
  | 'fleet.battery.edit'
  | 'fleet.battery.inspect'
  | 'fleet.battery.replace'
  | 'fleet.tyre.view'
  | 'fleet.tyre.create'
  | 'fleet.tyre.edit'
  | 'fleet.tyre.inspect'
  | 'fleet.tyre.jobCard'
  | 'fleet.tyre.manage'
  | 'fleet.inventory.view'
  | 'fleet.inventory.create'
  | 'fleet.inventory.edit'
  | 'fleet.inventory.raisePR'
  | 'fleet.inventory.manage'
  | 'fleet.inventory.stockIn'
  | 'fleet.inventory.issue'
  | 'fleet.inventory.adjust'
  | 'fleet.inventory.deactivate'
  | 'fleet.inventory.transactions.view'
  | 'fleet.vendorLedger.view'
  | 'fleet.fuel.view'
  | 'fleet.fuel.review'
  | 'fleet.fuel.approve'
  | 'fleet.fuel.reject'
  | 'fleet.cost.view'
  | 'fleet.reports.export';

const ALL_PERMISSIONS: Permission[] = [
  'fleet.dashboard.view',
  'fleet.tasks.view',
  'fleet.ops.view',
  'fleet.exception.view',
  'fleet.exception.resolve',
  'fleet.alert.view',
  'fleet.alert.create',
  'fleet.alert.edit',
  'fleet.alert.manage',
  'fleet.driver.view',
  'fleet.driver.create',
  'fleet.driver.edit',
  'fleet.driver.delete',
  'fleet.driver.behavior.view',
  'fleet.dataCoverage.view',
  'fleet.reconciliation.view',
  'fleet.liveMap.view',
  'fleet.dispatch.view',
  'fleet.dispatch.assign',
  'fleet.vehicle.view',
  'fleet.vehicle.create',
  'fleet.vehicle.edit',
  'fleet.vehicle.delete',
  'fleet.vehicle.export',
  'fleet.compliance.view',
  'fleet.compliance.upload',
  'fleet.maintenance.view',
  'fleet.maintenance.create',
  'fleet.maintenance.update',
  'fleet.maintenance.approve',
  'fleet.maintenance.close',
  'fleet.garage.view',
  'fleet.battery.view',
  'fleet.battery.create',
  'fleet.battery.edit',
  'fleet.battery.inspect',
  'fleet.battery.replace',
  'fleet.tyre.view',
  'fleet.tyre.create',
  'fleet.tyre.edit',
  'fleet.tyre.inspect',
  'fleet.tyre.jobCard',
  'fleet.tyre.manage',
  'fleet.inventory.view',
  'fleet.inventory.create',
  'fleet.inventory.edit',
  'fleet.inventory.raisePR',
  'fleet.inventory.manage',
  'fleet.inventory.stockIn',
  'fleet.inventory.issue',
  'fleet.inventory.adjust',
  'fleet.inventory.deactivate',
  'fleet.inventory.transactions.view',
  'fleet.vendorLedger.view',
  'fleet.fuel.view',
  'fleet.fuel.review',
  'fleet.fuel.approve',
  'fleet.fuel.reject',
  'fleet.cost.view',
  'fleet.reports.export',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  'Fleet Manager': ALL_PERMISSIONS,
  'Garage Manager': [
    'fleet.dashboard.view',
    'fleet.tasks.view',
    'fleet.ops.view',
    'fleet.exception.view',
    'fleet.exception.resolve',
    'fleet.alert.view',
    'fleet.alert.create',
    'fleet.alert.edit',
    'fleet.vehicle.view',
    'fleet.driver.view',
    'fleet.compliance.view',
    'fleet.maintenance.view',
    'fleet.maintenance.create',
    'fleet.maintenance.update',
    'fleet.maintenance.approve',
    'fleet.maintenance.close',
    'fleet.garage.view',
    'fleet.battery.view',
    'fleet.battery.create',
    'fleet.battery.edit',
    'fleet.battery.inspect',
    'fleet.battery.replace',
    'fleet.tyre.view',
    'fleet.tyre.create',
    'fleet.tyre.edit',
    'fleet.tyre.inspect',
    'fleet.tyre.jobCard',
    'fleet.tyre.manage',
    'fleet.inventory.view',
    'fleet.inventory.create',
    'fleet.inventory.edit',
    'fleet.inventory.raisePR',
    'fleet.inventory.manage',
    'fleet.inventory.stockIn',
    'fleet.inventory.issue',
    'fleet.inventory.adjust',
    'fleet.inventory.deactivate',
    'fleet.inventory.transactions.view',
    'fleet.reports.export',
  ],
  Technician: [
    'fleet.dashboard.view',
    'fleet.tasks.view',
    'fleet.maintenance.view',
    'fleet.maintenance.update',
    'fleet.garage.view',
    'fleet.battery.view',
    'fleet.battery.inspect',
    'fleet.battery.replace',
    'fleet.tyre.view',
    'fleet.tyre.inspect',
    'fleet.tyre.jobCard',
    'fleet.tyre.manage',
    'fleet.inventory.view',
    'fleet.inventory.raisePR',
  ],
  'Operations Manager': [
    'fleet.dashboard.view',
    'fleet.tasks.view',
    'fleet.ops.view',
    'fleet.exception.view',
    'fleet.exception.resolve',
    'fleet.alert.view',
    'fleet.driver.view',
    'fleet.driver.behavior.view',
    'fleet.dataCoverage.view',
    'fleet.liveMap.view',
    'fleet.dispatch.view',
    'fleet.dispatch.assign',
    'fleet.vehicle.view',
    'fleet.compliance.view',
    'fleet.maintenance.view',
  ],
  'Finance Manager': [
    'fleet.dashboard.view',
    'fleet.tasks.view',
    'fleet.ops.view',
    'fleet.exception.view',
    'fleet.reconciliation.view',
    'fleet.vehicle.view',
    'fleet.vendorLedger.view',
    'fleet.fuel.view',
    'fleet.fuel.review',
    'fleet.fuel.approve',
    'fleet.fuel.reject',
    'fleet.cost.view',
    'fleet.reports.export',
  ],
  'System Admin': ALL_PERMISSIONS,
};

export const FLEET_PAGE_PERMISSIONS: Record<FleetAppPage, Permission> = {
  dashboard: 'fleet.dashboard.view',
  'my-tasks': 'fleet.tasks.view',
  'ops-intelligence': 'fleet.ops.view',
  'exception-center': 'fleet.exception.view',
  'alert-management': 'fleet.alert.view',
  'driver-behavior': 'fleet.driver.behavior.view',
  'data-coverage': 'fleet.dataCoverage.view',
  reconciliation: 'fleet.reconciliation.view',
  'live-map': 'fleet.liveMap.view',
  'dispatch-console': 'fleet.dispatch.view',
  'vehicle-management': 'fleet.vehicle.view',
  'driver-management': 'fleet.driver.view',
  compliance: 'fleet.compliance.view',
  maintenance: 'fleet.maintenance.view',
  'garage-mgmt': 'fleet.garage.view',
  'battery-mgmt': 'fleet.battery.view',
  'tyre-management': 'fleet.tyre.view',
  'tyre-inventory': 'fleet.tyre.view',
  'tyre-visual-tracker': 'fleet.tyre.view',
  'tyre-job-cards': 'fleet.tyre.manage',
  'tyre-inspections': 'fleet.tyre.manage',
  'vehicle-master': 'fleet.vehicle.view',
  'vendor-ledger': 'fleet.vendorLedger.view',
  inventory: 'fleet.inventory.view',
  'inventory-transactions': 'fleet.inventory.transactions.view',
  'fuel-energy': 'fleet.fuel.view',
  'cost-health': 'fleet.cost.view',
};

export const ACTION_PERMISSIONS = {
  createVehicle: 'fleet.vehicle.create',
  editVehicle: 'fleet.vehicle.edit',
  deleteVehicle: 'fleet.vehicle.delete',
  exportVehicles: 'fleet.vehicle.export',
  createDriver: 'fleet.driver.create',
  editDriver: 'fleet.driver.edit',
  deleteDriver: 'fleet.driver.delete',
  uploadCompliance: 'fleet.compliance.upload',
  createWorkOrder: 'fleet.maintenance.create',
  updateWorkOrder: 'fleet.maintenance.update',
  approveWorkOrder: 'fleet.maintenance.approve',
  closeWorkOrder: 'fleet.maintenance.close',
  reviewFuel: 'fleet.fuel.review',
  approveFuelEvent: 'fleet.fuel.approve',
  rejectFuelEvent: 'fleet.fuel.reject',
  manageTyres: 'fleet.tyre.manage',
  createTyre: 'fleet.tyre.create',
  editTyre: 'fleet.tyre.edit',
  createTyreInspection: 'fleet.tyre.inspect',
  createTyreJobCard: 'fleet.tyre.jobCard',
  createBattery: 'fleet.battery.create',
  editBattery: 'fleet.battery.edit',
  inspectBattery: 'fleet.battery.inspect',
  replaceBattery: 'fleet.battery.replace',
  createInventoryItem: 'fleet.inventory.create',
  editInventoryItem: 'fleet.inventory.edit',
  raisePurchaseRequest: 'fleet.inventory.raisePR',
  manageInventory: 'fleet.inventory.manage',
  stockInInventory: 'fleet.inventory.stockIn',
  issueInventory: 'fleet.inventory.issue',
  adjustInventory: 'fleet.inventory.adjust',
  deactivateInventory: 'fleet.inventory.deactivate',
  viewInventoryTransactions: 'fleet.inventory.transactions.view',
  assignDispatch: 'fleet.dispatch.assign',
  manageAlerts: 'fleet.alert.manage',
  resolveException: 'fleet.exception.resolve',
  createAlertRule: 'fleet.alert.create',
  editAlertRule: 'fleet.alert.edit',
  exportReports: 'fleet.reports.export',
} as const satisfies Record<string, Permission>;

export function permissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function getFleetSelectedRole(): Role {
  const storedRole = localStorage.getItem('userRole') ?? localStorage.getItem('optimile_demo_role');
  return FLEET_DEMO_ROLES.includes(storedRole as Role) ? (storedRole as Role) : 'Fleet Manager';
}
