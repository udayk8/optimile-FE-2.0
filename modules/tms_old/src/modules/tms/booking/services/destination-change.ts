import type { TenantCustomer, TenantCustomerAddress, TenantCustomerRateCard } from "@/types/customer";
import { validateRateCard, type RateValidationInput } from "@/modules/tms/booking/services/booking-selectors";
import { perKM, perMT, perTrip } from "@/modules/tms/booking/services/booking-engine";
import type {
  BookingDeliveryRecord,
  BookingDestinationChangeRequest,
  BookingRecord,
  DeliveryRevisionImpact,
  DeliveryRevisionRecord,
  DeliveryRevisionSnapshot,
  DestinationChangeTemporaryAddress,
} from "@/modules/tms/booking/types";

function normalizeAddressLabel(address?: TenantCustomerAddress | null) {
  return address?.addressLabel ?? address?.addressName ?? address?.city ?? "Destination";
}

function buildFullAddress(address?: TenantCustomerAddress | null) {
  if (!address) {
    return "";
  }
  return address.fullAddress ?? [address.addressLine1, address.addressLine2, address.city, address.state, address.pincode].filter(Boolean).join(", ");
}

function calculateFreight(params: {
  rateType: BookingRecord["pricing"]["rateType"];
  rate: number;
  weight: number;
  distanceKm: number;
}) {
  if (params.rateType === "PER_MT") {
    return Number(perMT(params.rate, params.weight).toFixed(2));
  }
  if (params.rateType === "PER_KM") {
    return Number(perKM(params.rate, params.distanceKm).toFixed(2));
  }
  return Number(perTrip(params.rate).toFixed(2));
}

function resolveRateCard(params: {
  booking: BookingRecord;
  customer: TenantCustomer | null;
  rateCards: TenantCustomerRateCard[];
  sourceAddress: TenantCustomerAddress | null;
  destinationAddress: TenantCustomerAddress | null;
}) {
  const { booking, customer, rateCards, sourceAddress, destinationAddress } = params;
  if (!customer || !sourceAddress || !destinationAddress) {
    return null;
  }
  const input: RateValidationInput = {
    bookingDate: booking.pickupDate,
    customerId: booking.customerId,
    rateMatchingBasis: customer.rateMatchingBasis ?? "LANE_TO_LANE",
    lane: `${sourceAddress.addressName} -> ${destinationAddress.addressName}`,
    fromCity: sourceAddress.city,
    toCity: destinationAddress.city,
    fromLocation: sourceAddress.addressName,
    toLocation: destinationAddress.addressName,
    fromPincode: sourceAddress.pincode,
    toPincode: destinationAddress.pincode,
    vehicleType: booking.vehicleTypeId ?? null,
    rateType: booking.pricing.rateType,
    weight: booking.weight,
  };
  return validateRateCard(input, rateCards);
}

