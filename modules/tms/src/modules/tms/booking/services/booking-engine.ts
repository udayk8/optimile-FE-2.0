import type { TenantCustomerRateCard } from "@/types/customer";
import type { BookingApprovalLevel, BookingCommercialType, BookingRecord, BookingStatus } from "@/modules/tms/booking/types";

export const primaryBookingStatuses = [
  "DRAFT",
  "PENDING_RATE_APPROVAL",
  "PENDING_ASSIGNMENT",
  "IN_TRANSIT",
  "POD_PENDING",
  "COMPLETED",
  "INVOICED",
  "EXCEPTION",
  "CANCELLED",
] as const;

export const pendingAssignmentInternalStatuses = [
  "PENDING_ASSIGNMENT",
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
] as const;

export const bookingStatusTransitions: Record<BookingStatus, BookingStatus[]> = {
  DRAFT: ["PENDING_RATE_APPROVAL", "PENDING_ASSIGNMENT", "CANCELLED"],
  PENDING_RATE_APPROVAL: ["PENDING_ASSIGNMENT", "CANCELLED"],
  PENDING_ASSIGNMENT: ["ACCEPTED", "VEHICLE_ASSIGNED", "ASSIGNED", "EXCEPTION", "CANCELLED"],
  ACCEPTED: ["VEHICLE_ASSIGNED", "ASSIGNED", "EXCEPTION", "CANCELLED"],
  VEHICLE_ASSIGNED: ["LOADING_STARTED", "LOADING_COMPLETED", "EXCEPTION", "CANCELLED"],
  LOADING_STARTED: ["LOADING_COMPLETED", "EXCEPTION"],
  LOADING_COMPLETED: ["DOCUMENT_PENDING", "EXCEPTION"],
  DOCUMENT_PENDING: ["DOCUMENT_COMPLETED", "EXCEPTION"],
  DOCUMENT_COMPLETED: ["READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT", "EXCEPTION"],
  ASSIGNED: ["LOADING", "LOADING_STARTED", "LOADING_COMPLETED", "EXCEPTION", "CANCELLED"],
  LOADING: ["LOADED", "LOADING_COMPLETED", "EXCEPTION"],
  LOADED: ["DOCUMENT_PENDING", "EXCEPTION"],
  READY_FOR_DISPATCH: ["DISPATCHED", "IN_TRANSIT", "EXCEPTION"],
  DISPATCHED: ["IN_TRANSIT", "EXCEPTION"],
  IN_TRANSIT: ["ARRIVED", "POD_PENDING", "EXCEPTION", "DELAYED"],
  POD_PENDING: ["COMPLETED", "EXCEPTION"],
  ARRIVED: ["POD_PENDING", "EXCEPTION", "DELAYED", "IN_TRANSIT"],
  DELAYED: ["IN_TRANSIT", "EXCEPTION", "POD_PENDING"],
  EXCEPTION: ["IN_TRANSIT", "POD_PENDING", "COMPLETED"],
  COMPLETED: ["INVOICED"],
  INVOICED: ["PAID", "DISPUTED"],
  PAID: [],
  DISPUTED: ["PAID"],
  CANCELLED: [],
};

export function canTransitionBooking(current: BookingStatus, next: BookingStatus) {
  if (current === next) {
    return true;
  }
  return bookingStatusTransitions[current].includes(next);
}

export function getPrimaryBookingStatus(status: BookingStatus) {
  if ((pendingAssignmentInternalStatuses as readonly BookingStatus[]).includes(status)) {
    return "PENDING_ASSIGNMENT" as const;
  }
  if (["IN_TRANSIT", "ARRIVED", "DELAYED"].includes(status)) {
    return "IN_TRANSIT" as const;
  }
  if (["PAID", "DISPUTED"].includes(status)) {
    return "INVOICED" as const;
  }
  return status;
}

export function getVisibleBookingTimeline(events: Pick<BookingRecord["statusTimeline"][number], "status">[]) {
  const visible: BookingStatus[] = [];

  for (const event of events) {
    const primaryStatus = getPrimaryBookingStatus(event.status);
    if (visible.at(-1) !== primaryStatus) {
      visible.push(primaryStatus);
    }
  }

  return visible;
}

export function canCancelBooking(status: BookingStatus) {
  return ["DRAFT", "PENDING_RATE_APPROVAL", "PENDING_ASSIGNMENT", "ACCEPTED", "VEHICLE_ASSIGNED", "ASSIGNED"].includes(status);
}

