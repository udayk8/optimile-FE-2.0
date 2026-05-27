import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Boxes,
  Building2,
  LayoutDashboard,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react'
import type { ModuleManifest } from '@shared-ui'
import { MockStoreProvider } from '@/shared/store/mock-store'
import { SessionProvider } from '@/shared/auth/session-context'
import { TenantDashboardPage } from '../modules/tenant-admin/pages/dashboard/tenant-dashboard-page'
import {
  TenantHierarchyPage,
  TenantOrgUnitsPage,
  TenantUsersPage,
  TenantRolesPage,
  TenantRolePermissionsPage,
} from '../modules/tenant-admin/pages/shared/tenant-placeholder-pages'
import { TenantCustomersPage } from '../modules/tenant-admin/pages/customers/tenant-customers-pages'
import { TenantVendorsPage } from '../modules/tenant-admin/pages/vendors/tenant-vendors-pages'
import {
  TenantVehicleTypesPage,
  TenantMaterialsPage,
  TenantUOMConfigurationPage,
} from '../modules/tenant-admin/pages/master-data/tenant-master-data-pages'
import { TenantLRConfigPage } from '../modules/tenant-admin/pages/lr/lr-config-page'
import {
  TenantAddressBookPage,
  TenantAssignmentRulesPage,
  TenantDocumentRulesPage,
  TenantPodRulesPage,
} from '../modules/tenant-admin/pages/booking-setup/booking-setup-pages'
import type { RouteObject } from 'react-router-dom'

function TenantAdminRouteWrapper({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <MockStoreProvider>{children}</MockStoreProvider>
    </SessionProvider>
  )
}

function TenantSurface({ children }: { children: ReactNode }) {
  return <div className="min-w-0 overflow-x-hidden px-4 py-6 text-sm text-foreground sm:px-6 lg:px-8">{children}</div>
}

const TENANT_ADMIN_ROOT = '/tenant-admin'

type TenantRouteConfig = {
  label: string
  icon: typeof LayoutDashboard
  shellPath: string
  legacyPath: string
  element: ReactNode
}

const tenantRouteConfigs: TenantRouteConfig[] = [
  { label: 'Dashboard', icon: LayoutDashboard, shellPath: 'dashboard', legacyPath: 'tenant/:tenantId/dashboard', element: <TenantSurface><TenantDashboardPage /></TenantSurface> },
  { label: 'Hierarchy Setup', icon: Building2, shellPath: 'hierarchy', legacyPath: 'tenant/:tenantId/hierarchy', element: <TenantSurface><TenantHierarchyPage /></TenantSurface> },
  { label: 'Org Units', icon: Building2, shellPath: 'org-units', legacyPath: 'tenant/:tenantId/org-units', element: <TenantSurface><TenantOrgUnitsPage /></TenantSurface> },
  { label: 'Users', icon: Users, shellPath: 'users', legacyPath: 'tenant/:tenantId/users', element: <TenantSurface><TenantUsersPage /></TenantSurface> },
  { label: 'Roles', icon: ShieldCheck, shellPath: 'roles', legacyPath: 'tenant/:tenantId/roles', element: <TenantSurface><TenantRolesPage /></TenantSurface> },
  { label: 'Role Permissions', icon: ShieldCheck, shellPath: 'role-permissions', legacyPath: 'tenant/:tenantId/role-permissions', element: <TenantSurface><TenantRolePermissionsPage /></TenantSurface> },
  { label: 'Customers', icon: Users, shellPath: 'customers', legacyPath: 'tenant/:tenantId/customers', element: <TenantSurface><TenantCustomersPage /></TenantSurface> },
  { label: 'Vendors', icon: Truck, shellPath: 'vendors', legacyPath: 'tenant/:tenantId/vendors', element: <TenantSurface><TenantVendorsPage /></TenantSurface> },
  { label: 'Vehicle Types', icon: Truck, shellPath: 'vehicle-types', legacyPath: 'tenant/:tenantId/vehicle-types', element: <TenantSurface><TenantVehicleTypesPage /></TenantSurface> },
  { label: 'Materials', icon: Boxes, shellPath: 'materials', legacyPath: 'tenant/:tenantId/materials', element: <TenantSurface><TenantMaterialsPage /></TenantSurface> },
  { label: 'UOM', icon: Boxes, shellPath: 'uom-config', legacyPath: 'tenant/:tenantId/uom-config', element: <TenantSurface><TenantUOMConfigurationPage /></TenantSurface> },
  { label: 'Address Book', icon: Building2, shellPath: 'address-book', legacyPath: 'tenant/:tenantId/address-book', element: <TenantSurface><TenantAddressBookPage /></TenantSurface> },
  { label: 'LR Configuration', icon: ShieldCheck, shellPath: 'lr-config', legacyPath: 'tenant/:tenantId/lr-config', element: <TenantSurface><TenantLRConfigPage /></TenantSurface> },
  { label: 'Assignment Rules', icon: ShieldCheck, shellPath: 'assignment-rules', legacyPath: 'tenant/:tenantId/assignment-rules', element: <TenantSurface><TenantAssignmentRulesPage /></TenantSurface> },
  { label: 'Document Rules', icon: ShieldCheck, shellPath: 'document-rules', legacyPath: 'tenant/:tenantId/document-rules', element: <TenantSurface><TenantDocumentRulesPage /></TenantSurface> },
  { label: 'POD Rules', icon: ShieldCheck, shellPath: 'pod-rules', legacyPath: 'tenant/:tenantId/pod-rules', element: <TenantSurface><TenantPodRulesPage /></TenantSurface> },
]

function withLegacyAlias(config: TenantRouteConfig): RouteObject[] {
  return [
    { path: config.shellPath, element: config.element },
    { path: config.legacyPath, element: config.element },
  ]
}

export const tenantAdminManifest: ModuleManifest = {
  key: 'tenant-admin',
  label: 'Tenant Admin',
  icon: Building2,
  basePath: '/tenant-admin',
  sidebar: tenantRouteConfigs.map((route) => ({
    label: route.label,
    path: `${TENANT_ADMIN_ROOT}/${route.shellPath}`,
    icon: route.icon,
  })),
  wrapper: TenantAdminRouteWrapper,
  routes: [
    { index: true, element: <Navigate to={`${TENANT_ADMIN_ROOT}/dashboard`} replace /> },
    ...tenantRouteConfigs.flatMap(withLegacyAlias),
    { path: '*', element: <Navigate to={`${TENANT_ADMIN_ROOT}/dashboard`} replace /> },
  ],
}
