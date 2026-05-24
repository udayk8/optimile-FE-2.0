import { useLocation, useParams } from "react-router-dom";

export function useBookingPaths() {
  const { tenantId = "" } = useParams();
  const { pathname } = useLocation();

  const marker = `/tenant/${tenantId}`;
  const idx = pathname.indexOf(marker);
  const base = idx > 0 ? pathname.slice(0, idx) : "";
  const root = `${base}/tenant/${tenantId}`;

  return {
    root,
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
  };
}