export function normalizeBookingId(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function perTrip(rate: number) {
  return rate;
}

export function perMT(rate: number, weight: number) {
  return rate * weight;
}

export function perKM(rate: number, distanceKm: number) {
  return rate * distanceKm;
}

export function calculateDeviationPercent(enteredRate: number, l1Rate?: number | null) {
  if (!l1Rate || l1Rate <= 0) {
    return 0;
  }
  return Number((((enteredRate - l1Rate) / l1Rate) * 100).toFixed(2));
}

export function getDeviationApprovalLevel(deviationPercent: number): BookingApprovalLevel | null {
  const absoluteDeviation = Math.abs(deviationPercent);
  if (absoluteDeviation < 5) {
    return "AUTO";
  }
  if (absoluteDeviation <= 15) {
    return "MANAGER";
  }
  return "HO";
}

export function evaluateInitialBookingStatus(
  commercialType: BookingCommercialType,
  deviationPercent: number,
) {
  if (commercialType === "CONTRACT" && Math.abs(deviationPercent) >= 5) {
    return "PENDING_RATE_APPROVAL" as const;
  }
  return "PENDING_ASSIGNMENT" as const;
}

export function shouldRequireVehicleType(
  rateType: "PER_TRIP" | "PER_KM" | "PER_MT",
  commercialType: BookingCommercialType,
  _serviceType: "FTL" | "PTL",
) {
  if (commercialType === "SPOT") {
    return false;
  }
  if (rateType !== "PER_MT") {
    return true;
  }
  return false;
}

export function shouldRequireDeviationRemark(
  commercialType: BookingCommercialType,
  deviationPercent: number,
) {
  return commercialType === "CONTRACT" && Math.abs(deviationPercent) > 0;
}

export function isBookingDelayCandidate(
  booking: Pick<BookingRecord, "status" | "statusTimeline" | "updatedAt">,
) {
  if (!["DOCUMENT_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT"].includes(booking.status)) {
    return false;
  }
  const referenceTimestamp =
    booking.statusTimeline
      .filter((event) =>
        event.status === "DOCUMENT_COMPLETED" ||
        event.status === "READY_FOR_DISPATCH" ||
        event.status === "DISPATCHED" ||
        event.status === "IN_TRANSIT",
      )
      .at(-1)?.timestamp ?? booking.updatedAt;
  return Date.now() - new Date(referenceTimestamp).getTime() > 1000 * 60 * 60 * 18;
}

export function getBookingEditability(status: BookingStatus) {
  return ["DRAFT", "PENDING_RATE_APPROVAL", "PENDING_ASSIGNMENT", "ACCEPTED", "VEHICLE_ASSIGNED", "ASSIGNED"].includes(status);
}

export function getRateCardRateType(rateCard?: TenantCustomerRateCard | null) {
  if (!rateCard) {
    return "PER_TRIP" as const;
  }
  if (rateCard.rateType === "PER_KM") {
    return "PER_KM" as const;
  }
  if (rateCard.rateType === "PER_TON" || rateCard.rateType === "PER_MT") {
    return "PER_MT" as const;
  }
  return "PER_TRIP" as const;
}

export function getRateCardUnitRate(rateCard?: TenantCustomerRateCard | null) {
  if (!rateCard) {
    return null;
  }
  return Number(rateCard.underloadRate ?? rateCard.baseRate ?? rateCard.rate ?? 0) || 0;
}

export function getLastNonNullRate<T>(items: Array<T | null | undefined>) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index] != null) {
      return items[index] ?? null;
    }
  }
  return null;
}

export function calculateMarginPercent(customerFreight: number, vendorFreight: number) {
  if (customerFreight <= 0 || vendorFreight < 0) {
    return 0;
  }
  return Number((((customerFreight - vendorFreight) / customerFreight) * 100).toFixed(2));
}

export function calculateMarginAmount(customerFreight: number, vendorFreight: number) {
  if (!Number.isFinite(customerFreight) || !Number.isFinite(vendorFreight)) {
    return 0;
  }
  return Number((customerFreight - vendorFreight).toFixed(2));
}

export function getBookingStatusCategory(status: BookingStatus) {
  const primaryStatus = getPrimaryBookingStatus(status);

  if (["COMPLETED", "INVOICED"].includes(primaryStatus)) {
    return "completed" as const;
  }
  if (["EXCEPTION", "CANCELLED"].includes(primaryStatus)) {
    return "exception" as const;
  }
  return "pending" as const;
}

export function areAllDeliveriesPhysicallyCompleted(deliveries?: BookingRecord["deliveries"]) {
  const deliveryList = deliveries ?? [];
  return deliveryList.length > 0 && deliveryList.every((delivery) => delivery.status === "COMPLETED");
}

export function areAllDeliveryPodsCaptured(deliveries?: BookingRecord["deliveries"]) {
  const deliveryList = deliveries ?? [];
  return deliveryList.length > 0 && deliveryList.every((delivery) => Boolean(delivery.pod?.podUploaded));
}

export function buildMockLRNumber(existingBookings: BookingRecord[], sourceCode = "BLR") {
  const nextSequence = existingBookings
    .map((booking) => booking.assignment?.lrNumber?.match(/(\d+)$/)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => Number(value))
    .reduce((highest, current) => Math.max(highest, current), 0) + 1;

  return `LR-${sourceCode.toUpperCase()}-${String(nextSequence).padStart(4, "0")}`;
}
