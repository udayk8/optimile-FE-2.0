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
    bookingSetup: `${root}/booking-setup`,
    addressBook: `${root}/address-book`,
    assignmentRules: `${root}/assignment-rules`,
    documentRules: `${root}/document-rules`,
    podRules: `${root}/pod-rules`,
    vehicleTypes: `${root}/vehicle-types`,
    uomConfig: `${root}/uom-config`,
    lrConfig: `${root}/lr-config`,
    bookings: `${root}/bookings`,
    booking: (id: string) => `${root}/bookings/${id}`,
    bookingEdit: (id: string) => `${root}/bookings/${id}/edit`,
    bookingDocuments: (id: string) => `${root}/bookings/${id}/documents`,
    bookingLR: (id: string) => `${root}/bookings/${id}/lr`,
    createBooking: `${root}/bookings/create`,
    rateApproval: `${root}/bookings/rate-approval`,
    assignment: `${root}/bookings/assignment`,
    liveTracking: `${root}/bookings/live-tracking`,
    completed: `${root}/bookings/completed`,
    driverLogin: `${root}/driver-app/login`,
    driverDashboard: `${root}/driver-app/dashboard`,
    driverTrips: `${root}/driver-app/trips`,
    driverTrip: (id: string) => `${root}/driver-app/trips/${id}`,
    driverIncidents: `${root}/driver-app/incidents`,
    driverProfile: `${root}/driver-app/profile`,
    vendorPortal: `${root}/vendor-portal`,
    fleetManagement: `${root}/fleet-management`,
    auctionAms: `${root}/auction-ams`,
    customerPortal: `${root}/customer-portal`,
    trackAndTrace: `${root}/track-and-trace`,
  };
}


