import { AuthProvider } from '@shared-auth'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { MockStoreProvider } from '../store/mock-store'
import { SessionProvider } from '../shared/auth/session-context'
import { ThemeProvider } from '../components/layout/theme-provider'
import { TenantLayout } from '../layouts/tenant/tenant-layout'
import { TenantDashboardPage } from '../modules/tenant-admin/pages/dashboard/tenant-dashboard-page'
import { TenantCustomersPage, TenantCustomerDetailPage } from '../modules/tenant-admin/pages/customers/tenant-customers-pages'
import { TenantVendorsPage, TenantVendorDetailPage } from '../modules/tenant-admin/pages/vendors/tenant-vendors-pages'
import { TenantDriversPage, TenantVehiclesPage } from '../modules/tenant-admin/pages/fleet/tenant-fleet-pages'
import { TenantVehicleTypesPage, TenantMaterialsPage, TenantUOMConfigurationPage, TenantLRConfigPage } from '../modules/tenant-admin/pages/master-data/tenant-master-data-pages'
import { TenantRoleDetailPage, TenantUserDetailPage } from '../modules/tenant-admin/pages/access/tenant-access-detail-pages'
import { TenantAuditLogsPage, TenantHierarchyPage, TenantModulesPage, TenantOrgUnitsPage, TenantRolePermissionsPage, TenantRolesPage, TenantSettingsPage, TenantUsersPage } from '../modules/tenant-admin/pages/shared/tenant-placeholder-pages'
import { BookingListPage } from '../modules/tms/booking/BookingList'
import { CreateBookingPage } from '../modules/tms/booking/CreateBooking'
import { RateApprovalQueuePage } from '../modules/tms/booking/RateApprovalQueue'
import { AssignmentQueuePage } from '../modules/tms/booking/AssignmentQueue'
import { LiveTrackingPlaceholderPage, PODCompletedPage } from '../modules/tms/booking/BookingSupportPages'
import { BookingDetailsPage } from '../modules/tms/booking/BookingDetails'
import { BookingDocumentsPage } from '../modules/tms/booking/BookingDocumentsPage'
import { BookingLRViewPage } from '../modules/tms/booking/BookingLRView'
import { DriverAppLayout, DriverLoginPage, DriverDashboardPage, DriverTripsPage, DriverTripDetailsPage, DriverIncidentCenterPage, DriverProfilePage } from '../modules/tms/driver-app/DriverAppPages'

function TenantAdminRoutes() {
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
        <Route index element={<Navigate to="tenant/tenant-northstar/dashboard" replace />} />
        <Route path="tenant/:tenantId" element={<TenantLayout />}>
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
          <Route path="bookings" element={<BookingListPage />} />
          <Route path="bookings/create" element={<CreateBookingPage />} />
          <Route path="bookings/rate-approval" element={<RateApprovalQueuePage />} />
          <Route path="bookings/assignment" element={<AssignmentQueuePage />} />
          <Route path="bookings/live-tracking" element={<LiveTrackingPlaceholderPage />} />
          <Route path="bookings/completed" element={<PODCompletedPage />} />
          <Route path="bookings/:bookingId/edit" element={<CreateBookingPage />} />
          <Route path="bookings/:bookingId/documents" element={<BookingDocumentsPage />} />
          <Route path="bookings/:bookingId/lr" element={<BookingLRViewPage />} />
          <Route path="bookings/:bookingId" element={<BookingDetailsPage />} />
          <Route path="driver-app" element={<DriverAppLayout />}>
            <Route path="login" element={<DriverLoginPage />} />
            <Route path="dashboard" element={<DriverDashboardPage />} />
            <Route path="trips" element={<DriverTripsPage />} />
            <Route path="trips/:bookingId" element={<DriverTripDetailsPage />} />
            <Route path="incidents" element={<DriverIncidentCenterPage />} />
            <Route path="profile" element={<DriverProfilePage />} />
          </Route>
          <Route path="modules" element={<TenantModulesPage />} />
          <Route path="audit-logs" element={<TenantAuditLogsPage />} />
          <Route path="settings" element={<TenantSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="tenant/tenant-northstar/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default function TenantAdminApp({ standalone = false }: { standalone?: boolean }) {
  const routes = <TenantAdminRoutes />

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
