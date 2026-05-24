import { AuthProvider } from '@shared-auth'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { MockStoreProvider } from '../store/mock-store'
import { SessionProvider } from '../shared/auth/session-context'
import { ThemeProvider } from '../components/layout/theme-provider'
import { PlatformLayout } from '../layouts/platform/platform-layout'
import { PlatformDashboardPage } from '@/modules/platform-admin/pages/dashboard/platform-dashboard-page'
import { PlatformTenantsPage } from '@/modules/platform-admin/pages/tenants/platform-tenants-page'
import { PlatformTenantDetailPage } from '@/modules/platform-admin/pages/tenants/platform-tenant-detail-page'
import { PlatformModulesPage } from '@/modules/platform-admin/pages/modules/platform-modules-page'
import { TenantAdminLoginPage } from '@/modules/platform-admin/pages/tenant-login/tenant-admin-login-page'
import TenantAdminApp from './TenantAdminApp'

function LegacyPlatformTmsRedirect() {
  const location = useLocation()
  const nextPath = location.pathname.replace(/^\/platform-admin\/tms\/booking\//, '/tms/booking/')
  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />
}

function PlatformAdminRoutes() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <MockStoreProvider>
          <Routes>
            <Route path="tenant-login" element={<TenantAdminLoginPage />} />
            <Route element={<PlatformLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<PlatformDashboardPage />} />
              <Route path="tenants" element={<PlatformTenantsPage />} />
              <Route path="tenants/:tenantId" element={<PlatformTenantDetailPage />} />
              <Route path="modules" element={<PlatformModulesPage />} />
            </Route>
            <Route path="tenant/*" element={<TenantAdminApp routeMode="root-tenant" providersAlreadyMounted />} />
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


