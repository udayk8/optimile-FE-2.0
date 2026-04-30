import type { TenantCustomerRateCard } from "@/types/customer";
import type { BookingApprovalLevel, BookingCommercialType, BookingRecord, BookingStatus } from "@/modules/tms/booking/types";

export const bookingStatusTransitions: Record<BookingStatus, BookingStatus[]> = {
  DRAFT: ["PENDING_RATE_APPROVAL", "PENDING_ASSIGNMENT", "CANCELLED"],
  PENDING_RATE_APPROVAL: ["PENDING_ASSIGNMENT", "CANCELLED"],
  PENDING_ASSIGNMENT: ["VEHICLE_ASSIGNED", "ASSIGNED", "CANCELLED"],
  VEHICLE_ASSIGNED: ["LOADING_STARTED", "LOADING_COMPLETED", "CANCELLED"],
  LOADING_STARTED: ["LOADING_COMPLETED", "CANCELLED"],
  LOADING_COMPLETED: ["DOCUMENT_PENDING", "CANCELLED"],
  DOCUMENT_PENDING: ["DOCUMENT_COMPLETED", "CANCELLED"],
  DOCUMENT_COMPLETED: ["IN_TRANSIT", "READY_FOR_DISPATCH", "CANCELLED"],
  ASSIGNED: ["LOADING", "LOADING_STARTED", "LOADING_COMPLETED", "CANCELLED"],
  LOADING: ["LOADED", "LOADING_COMPLETED", "CANCELLED"],
  LOADED: ["DOCUMENT_PENDING", "CANCELLED"],
  READY_FOR_DISPATCH: ["IN_TRANSIT"],
  DISPATCHED: ["IN_TRANSIT"],
  IN_TRANSIT: ["ARRIVED", "DELIVERED", "EXCEPTION", "DELAYED"],
  ARRIVED: ["DELIVERED", "EXCEPTION", "DELAYED", "IN_TRANSIT"],
  DELAYED: ["IN_TRANSIT", "EXCEPTION", "DELIVERED"],
  EXCEPTION: ["IN_TRANSIT", "DELIVERED", "CANCELLED"],
  DELIVERED: ["INVOICED"],
  INVOICED: ["PAID", "DISPUTED"],
  PAID: [],
  DISPUTED: ["PAID"],
  CANCELLED: [],
};

export function canTransitionBooking(current: BookingStatus, next: BookingStatus) {
  return bookingStatusTransitions[current].includes(next);
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
  return ["DRAFT", "PENDING_RATE_APPROVAL", "PENDING_ASSIGNMENT"].includes(status);
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

export function getBookingStatusCategory(status: BookingStatus) {
  if (["PAID", "DELIVERED", "INVOICED"].includes(status)) {
    return "completed" as const;
  }
  if (["DELAYED", "EXCEPTION", "DISPUTED", "CANCELLED"].includes(status)) {
    return "exception" as const;
  }
  return "pending" as const;
}

export function buildMockLRNumber(existingBookings: BookingRecord[], sourceCode = "BLR") {
  const nextSequence = existingBookings
    .map((booking) => booking.assignment?.lrNumber?.match(/(\d+)$/)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => Number(value))
    .reduce((highest, current) => Math.max(highest, current), 0) + 1;

  return `LR-${sourceCode.toUpperCase()}-${String(nextSequence).padStart(4, "0")}`;
}
