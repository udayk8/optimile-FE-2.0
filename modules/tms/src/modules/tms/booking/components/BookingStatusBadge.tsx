import { Badge } from "../../../../components/ui/badge";
import type { BookingStatus } from "../types";

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const variant =
    status === "DRAFT"
      ? "secondary"
      : status === "VEHICLE_ASSIGNED" || status === "ASSIGNED"
        ? "default"
        : status === "LOADING_STARTED" || status === "LOADING_COMPLETED" || status === "LOADING" || status === "LOADED" || status === "DOCUMENT_PENDING"
          ? "warning"
          : status === "DOCUMENT_COMPLETED" || status === "READY_FOR_DISPATCH" || status === "DISPATCHED" || status === "IN_TRANSIT" || status === "ARRIVED" || status === "DELAYED"
          ? "accent"
          : status === "DELIVERED" || status === "INVOICED" || status === "PAID"
            ? "success"
            : status === "CANCELLED" || status === "EXCEPTION" || status === "DISPUTED"
              ? "danger"
              : "warning";

  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>;
}