export function buildDeliveryRevisionSnapshot(params: {
  booking: BookingRecord;
  delivery: BookingDeliveryRecord;
  address: TenantCustomerAddress | null;
  request?: BookingDestinationChangeRequest | null;
  fallbackRoute?: string;
  fallbackFreight?: number;
  fallbackEta?: string | null;
}): DeliveryRevisionSnapshot {
  const { booking, delivery, address, request, fallbackRoute, fallbackFreight, fallbackEta } = params;
  return {
    deliveryId: delivery.id,
    deliveryNo: delivery.deliveryNo,
    consigneeId: address?.consigneeId ?? request?.requestedConsigneeId ?? null,
    consigneeName: address?.consigneeName ?? request?.requestedConsigneeName ?? null,
    addressId: address?.id ?? request?.requestedAddressId ?? request?.temporaryAddress?.id ?? delivery.destinationAddressId,
    addressLabel: request?.temporaryAddress?.addressLabel ?? normalizeAddressLabel(address),
    fullAddress: request?.temporaryAddress?.fullAddress ?? buildFullAddress(address),
    city: request?.temporaryAddress?.city ?? address?.city ?? delivery.destinationCity ?? "-",
    state: request?.temporaryAddress?.state ?? address?.state ?? "-",
    pincode: request?.temporaryAddress?.pincode ?? address?.pincode ?? "-",
    route: request?.requestedRoute ?? delivery.routeLabel ?? fallbackRoute ?? `${delivery.originCity ?? "Origin"} -> ${address?.city ?? delivery.destinationCity ?? "Destination"}`,
    distanceKm: request?.requestedDistanceKm ?? delivery.distanceKm ?? null,
    freight: request?.requestedFreight ?? delivery.freightRate ?? fallbackFreight ?? booking.pricing.calculatedFreight,
    eta: request?.requestedEta ?? delivery.eta ?? fallbackEta ?? null,
    sequence: delivery.deliverySequence ?? delivery.deliveryNo,
    lrNumber: delivery.lrNumber ?? booking.assignment?.lrNumber ?? null,
    tripImpact: delivery.tripImpactSummary ?? "Trip totals update only for the affected delivery and downstream route summary.",
    contactPerson: request?.requestedContactPerson ?? delivery.contactPerson ?? address?.contactPerson ?? null,
    contactNumber: request?.requestedContactNumber ?? delivery.contactNumber ?? address?.contactNumber ?? null,
    unloadingNotes: request?.unloadingNotes ?? delivery.unloadingNotes ?? null,
    instructions: request?.instructions ?? delivery.instructions ?? null,
    isTemporary: Boolean(request?.temporaryAddress),
  };
}

export function buildDestinationChangeImpact(params: {
  previousSnapshot: DeliveryRevisionSnapshot;
  proposedSnapshot: DeliveryRevisionSnapshot;
}): DeliveryRevisionImpact {
  const { previousSnapshot, proposedSnapshot } = params;
  const previousDistance = Number(previousSnapshot.distanceKm ?? 0);
  const proposedDistance = Number(proposedSnapshot.distanceKm ?? 0);
  const previousEta = previousSnapshot.eta ? new Date(previousSnapshot.eta).getTime() : null;
  const proposedEta = proposedSnapshot.eta ? new Date(proposedSnapshot.eta).getTime() : null;
  return {
    freightDelta: Number((proposedSnapshot.freight - previousSnapshot.freight).toFixed(2)),
    distanceDeltaKm: Number((proposedDistance - previousDistance).toFixed(2)),
    routeDelta:
      previousSnapshot.route === proposedSnapshot.route
        ? "No route-label change."
        : `${previousSnapshot.route} -> ${proposedSnapshot.route}`,
    etaDeltaHours:
      previousEta != null && proposedEta != null
        ? Number((((proposedEta - previousEta) / (1000 * 60 * 60)) || 0).toFixed(2))
        : 0,
    tripImpactSummary:
      previousSnapshot.city === proposedSnapshot.city
        ? "Operational stop changes inside the same city. Trip totals still need refresh."
        : `Delivery rerouted from ${previousSnapshot.city} to ${proposedSnapshot.city}.`,
  };
}

