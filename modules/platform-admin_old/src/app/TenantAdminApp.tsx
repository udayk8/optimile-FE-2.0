import { useEffect, useState } from 'react'
import { AuthProvider } from '@shared-auth'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { MockStoreProvider, useMockStore } from '../store/mock-store'
import { SessionProvider, useSessionContext } from '../shared/auth/session-context'
import { ThemeProvider } from '../components/layout/theme-provider'
import { TenantLayout } from '../layouts/tenant/tenant-layout'
import { storageKeys, writeStoredValue } from '../lib/storage/browser-storage'
import { TenantDashboardPage } from '../modules/tenant-admin/pages/dashboard/tenant-dashboard-page'
import { TenantCustomersPage, TenantCustomerDetailPage } from '../modules/tenant-admin/pages/customers/tenant-customers-pages'
import { TenantVendorsPage, TenantVendorDetailPage } from '../modules/tenant-admin/pages/vendors/tenant-vendors-pages'
import { TenantDriversPage, TenantVehiclesPage } from '../modules/tenant-admin/pages/fleet/tenant-fleet-pages'
import { TenantVehicleTypesPage, TenantMaterialsPage, TenantUOMConfigurationPage, TenantLRConfigPage } from '../modules/tenant-admin/pages/master-data/tenant-master-data-pages'
import { TenantRoleDetailPage, TenantUserDetailPage } from '../modules/tenant-admin/pages/access/tenant-access-detail-pages'
import { TenantAuditLogsPage, TenantHierarchyPage, TenantModulesPage, TenantOrgUnitsPage, TenantRolePermissionsPage, TenantRolesPage, TenantSettingsPage, TenantUsersPage } from '../modules/tenant-admin/pages/shared/tenant-placeholder-pages'

type RouteMode = 'tenant-admin' | 'root-tenant'

function TenantBookingRedirect({ suffix = '' }: { suffix?: string }) {
  const { tenantId = 'tenant-northstar', bookingId = '' } = useParams()
  const { session, setSession } = useSessionContext()
  const { getTenantPrimaryAdminUser, listTenantRoles } = useMockStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const primaryAdmin = getTenantPrimaryAdminUser(tenantId)
    const tenantAdminRole = listTenantRoles(tenantId).find((role) =>
      role.name.toLowerCase().includes('tenant admin'),
    )
    const actorName =
      primaryAdmin?.email?.trim() ||
      primaryAdmin?.name?.trim() ||
      session.actorName ||
      'Tenant Admin'
    const nextSession = {
      ...session,
      actorType: 'tenant_admin' as const,
      tenantId,
      actorName,
      previewTenantRoleId:
        primaryAdmin?.roleId ?? tenantAdminRole?.id ?? session.previewTenantRoleId ?? null,
    }
    const unchanged =
      session.actorType === nextSession.actorType &&
      session.tenantId === nextSession.tenantId &&
      session.actorName === nextSession.actorName &&
      (session.previewTenantRoleId ?? null) === (nextSession.previewTenantRoleId ?? null)

    writeStoredValue(storageKeys.sessionContext, nextSession)
    if (!unchanged) {
      setSession(nextSession)
    }
    setReady(true)
  }, [
    getTenantPrimaryAdminUser,
    listTenantRoles,
    session,
    setSession,
    tenantId,
  ])

  if (!ready) {
    return null
  }

  const path = bookingId
    ? `/tms/booking/tenant/${tenantId}/bookings/${bookingId}${suffix}`
    : `/tms/booking/tenant/${tenantId}/bookings${suffix}`

  return <Navigate to={path} replace />
}

function TenantAdminRoutes({ routeMode = 'tenant-admin' }: { routeMode?: RouteMode }) {
  const tenantRootPath = routeMode === 'root-tenant' ? ':tenantId' : 'tenant/:tenantId'
  const indexTarget = routeMode === 'root-tenant' ? 'tenant-northstar/dashboard' : 'tenant/tenant-northstar/dashboard'

  return (
    <Routes>
      <Route
        element={
          <ThemeProvider>
            <SessionProvider>
              <MockStoreProvider>
                <Outlet />
              </MockStoreProvider>
            </SessionProvider>
          </ThemeProvider>
        }
      >
        <Route index element={<Navigate to={indexTarget} replace />} />
        <Route path={tenantRootPath} element={<TenantLayout />}>
          <Route path="dashboard" element={<TenantDashboardPage />} />
          <Route path="hierarchy" element={<TenantHierarchyPage />} />
          <Route path="org-units" element={<TenantOrgUnitsPage />} />
          <Route path="customers" element={<TenantCustomersPage />} />
          <Route path="customers/:tenantCustomerId" element={<TenantCustomerDetailPage />} />
          <Route path="vendors" element={<TenantVendorsPage />} />
          <Route path="vendors/:tenantVendorId" element={<TenantVendorDetailPage />} />
          <Route path="users" element={<TenantUsersPage />} />
          <Route path="users/:userId" element={<TenantUserDetailPage />} />
          <Route path="roles" element={<TenantRolesPage />} />
          <Route path="roles/:roleId" element={<TenantRoleDetailPage />} />
          <Route path="role-permissions" element={<TenantRolePermissionsPage />} />
          <Route path="vehicle-types" element={<TenantVehicleTypesPage />} />
          <Route path="vehicles" element={<TenantVehiclesPage />} />
          <Route path="drivers" element={<TenantDriversPage />} />
          <Route path="materials" element={<TenantMaterialsPage />} />
          <Route path="uom-config" element={<TenantUOMConfigurationPage />} />
          <Route path="lr-config" element={<TenantLRConfigPage />} />
          <Route path="bookings" element={<TenantBookingRedirect />} />
          <Route path="bookings/create" element={<TenantBookingRedirect suffix="/create" />} />
          <Route path="bookings/rate-approval" element={<TenantBookingRedirect suffix="/rate-approval" />} />
          <Route path="bookings/assignment" element={<TenantBookingRedirect suffix="/assignment" />} />
          <Route path="bookings/live-tracking" element={<TenantBookingRedirect suffix="/live-tracking" />} />
          <Route path="bookings/completed" element={<TenantBookingRedirect suffix="/completed" />} />
          <Route path="bookings/:bookingId/edit" element={<TenantBookingRedirect suffix="/edit" />} />
          <Route path="bookings/:bookingId/documents" element={<TenantBookingRedirect suffix="/documents" />} />
          <Route path="bookings/:bookingId/lr" element={<TenantBookingRedirect suffix="/lr" />} />
          <Route path="bookings/:bookingId" element={<TenantBookingRedirect />} />
          <Route path="modules" element={<TenantModulesPage />} />
          <Route path="audit-logs" element={<TenantAuditLogsPage />} />
          <Route path="settings" element={<TenantSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={indexTarget} replace />} />
      </Route>
    </Routes>
  )
}

export default function TenantAdminApp({ standalone = false, routeMode = 'tenant-admin' }: { standalone?: boolean; routeMode?: RouteMode }) {
  const routes = <TenantAdminRoutes routeMode={routeMode} />

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

