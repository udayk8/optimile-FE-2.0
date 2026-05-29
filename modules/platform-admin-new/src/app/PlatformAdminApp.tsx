import { AuthProvider } from '@shared-auth'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { MockStoreProvider } from '@/shared/store/mock-store'
import { SessionProvider } from '@/shared/auth/session-context'
import { ThemeProvider } from '@/shared/components/layout/theme-provider'
import { PlatformLayout } from '../layouts/platform/platform-layout'
import { PlatformDashboardPage } from '@/modules/platform-admin/pages/dashboard/platform-dashboard-page'
import { PlatformTenantsPage } from '@/modules/platform-admin/pages/tenants/platform-tenants-page'
import { PlatformTenantDetailPage } from '@/modules/platform-admin/pages/tenants/platform-tenant-detail-page'
import { PlatformModulesPage } from '@/modules/platform-admin/pages/modules/platform-modules-page'

// The tenant login is now the unified /login page. Forward old deep links,
// preserving the tenant so it is preselected on the Tenant Admin card.
function LegacyTenantLoginRedirect() {
  const [params] = useSearchParams()
  const tenantId = params.get('tenantId')
  return <Navigate to={`/login${tenantId ? `?tenantId=${tenantId}` : ''}`} replace />
}

function LegacyPlatformTmsRedirect() {
  const location = useLocation()
  const nextPath = location.pathname.replace(/^\/platform-admin\/tms\/booking\//, '/tms/booking/')
  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />
}

// Legacy: tenant workspace used to live under Platform Admin. It is now a
// separate module mounted at /tenant-admin/*; forward old deep links.
function LegacyTenantWorkspaceRedirect() {
  const location = useLocation()
  const nextPath = location.pathname.replace(/^\/platform-admin\/tenant\//, '/tenant-admin/tenant/')
  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />
}

function PlatformAdminRoutes() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <MockStoreProvider>
          <Routes>
            <Route path="tenant-login" element={<LegacyTenantLoginRedirect />} />
            <Route element={<PlatformLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<PlatformDashboardPage />} />
              <Route path="tenants" element={<PlatformTenantsPage />} />
              <Route path="tenants/:tenantId" element={<PlatformTenantDetailPage />} />
              <Route path="modules" element={<PlatformModulesPage />} />
            </Route>
            <Route path="tenant/*" element={<LegacyTenantWorkspaceRedirect />} />
            <Route path="tms/booking/*" element={<LegacyPlatformTmsRedirect />} />
            <Route path="*" element={<Navigate to="/platform-admin/dashboard" replace />} />
          </Routes>
        </MockStoreProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}

export default function PlatformAdminApp({ standalone = false }: { standalone?: boolean }) {
  const routes = <PlatformAdminRoutes />

  if (standalone) {
    return (
      <AuthProvider>
        <BrowserRouter>
          {routes}
        </BrowserRouter>
      </AuthProvider>
    )
  }

  return routes
}
