import { Badge } from "@/shared/components/ui/badge";
import { getPrimaryBookingStatus } from "@/modules/tms/booking/services/booking-engine";
import type { BookingStatus } from "@/modules/tms/booking/types";

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
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
