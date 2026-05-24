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
// Master-data pages live in the legacy file; the LR config / operations
// pages have an active, governance-aware implementation under pages/lr.
import { TenantVehicleTypesPage, TenantMaterialsPage, TenantUOMConfigurationPage } from '../modules/tenant-admin/pages/master-data/tenant-master-data-pages'
import { TenantLRConfigPage } from '../modules/tenant-admin/pages/lr/lr-config-page'
import { TenantLrOperationsPage } from '../modules/tenant-admin/pages/lr/lr-operations-page'
import { TenantRoleDetailPage, TenantUserDetailPage } from '../modules/tenant-admin/pages/access/tenant-access-detail-pages'
import { TenantAuditLogsPage, TenantHierarchyPage, TenantModulesPage, TenantOrgUnitsPage, TenantRolePermissionsPage, TenantRolesPage, TenantSettingsPage, TenantUsersPage } from '../modules/tenant-admin/pages/shared/tenant-placeholder-pages'
import {
  BookingSetupOverviewPage,
  TenantAddressBookPage,
  TenantAssignmentRulesPage,
  TenantDocumentRulesPage,
  TenantPodRulesPage,
} from '../modules/tenant-admin/pages/booking-setup/booking-setup-pages'
import { PermissionGate } from '../modules/tenant-admin/components/permission-gate'

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

function TenantAdminRoutes({
  routeMode = 'tenant-admin',
  providersAlreadyMounted = false,
}: {
  routeMode?: RouteMode
  providersAlreadyMounted?: boolean
}) {
  const tenantRootPath = routeMode === 'root-tenant' ? ':tenantId' : 'tenant/:tenantId'
  const indexTarget = routeMode === 'root-tenant' ? 'tenant-northstar/dashboard' : 'tenant/tenant-northstar/dashboard'

  const providersWrapper = providersAlreadyMounted ? (
    <Outlet />
  ) : (
    <ThemeProvider>
      <SessionProvider>
        <MockStoreProvider>
          <Outlet />
        </MockStoreProvider>
      </SessionProvider>
    </ThemeProvider>
  )

  return (
    <Routes>
      <Route element={providersWrapper}>
        <Route index element={<Navigate to={indexTarget} replace />} />
        <Route path={tenantRootPath} element={<TenantLayout />}>
          <Route path="dashboard" element={<TenantDashboardPage />} />
          <Route path="hierarchy" element={<TenantHierarchyPage />} />
          <Route path="org-units" element={<TenantOrgUnitsPage />} />
          <Route path="customers" element={<PermissionGate moduleCode="TMS" featureCode="CUSTOMERS"><TenantCustomersPage /></PermissionGate>} />
          <Route path="customers/:tenantCustomerId" element={<PermissionGate moduleCode="TMS" featureCode="CUSTOMERS"><TenantCustomerDetailPage /></PermissionGate>} />
          <Route path="vendors" element={<PermissionGate moduleCode="TMS" featureCode="VENDORS"><TenantVendorsPage /></PermissionGate>} />
          <Route path="vendors/:tenantVendorId" element={<PermissionGate moduleCode="TMS" featureCode="VENDORS"><TenantVendorDetailPage /></PermissionGate>} />
          <Route path="users" element={<TenantUsersPage />} />
          <Route path="users/:userId" element={<TenantUserDetailPage />} />
          <Route path="roles" element={<TenantRolesPage />} />
          <Route path="roles/:roleId" element={<TenantRoleDetailPage />} />
          <Route path="role-permissions" element={<TenantRolePermissionsPage />} />
          <Route path="vehicle-types" element={<PermissionGate moduleCode="TMS" featureCode="VEHICLE_TYPES"><TenantVehicleTypesPage /></PermissionGate>} />
          <Route path="vehicles" element={<PermissionGate moduleCode="TMS" featureCode="VEHICLE_TYPES"><TenantVehiclesPage /></PermissionGate>} />
          <Route path="drivers" element={<PermissionGate moduleCode="TMS" featureCode="VEHICLE_TYPES"><TenantDriversPage /></PermissionGate>} />
          <Route path="materials" element={<PermissionGate moduleCode="TMS" featureCode="MATERIALS"><TenantMaterialsPage /></PermissionGate>} />
          <Route path="uom-config" element={<PermissionGate moduleCode="TMS" featureCode="UOM"><TenantUOMConfigurationPage /></PermissionGate>} />
          <Route path="lr-config" element={<PermissionGate moduleCode="TMS" featureCode="LR_CONFIGURATION"><TenantLRConfigPage /></PermissionGate>} />
          <Route path="lr" element={<PermissionGate moduleCode="TMS" featureCode="LR_MANAGEMENT"><TenantLrOperationsPage /></PermissionGate>} />
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
          <Route path="booking-setup" element={<PermissionGate moduleCode="TMS" featureCode="BOOKING_DASHBOARD"><BookingSetupOverviewPage /></PermissionGate>} />
          <Route path="address-book" element={<PermissionGate moduleCode="TMS" featureCode="ADDRESS_BOOK"><TenantAddressBookPage /></PermissionGate>} />
          <Route path="assignment-rules" element={<PermissionGate moduleCode="TMS" featureCode="ASSIGNMENT_RULES"><TenantAssignmentRulesPage /></PermissionGate>} />
          <Route path="document-rules" element={<PermissionGate moduleCode="TMS" featureCode="DOCUMENT_RULES"><TenantDocumentRulesPage /></PermissionGate>} />
          <Route path="pod-rules" element={<PermissionGate moduleCode="TMS" featureCode="POD_RULES"><TenantPodRulesPage /></PermissionGate>} />
          <Route path="audit-logs" element={<TenantAuditLogsPage />} />
          <Route path="settings" element={<TenantSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={indexTarget} replace />} />
      </Route>
    </Routes>
  )
}

export default function TenantAdminApp({
  standalone = false,
  routeMode = 'tenant-admin',
  providersAlreadyMounted = false,
}: {
  standalone?: boolean
  routeMode?: RouteMode
  providersAlreadyMounted?: boolean
}) {
  const routes = <TenantAdminRoutes routeMode={routeMode} providersAlreadyMounted={providersAlreadyMounted} />

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


