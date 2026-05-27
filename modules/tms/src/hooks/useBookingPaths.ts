import { useLocation, useParams } from "react-router-dom";

export function useBookingPaths() {
  const { tenantId = "" } = useParams();
  const { pathname } = useLocation();

  const cleanRoot = "/tms/booking";
  const legacyMarker = tenantId ? `/tenant/${tenantId}` : "";
  const legacyIndex = legacyMarker ? pathname.indexOf(legacyMarker) : -1;
  const root = legacyIndex > 0 ? pathname.slice(0, legacyIndex) : cleanRoot;
  const tenantAdminRoot = "/tenant-admin";

  return {
    root,
    tenantAdminRoot,
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
    tenantCustomer: (_id: string) => `${tenantAdminRoot}/customers`,
    tenantFinance: `${root}/bookings/completed`,
    tenantFinanceInvoice: (_id: string) => `${root}/bookings/completed`,
    tenantLrWorkspace: `${tenantAdminRoot}/lr-config`,
  };
}
