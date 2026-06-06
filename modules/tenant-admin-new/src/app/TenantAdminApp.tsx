import { lazy, useEffect, useState } from 'react'
import { AuthProvider } from '@shared-auth'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { MockStoreProvider, useMockStore } from '@/shared/store/mock-store'
import { SessionProvider, useSessionContext } from '@/shared/auth/session-context'
import { ThemeProvider } from '@/shared/components/layout/theme-provider'
import { TenantLayout } from '../layouts/tenant/tenant-layout'
import { storageKeys, writeStoredValue } from '@/shared/lib/storage/browser-storage'
import { TenantDashboardPage } from '../modules/tenant-admin/pages/dashboard/tenant-dashboard-page'
// Tenant pages (everything except the dashboard) are code-split so the
// dashboard renders without pulling the whole tenant workspace bundle.
const TenantCustomersPage = lazy(() => import('../modules/tenant-admin/pages/customers/tenant-customers-pages').then((m) => ({ default: m.TenantCustomersPage })))
const TenantCustomerDetailPage = lazy(() => import('../modules/tenant-admin/pages/customers/tenant-customers-pages').then((m) => ({ default: m.TenantCustomerDetailPage })))
const TenantVendorsPage = lazy(() => import('../modules/tenant-admin/pages/vendors/tenant-vendors-pages').then((m) => ({ default: m.TenantVendorsPage })))
const TenantVendorDetailPage = lazy(() => import('../modules/tenant-admin/pages/vendors/tenant-vendors-pages').then((m) => ({ default: m.TenantVendorDetailPage })))
const TenantVendorOnboardingPage = lazy(() => import('../modules/tenant-admin/pages/vendors/tenant-vendors-pages').then((m) => ({ default: m.TenantVendorOnboardingPage })))
const TenantDriversPage = lazy(() => import('../modules/tenant-admin/pages/fleet/tenant-fleet-pages').then((m) => ({ default: m.TenantDriversPage })))
const TenantDriverOnboardingPage = lazy(() => import('../modules/tenant-admin/pages/fleet/tenant-fleet-pages').then((m) => ({ default: m.TenantDriverOnboardingPage })))
const TenantVehiclesPage = lazy(() => import('../modules/tenant-admin/pages/fleet/tenant-fleet-pages').then((m) => ({ default: m.TenantVehiclesPage })))
const TenantVehicleOnboardingPage = lazy(() => import('../modules/tenant-admin/pages/fleet/tenant-fleet-pages').then((m) => ({ default: m.TenantVehicleOnboardingPage })))
const TenantVehicleTypesPage = lazy(() => import('../modules/tenant-admin/pages/master-data/tenant-master-data-pages').then((m) => ({ default: m.TenantVehicleTypesPage })))
const TenantMaterialsPage = lazy(() => import('../modules/tenant-admin/pages/master-data/tenant-master-data-pages').then((m) => ({ default: m.TenantMaterialsPage })))
const TenantUOMConfigurationPage = lazy(() => import('../modules/tenant-admin/pages/master-data/tenant-master-data-pages').then((m) => ({ default: m.TenantUOMConfigurationPage })))
const TenantLRConfigPage = lazy(() => import('../modules/tenant-admin/pages/lr/lr-config-page').then((m) => ({ default: m.TenantLRConfigPage })))
const TenantLrOperationsPage = lazy(() => import('../modules/tenant-admin/pages/lr/lr-operations-page').then((m) => ({ default: m.TenantLrOperationsPage })))
const TenantRoleDetailPage = lazy(() => import('../modules/tenant-admin/pages/access/tenant-access-detail-pages').then((m) => ({ default: m.TenantRoleDetailPage })))
const TenantUserDetailPage = lazy(() => import('../modules/tenant-admin/pages/access/tenant-access-detail-pages').then((m) => ({ default: m.TenantUserDetailPage })))
const TenantAuditLogsPage = lazy(() => import('../modules/tenant-admin/pages/shared/tenant-placeholder-pages').then((m) => ({ default: m.TenantAuditLogsPage })))
const TenantHierarchyPage = lazy(() => import('../modules/tenant-admin/pages/shared/tenant-placeholder-pages').then((m) => ({ default: m.TenantHierarchyPage })))
const TenantModulesPage = lazy(() => import('../modules/tenant-admin/pages/shared/tenant-placeholder-pages').then((m) => ({ default: m.TenantModulesPage })))
const TenantOrgUnitsPage = lazy(() => import('../modules/tenant-admin/pages/shared/tenant-placeholder-pages').then((m) => ({ default: m.TenantOrgUnitsPage })))
const TenantRolePermissionsPage = lazy(() => import('../modules/tenant-admin/pages/shared/tenant-placeholder-pages').then((m) => ({ default: m.TenantRolePermissionsPage })))
const TenantRolesPage = lazy(() => import('../modules/tenant-admin/pages/shared/tenant-placeholder-pages').then((m) => ({ default: m.TenantRolesPage })))
const TenantSettingsPage = lazy(() => import('../modules/tenant-admin/pages/shared/tenant-placeholder-pages').then((m) => ({ default: m.TenantSettingsPage })))
const TenantUsersPage = lazy(() => import('../modules/tenant-admin/pages/shared/tenant-placeholder-pages').then((m) => ({ default: m.TenantUsersPage })))
const BookingSetupOverviewPage = lazy(() => import('../modules/tenant-admin/pages/booking-setup/booking-setup-pages').then((m) => ({ default: m.BookingSetupOverviewPage })))
const TenantAddressBookPage = lazy(() => import('../modules/tenant-admin/pages/booking-setup/booking-setup-pages').then((m) => ({ default: m.TenantAddressBookPage })))
const TenantAssignmentRulesPage = lazy(() => import('../modules/tenant-admin/pages/booking-setup/booking-setup-pages').then((m) => ({ default: m.TenantAssignmentRulesPage })))
const TenantDocumentRulesPage = lazy(() => import('../modules/tenant-admin/pages/booking-setup/booking-setup-pages').then((m) => ({ default: m.TenantDocumentRulesPage })))
const TenantPodRulesPage = lazy(() => import('../modules/tenant-admin/pages/booking-setup/booking-setup-pages').then((m) => ({ default: m.TenantPodRulesPage })))
import { PermissionGate } from '@/modules/tenant-admin/components/permission-gate'
const ShipmentDocumentsListPage = lazy(() => import('../modules/tenant-admin/pages/booking-stubs/booking-stub-pages').then((m) => ({ default: m.ShipmentDocumentsListPage })))
const BookingReportsPage = lazy(() => import('../modules/operations-dashboard/pages/operations-head-dashboard-page').then((m) => ({ default: m.BookingReportsPage })))
const BookingReportDetailPage = lazy(() => import('../modules/operations-dashboard/pages/operations-head-dashboard-page').then((m) => ({ default: m.BookingReportDetailPage })))

