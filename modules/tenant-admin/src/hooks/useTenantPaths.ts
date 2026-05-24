import { useLocation, useParams } from "react-router-dom";

export function useTenantPaths() {
  const { tenantId = "" } = useParams();
  const { pathname } = useLocation();

  const marker = `/tenant/${tenantId}`;
  const idx = pathname.indexOf(marker);
  const base = idx > 0 ? pathname.slice(0, idx) : "";
  const root = `${base}/tenant/${tenantId}`;

  return {
    root,
    dashboard: `${root}/dashboard`,
    customers: `${root}/customers`,
    customer: (id: string) => `${root}/customers/${id}`,
    vendors: `${root}/vendors`,
    vendor: (id: string) => `${root}/vendors/${id}`,
    users: `${root}/users`,
    user: (id: string) => `${root}/users/${id}`,
    roles: `${root}/roles`,
    role: (id: string) => `${root}/roles/${id}`,
    rolePermissions: `${root}/role-permissions`,
    vehicles: `${root}/vehicles`,
    drivers: `${root}/drivers`,
    hierarchy: `${root}/hierarchy`,
    orgUnits: `${root}/org-units`,
    materials: `${root}/materials`,
    modules: `${root}/modules`,
    auditLogs: `${root}/audit-logs`,
    settings: `${root}/settings`,
    bookings: `${base}/tms/booking/tenant/${tenantId}/bookings`,
    booking: (id: string) => `${base}/tms/booking/tenant/${tenantId}/bookings/${id}`,
    bookingEdit: (id: string) => `${base}/tms/booking/tenant/${tenantId}/bookings/${id}/edit`,
    bookingDocuments: (id: string) => `${base}/tms/booking/tenant/${tenantId}/bookings/${id}/documents`,
    bookingLR: (id: string) => `${base}/tms/booking/tenant/${tenantId}/bookings/${id}/lr`,
    createBooking: `${base}/tms/booking/tenant/${tenantId}/bookings/create`,
    rateApproval: `${base}/tms/booking/tenant/${tenantId}/bookings/rate-approval`,
    assignment: `${base}/tms/booking/tenant/${tenantId}/bookings/assignment`,
    liveTracking: `${base}/tms/booking/tenant/${tenantId}/bookings/live-tracking`,
    completed: `${base}/tms/booking/tenant/${tenantId}/bookings/completed`,
    driverLogin: `${root}/driver-app/login`,
    driverDashboard: `${root}/driver-app/dashboard`,
    driverTrips: `${root}/driver-app/trips`,
    driverTrip: (id: string) => `${root}/driver-app/trips/${id}`,
    driverIncidents: `${root}/driver-app/incidents`,
    driverProfile: `${root}/driver-app/profile`,
  };
}

