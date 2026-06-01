import { Badge } from "@/shared/components/ui/badge";
import { getPrimaryBookingStatus } from "@/modules/tms/booking/services/booking-engine";
import type { BookingStatus } from "@/modules/tms/booking/types";

// Assignment sub-statuses roll up to the PENDING_ASSIGNMENT *phase* for pipeline
// grouping, but the badge must show the real sub-status — a booking with a
// vehicle/driver assigned shows "VEHICLE ASSIGNED", never "PENDING ASSIGNMENT".
const ASSIGNED_SUB_STATUSES: BookingStatus[] = [
  "ACCEPTED",
  "VEHICLE_ASSIGNED",
  "LOADING_STARTED",
  "LOADING_COMPLETED",
  "DOCUMENT_PENDING",
  "DOCUMENT_COMPLETED",
  "ASSIGNED",
  "LOADING",
  "LOADED",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
];

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  if (ASSIGNED_SUB_STATUSES.includes(status)) {
    return <Badge variant="accent">{status.replace(/_/g, " ")}</Badge>;
  }
  const visibleStatus = getPrimaryBookingStatus(status);
  const variant =
    visibleStatus === "DRAFT"
      ? "secondary"
      : visibleStatus === "PENDING_RATE_APPROVAL" || visibleStatus === "PENDING_ASSIGNMENT"
        ? "warning"
          : visibleStatus === "IN_TRANSIT"
          ? "accent"
          : visibleStatus === "POD_PENDING"
            ? "warning"
          : visibleStatus === "COMPLETED" || visibleStatus === "INVOICED"
            ? "success"
            : visibleStatus === "CANCELLED" || visibleStatus === "EXCEPTION"
              ? "danger"
              : "warning";

  return <Badge variant={variant}>{visibleStatus.replace(/_/g, " ")}</Badge>;
}