// Code-split the heavy booking pages (TMS booking engine) and the embedded
// module apps (auction/vendor/fleet/track-trace/customer) so the tenant
// dashboard loads fast — these chunks are fetched only when their route is
// visited. The Suspense boundary lives in TenantLayout (keeps the shell up).
const BookingListPage = lazy(() => import('../modules/tms/booking/BookingList').then((m) => ({ default: m.BookingListPage })))
const CreateBookingPage = lazy(() => import('../modules/tms/booking/CreateBooking').then((m) => ({ default: m.CreateBookingPage })))
const BookingDetailsPage = lazy(() => import('../modules/tms/booking/BookingDetails').then((m) => ({ default: m.BookingDetailsPage })))
const BookingDocumentsPage = lazy(() => import('../modules/tms/booking/BookingDocumentsPage').then((m) => ({ default: m.BookingDocumentsPage })))
const BookingLRViewPage = lazy(() => import('../modules/tms/booking/BookingLRView').then((m) => ({ default: m.BookingLRViewPage })))
const AssignmentQueuePage = lazy(() => import('../modules/tms/booking/AssignmentQueue').then((m) => ({ default: m.AssignmentQueuePage })))
const RateApprovalQueuePage = lazy(() => import('../modules/tms/booking/RateApprovalQueue').then((m) => ({ default: m.RateApprovalQueuePage })))
const LiveTrackingPlaceholderPage = lazy(() => import('../modules/tms/booking/BookingSupportPages').then((m) => ({ default: m.LiveTrackingPlaceholderPage })))
const PODCompletedPage = lazy(() => import('../modules/tms/booking/BookingSupportPages').then((m) => ({ default: m.PODCompletedPage })))
const VendorEmbeddedApp = lazy(() => import('../modules/tenant-admin/pages/embedded-modules/vendor-embedded').then((m) => ({ default: m.VendorEmbeddedApp })))
const FleetEmbeddedApp = lazy(() => import('../modules/tenant-admin/pages/embedded-modules/fleet-embedded').then((m) => ({ default: m.FleetEmbeddedApp })))
const AuctionEmbeddedApp = lazy(() => import('../modules/tenant-admin/pages/embedded-modules/auction-embedded').then((m) => ({ default: m.AuctionEmbeddedApp })))
const CustomerEmbeddedApp = lazy(() => import('../modules/tenant-admin/pages/embedded-modules/customer-embedded').then((m) => ({ default: m.CustomerEmbeddedApp })))
const TrackingEmbeddedApp = lazy(() => import('../modules/tenant-admin/pages/embedded-modules/tracking-embedded').then((m) => ({ default: m.TrackingEmbeddedApp })))
const FinanceEmbeddedApp = lazy(() => import('../modules/tenant-admin/pages/embedded-modules/finance-embedded').then((m) => ({ default: m.FinanceEmbeddedApp })))

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
          <Route path="vendors/new" element={<PermissionGate moduleCode="TMS" featureCode="VENDORS"><TenantVendorOnboardingPage /></PermissionGate>} />
          <Route path="vendors/:tenantVendorId/edit" element={<PermissionGate moduleCode="TMS" featureCode="VENDORS"><TenantVendorOnboardingPage /></PermissionGate>} />
          <Route path="vendors/:tenantVendorId" element={<PermissionGate moduleCode="TMS" featureCode="VENDORS"><TenantVendorDetailPage /></PermissionGate>} />
          <Route path="users" element={<TenantUsersPage />} />
          <Route path="users/:userId" element={<TenantUserDetailPage />} />
          <Route path="roles" element={<TenantRolesPage />} />
          <Route path="roles/:roleId" element={<TenantRoleDetailPage />} />
          <Route path="role-permissions" element={<TenantRolePermissionsPage />} />
          <Route path="vehicle-types" element={<PermissionGate moduleCode="TMS" featureCode="VEHICLE_TYPES"><TenantVehicleTypesPage /></PermissionGate>} />
          <Route path="vehicles" element={<PermissionGate moduleCode="TMS" featureCode="VEHICLE_TYPES"><TenantVehiclesPage /></PermissionGate>} />
          <Route path="vehicles/new" element={<PermissionGate moduleCode="TMS" featureCode="VEHICLE_TYPES"><TenantVehicleOnboardingPage /></PermissionGate>} />
          <Route path="vehicles/:tenantVehicleId/edit" element={<PermissionGate moduleCode="TMS" featureCode="VEHICLE_TYPES"><TenantVehicleOnboardingPage /></PermissionGate>} />
          <Route path="drivers" element={<PermissionGate moduleCode="TMS" featureCode="VEHICLE_TYPES"><TenantDriversPage /></PermissionGate>} />
          <Route path="drivers/new" element={<PermissionGate moduleCode="TMS" featureCode="VEHICLE_TYPES"><TenantDriverOnboardingPage /></PermissionGate>} />
          <Route path="drivers/:tenantDriverId/edit" element={<PermissionGate moduleCode="TMS" featureCode="VEHICLE_TYPES"><TenantDriverOnboardingPage /></PermissionGate>} />
          <Route path="materials" element={<PermissionGate moduleCode="TMS" featureCode="MATERIALS"><TenantMaterialsPage /></PermissionGate>} />
          <Route path="uom-config" element={<PermissionGate moduleCode="TMS" featureCode="UOM"><TenantUOMConfigurationPage /></PermissionGate>} />
          <Route path="lr-config" element={<PermissionGate moduleCode="TMS" featureCode="LR_CONFIGURATION"><TenantLRConfigPage /></PermissionGate>} />
          <Route path="lr" element={<PermissionGate moduleCode="TMS" featureCode="LR_MANAGEMENT"><TenantLrOperationsPage /></PermissionGate>} />
          <Route path="bookings" element={<PermissionGate moduleCode="TMS" featureCode="BOOKING_DASHBOARD"><BookingListPage /></PermissionGate>} />
          <Route path="bookings/create" element={<PermissionGate moduleCode="TMS" featureCode="CREATE_BOOKING" action="create"><CreateBookingPage /></PermissionGate>} />
          <Route path="bookings/rate-approval" element={<PermissionGate moduleCode="TMS" featureCode="BOOKING_ASSIGNMENT"><RateApprovalQueuePage /></PermissionGate>} />
          <Route path="bookings/assignment" element={<PermissionGate moduleCode="TMS" featureCode="BOOKING_ASSIGNMENT"><AssignmentQueuePage /></PermissionGate>} />
          <Route path="bookings/live-tracking" element={<PermissionGate moduleCode="TMS" featureCode="BOOKING_DASHBOARD"><LiveTrackingPlaceholderPage /></PermissionGate>} />
          <Route path="bookings/completed" element={<PermissionGate moduleCode="TMS" featureCode="POD"><PODCompletedPage /></PermissionGate>} />
          <Route path="bookings/:bookingId/edit" element={<PermissionGate moduleCode="TMS" featureCode="CREATE_BOOKING" action="edit"><CreateBookingPage /></PermissionGate>} />
          <Route path="bookings/:bookingId/documents" element={<PermissionGate moduleCode="TMS" featureCode="SHIPMENT_DOCUMENTS"><BookingDocumentsPage /></PermissionGate>} />
          <Route path="bookings/:bookingId/lr" element={<PermissionGate moduleCode="TMS" featureCode="LR_MANAGEMENT"><BookingLRViewPage /></PermissionGate>} />
          <Route path="bookings/:bookingId" element={<PermissionGate moduleCode="TMS" featureCode="BOOKING_DASHBOARD"><BookingDetailsPage /></PermissionGate>} />
          <Route path="shipment-documents" element={<PermissionGate moduleCode="TMS" featureCode="SHIPMENT_DOCUMENTS"><ShipmentDocumentsListPage /></PermissionGate>} />
          <Route path="booking-reports" element={<PermissionGate moduleCode="TMS" featureCode="BOOKING_REPORTS"><BookingReportsPage /></PermissionGate>} />
          <Route path="booking-reports/details/:detailKey" element={<PermissionGate moduleCode="TMS" featureCode="BOOKING_REPORTS"><BookingReportDetailPage /></PermissionGate>} />
          <Route path="vendor-portal/*" element={<PermissionGate moduleCode="VENDOR" featureCode="VENDOR_DASHBOARD"><VendorEmbeddedApp /></PermissionGate>} />
          <Route path="fleet-management/*" element={<PermissionGate moduleCode="FLEET" featureCode="FLEET_DASHBOARD"><FleetEmbeddedApp /></PermissionGate>} />
          <Route path="auction-ams/*" element={<PermissionGate moduleCode="AUCTION" featureCode="AUCTION_DASHBOARD"><AuctionEmbeddedApp /></PermissionGate>} />
          <Route path="customer-portal" element={<PermissionGate moduleCode="CUSTOMER" featureCode="CUSTOMER_DASHBOARD"><CustomerEmbeddedApp /></PermissionGate>} />
          <Route path="track-and-trace/*" element={<PermissionGate moduleCode="TRACKING" featureCode="TRACKING_DASHBOARD"><TrackingEmbeddedApp /></PermissionGate>} />
          <Route path="finance/*" element={<PermissionGate moduleCode="FINANCE" featureCode="FINANCE_DASHBOARD"><FinanceEmbeddedApp /></PermissionGate>} />
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


