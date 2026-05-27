import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Building2, LayoutDashboard, Package2 } from 'lucide-react'
import type { ModuleManifest } from '@shared-ui'
import { MockStoreProvider } from '@/shared/store/mock-store'
import { SessionProvider } from '@/shared/auth/session-context'
import { PlatformDashboardPage } from '@/modules/platform-admin/pages/dashboard/platform-dashboard-page'
import { PlatformTenantsPage } from '@/modules/platform-admin/pages/tenants/platform-tenants-page'
import { PlatformTenantDetailPage } from '@/modules/platform-admin/pages/tenants/platform-tenant-detail-page'
import { PlatformModulesPage } from '@/modules/platform-admin/pages/modules/platform-modules-page'

function PlatformRouteWrapper({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <MockStoreProvider>{children}</MockStoreProvider>
    </SessionProvider>
  )
}

function PlatformSurface({ children }: { children: ReactNode }) {
  return <div className="min-w-0 overflow-x-hidden px-4 py-6 text-sm text-foreground sm:px-6 lg:px-8">{children}</div>
}

export const platformAdminManifest: ModuleManifest = {
  key: 'platform-admin',
  label: 'Platform Admin',
  icon: Building2,
  basePath: '/platform-admin',
  sidebar: [
    { label: 'Dashboard', path: '/platform-admin/dashboard', icon: LayoutDashboard },
    { label: 'Tenants', path: '/platform-admin/tenants', icon: Building2 },
    { label: 'Modules', path: '/platform-admin/modules', icon: Package2 },
  ],
  wrapper: PlatformRouteWrapper,
  routes: [
    { index: true, element: <Navigate to="/platform-admin/dashboard" replace /> },
    { path: 'dashboard', element: <PlatformSurface><PlatformDashboardPage /></PlatformSurface> },
    { path: 'tenants', element: <PlatformSurface><PlatformTenantsPage /></PlatformSurface> },
    { path: 'tenants/:tenantId', element: <PlatformSurface><PlatformTenantDetailPage /></PlatformSurface> },
    { path: 'modules', element: <PlatformSurface><PlatformModulesPage /></PlatformSurface> },
    { path: '*', element: <Navigate to="/platform-admin/dashboard" replace /> },
  ],
}