export function previewDestinationChange(params: {
  booking: BookingRecord;
  delivery: BookingDeliveryRecord;
  customer: TenantCustomer | null;
  sourceAddress: TenantCustomerAddress | null;
  currentAddress: TenantCustomerAddress | null;
  proposedAddress: TenantCustomerAddress | null;
  temporaryAddress?: DestinationChangeTemporaryAddress | null;
  rateCards: TenantCustomerRateCard[];
}): {
  previousSnapshot: DeliveryRevisionSnapshot;
  proposedSnapshot: DeliveryRevisionSnapshot;
  impact: DeliveryRevisionImpact;
} {
  const currentRateCard = resolveRateCard({
    booking: params.booking,
    customer: params.customer,
    rateCards: params.rateCards,
    sourceAddress: params.sourceAddress,
    destinationAddress: params.currentAddress,
  });
  const proposedRateCard = resolveRateCard({
    booking: params.booking,
    customer: params.customer,
    rateCards: params.rateCards,
    sourceAddress: params.sourceAddress,
    destinationAddress: params.proposedAddress,
  });
  const previousDistance = Number(params.delivery.distanceKm ?? params.booking.pricing.distanceKm ?? 0);
  const proposedDistance =
    params.proposedAddress && params.currentAddress
      ? Math.max(20, previousDistance + ((params.proposedAddress.city !== params.currentAddress.city ? 80 : 25)))
      : previousDistance;
  const previousFreight = calculateFreight({
    rateType: params.booking.pricing.rateType,
    rate: Number(currentRateCard?.rate ?? currentRateCard?.baseRate ?? params.delivery.freightRate ?? params.booking.pricing.calculatedFreight),
    weight: Number(params.delivery.weight ?? params.booking.weight ?? 0),
    distanceKm: previousDistance,
  });
  const proposedFreight = calculateFreight({
    rateType: params.booking.pricing.rateType,
    rate: Number(proposedRateCard?.rate ?? proposedRateCard?.baseRate ?? previousFreight),
    weight: Number(params.delivery.weight ?? params.booking.weight ?? 0),
    distanceKm: proposedDistance,
  });
  const previousSnapshot = buildDeliveryRevisionSnapshot({
    booking: params.booking,
    delivery: params.delivery,
    address: params.currentAddress,
    fallbackRoute: `${params.sourceAddress?.city ?? "Origin"} -> ${params.currentAddress?.city ?? params.delivery.destinationCity ?? "Destination"}`,
    fallbackFreight: previousFreight,
    fallbackEta: params.delivery.eta ?? params.booking.tat ?? null,
  });
  const proposedSnapshot = buildDeliveryRevisionSnapshot({
    booking: params.booking,
    delivery: {
      ...params.delivery,
      distanceKm: proposedDistance,
      freightRate: proposedFreight,
      tripImpactSummary:
        params.proposedAddress?.city === params.currentAddress?.city
          ? "Stop change on current trip route."
          : "Lane change requires trip total refresh and downstream assignment context review.",
    },
    address: params.proposedAddress,
    request: params.temporaryAddress
      ? {
          id: "preview",
          bookingId: params.booking.id,
          deliveryId: params.delivery.id,
          remarkType: "DESTINATION_CHANGED",
          reason: "Preview",
          raisedBy: "Preview",
          raisedAt: new Date().toISOString(),
          priority: "MEDIUM",
          status: "DRAFT",
          temporaryAddress: params.temporaryAddress,
        }
      : null,
    fallbackRoute: `${params.sourceAddress?.city ?? "Origin"} -> ${params.temporaryAddress?.city ?? params.proposedAddress?.city ?? params.delivery.destinationCity ?? "Destination"}`,
    fallbackFreight: proposedFreight,
    fallbackEta: params.delivery.eta ?? params.booking.tat ?? null,
  });

  return {
    previousSnapshot,
    proposedSnapshot,
    impact: buildDestinationChangeImpact({
      previousSnapshot,
      proposedSnapshot,
    }),
  };
}

export function buildDeliveryRevisionRecord(params: {
  booking: BookingRecord;
  delivery: BookingDeliveryRecord;
  request: BookingDestinationChangeRequest;
  previousSnapshot: DeliveryRevisionSnapshot;
  proposedSnapshot: DeliveryRevisionSnapshot;
  impact: DeliveryRevisionImpact;
  actor: string;
  status: DeliveryRevisionRecord["status"];
}): DeliveryRevisionRecord {
  const revisionNo = (params.delivery.revisions?.length ?? 0) + 1;
  return {
    id: `delivery-revision-${Date.now()}`,
    requestId: params.request.id,
    deliveryId: params.delivery.id,
    revisionNo,
    status: params.status,
    reason: params.request.reason,
    requestedBy: params.request.raisedBy,
    requestedAt: params.request.raisedAt,
    approvedBy: params.status === "ACTIVE" ? params.actor : null,
    approvedAt: params.status === "ACTIVE" ? new Date().toISOString() : null,
    implementedBy: params.status === "ACTIVE" ? params.actor : null,
    implementedAt: params.status === "ACTIVE" ? new Date().toISOString() : null,
    previousSnapshot: params.previousSnapshot,
    proposedSnapshot: params.proposedSnapshot,
    impact: params.impact,
  };
}
