import type { ReactNode } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { MockStoreProvider } from "@/app/mock-store";
import { SessionProvider } from "@/app/session-context";
import { PlatformAuditLogsPage } from "@/features/platform/audit-logs/platform-audit-logs-page";
import { PlatformDashboardPage } from "@/features/platform/dashboard/platform-dashboard-page";
import { PlatformModulesPage } from "@/features/platform/modules/platform-modules-page";
import { PlatformPlansPage } from "@/features/platform/plans/platform-plans-page";
import { PlatformSettingsPage } from "@/features/platform/settings/platform-settings-page";
import { PlatformTenantDetailPage } from "@/features/platform/tenants/platform-tenant-detail-page";
import { PlatformTenantsPage } from "@/features/platform/tenants/platform-tenants-page";
import { TenantDashboardPage } from "@/features/tenant/dashboard/tenant-dashboard-page";
import {
  TenantRoleDetailPage,
  TenantUserDetailPage,
} from "@/features/tenant/access/tenant-access-detail-pages";
import {
  TenantCustomerDetailPage,
  TenantCustomersPage,
} from "@/features/tenant/customers/tenant-customers-pages";
import {
  TenantLRConfigPage,
  TenantMaterialsPage,
  TenantUOMConfigurationPage,
  TenantVehicleTypesPage,
} from "@/features/tenant/master-data/tenant-master-data-pages";
import {
  TenantDriversPage,
  TenantVehiclesPage,
} from "@/features/tenant/fleet/tenant-fleet-pages";
import { AssignmentQueuePage } from "@/modules/tms/booking/AssignmentQueue";
import { BookingDetailsPage } from "@/modules/tms/booking/BookingDetails";
import { BookingDocumentsPage } from "@/modules/tms/booking/BookingDocumentsPage";
import { BookingListPage } from "@/modules/tms/booking/BookingList";
import { BookingLRViewPage } from "@/modules/tms/booking/BookingLRView";
import { CreateBookingPage } from "@/modules/tms/booking/CreateBooking";
import {
  LiveTrackingPlaceholderPage,
  PODCompletedPage,
} from "@/modules/tms/booking/BookingSupportPages";
import { RateApprovalQueuePage } from "@/modules/tms/booking/RateApprovalQueue";
import {
  DriverAppLayout,
  DriverDashboardPage,
  DriverIncidentCenterPage,
  DriverLoginPage,
  DriverProfilePage,
  DriverTripDetailsPage,
  DriverTripsPage,
} from "@/modules/tms/driver-app/DriverAppPages";
import {
  TenantVendorDetailPage,
  TenantVendorsPage,
} from "@/features/tenant/vendors/tenant-vendors-pages";
import {
  TenantAuditLogsPage,
  TenantHierarchyPage,
  TenantModulesPage,
  TenantOrgUnitsPage,
  TenantRolePermissionsPage,
  TenantRolesPage,
  TenantSettingsPage,
  TenantUsersPage,
} from "@/features/tenant/shared/tenant-placeholder-pages";
import { PlatformLayout } from "@/layouts/platform/platform-layout";
import { TenantLayout } from "@/layouts/tenant/tenant-layout";
import { ThemeProvider } from "@/components/layout/theme-provider";

function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <MockStoreProvider>{children}</MockStoreProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/platform/dashboard" replace />,
  },
  {
    path: "/platform",
    element: (
      <Providers>
        <PlatformLayout />
      </Providers>
    ),
    children: [
      { path: "dashboard", element: <PlatformDashboardPage /> },
      { path: "tenants", element: <PlatformTenantsPage /> },
      { path: "tenants/:tenantId", element: <PlatformTenantDetailPage /> },
      { path: "modules", element: <PlatformModulesPage /> },
      { path: "plans", element: <PlatformPlansPage /> },
      { path: "audit-logs", element: <PlatformAuditLogsPage /> },
      { path: "settings", element: <PlatformSettingsPage /> },
    ],
  },
  {
    path: "/tenant/:tenantId",
    element: (
      <Providers>
        <TenantLayout />
      </Providers>
    ),
    children: [
      { path: "dashboard", element: <TenantDashboardPage /> },
      { path: "hierarchy", element: <TenantHierarchyPage /> },
      { path: "org-units", element: <TenantOrgUnitsPage /> },
      { path: "customers", element: <TenantCustomersPage /> },
      { path: "customers/:tenantCustomerId", element: <TenantCustomerDetailPage /> },
      { path: "vendors", element: <TenantVendorsPage /> },
      { path: "vendors/:tenantVendorId", element: <TenantVendorDetailPage /> },
      { path: "users", element: <TenantUsersPage /> },
      { path: "users/:userId", element: <TenantUserDetailPage /> },
      { path: "roles", element: <TenantRolesPage /> },
      { path: "roles/:roleId", element: <TenantRoleDetailPage /> },
      { path: "role-permissions", element: <TenantRolePermissionsPage /> },
      { path: "vehicle-types", element: <TenantVehicleTypesPage /> },
      { path: "vehicles", element: <TenantVehiclesPage /> },
      { path: "drivers", element: <TenantDriversPage /> },
      { path: "materials", element: <TenantMaterialsPage /> },
      { path: "uom-config", element: <TenantUOMConfigurationPage /> },
      { path: "lr-config", element: <TenantLRConfigPage /> },
      { path: "bookings", element: <BookingListPage /> },
      { path: "bookings/create", element: <CreateBookingPage /> },
      { path: "bookings/rate-approval", element: <RateApprovalQueuePage /> },
      { path: "bookings/assignment", element: <AssignmentQueuePage /> },
      { path: "bookings/live-tracking", element: <LiveTrackingPlaceholderPage /> },
      { path: "bookings/completed", element: <PODCompletedPage /> },
      { path: "bookings/:bookingId/edit", element: <CreateBookingPage /> },
      { path: "bookings/:bookingId/documents", element: <BookingDocumentsPage /> },
      { path: "bookings/:bookingId/lr", element: <BookingLRViewPage /> },
      { path: "bookings/:bookingId", element: <BookingDetailsPage /> },
      {
        path: "driver-app",
        element: <DriverAppLayout />,
        children: [
          { path: "login", element: <DriverLoginPage /> },
          { path: "dashboard", element: <DriverDashboardPage /> },
          { path: "trips", element: <DriverTripsPage /> },
          { path: "trips/:bookingId", element: <DriverTripDetailsPage /> },
          { path: "incidents", element: <DriverIncidentCenterPage /> },
          { path: "profile", element: <DriverProfilePage /> },
        ],
      },
      { path: "modules", element: <TenantModulesPage /> },
      { path: "capabilities", element: <Navigate to="../modules" replace /> },
      { path: "audit-logs", element: <TenantAuditLogsPage /> },
      { path: "settings", element: <TenantSettingsPage /> },
    ],
  },
]);
