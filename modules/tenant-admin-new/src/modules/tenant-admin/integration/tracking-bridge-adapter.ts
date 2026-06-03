import { useMemo } from "react";
import { useMockStore } from "@/shared/store/mock-store";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import type { BookingRecord, BookingDeliveryRecord } from "@/modules/tms/booking/types";
import { setBookingTrackingTrips } from "@track-trace/integration/bookingTrackingBridge";
import type { TrackingLocation, TrackingTrip } from "@track-trace/types/tracking.types";

// Mirrors the shared booking store into the Track-and-Trace bridge registry so
// real In-Transit bookings/deliveries surface as trips. Same port/adapter shape
// as the Finance bridge (finance-bridge-adapter.tsx). Standalone Track-and-Trace
// never mounts this, so the registry stays empty and mock trips are unchanged.
//
// User rule: only IN_TRANSIT bookings appear as active trips (Dispatch + list).
// No telemetry is invented — route/device/checkpoint arrays stay empty so the
// tracking UI degrades gracefully to a real-data view.

const PLACEHOLDER_LOCATION: TrackingLocation = {
  latitude: 0,
  longitude: 0,
  recordedAt: "",
  source: "MANUAL",
};

function bookingOrigin(booking: BookingRecord): string {
  return booking.deliveries?.[0]?.originCity?.trim() || "Origin";
}

function bookingDestination(booking: BookingRecord): string {
  const deliveries = booking.deliveries ?? [];
  return deliveries[deliveries.length - 1]?.destinationCity?.trim() || "Destination";
}

export function useTrackingTenantDataBridge(): void {
  const store = useMockStore();
  const { tenant } = useTenantRouteContext();
  const tenantId = tenant.id;

  useMemo(() => {
    const customerName = (customerId: string) =>
      store.getTenantCustomerById(customerId)?.name ?? "Customer";

    const inTransit = store
      .listTenantBookings(tenantId)
      .filter((booking) => booking.status === "IN_TRANSIT");

    const baseTrip = (booking: BookingRecord): Omit<TrackingTrip, "id" | "origin" | "destination"> => {
      const when = booking.updatedAt ?? booking.createdAt ?? "";
      return {
        bookingId: booking.bookingId,
        tenantId,
        customerName: customerName(booking.customerId),
        vehicleNumber: booking.assignment?.vehicleLabel ?? "—",
        vehicleType: "",
        driverName: booking.assignment?.driverName ?? "—",
        driverMobile: "",
        status: "In Transit",
        scheduledPickupTime: when,
        scheduledDeliveryTime: when,
        eta: when,
        delayMinutes: 0,
        lastUpdatedAt: when,
        distanceCoveredKm: 0,
        remainingDistanceKm: 0,
        currentLocation: PLACEHOLDER_LOCATION,
        lastLocationLabel: "Live tracking not connected",
        isOffline: true,
        routeDeviationKm: 0,
        plannedRoute: [],
        actualRoute: [],
        checkpoints: [],
        customerSafeStatus: "In Transit",
      };
    };

    // Booking-level trips, keyed by booking number → Dispatch + getAll.
    const dispatchTrips: TrackingTrip[] = inTransit.map((booking) => ({
      ...baseTrip(booking),
      id: booking.bookingId,
      origin: bookingOrigin(booking),
      destination: bookingDestination(booking),
    }));

    // Per-delivery trips, keyed by LR number → delivery-wise Track resolution.
    const deliveryTrips: TrackingTrip[] = inTransit.flatMap((booking) =>
      (booking.deliveries ?? [])
        .filter((delivery): delivery is BookingDeliveryRecord & { lrNumber: string } =>
          Boolean(delivery.lrNumber?.trim()),
        )
        .map((delivery) => ({
          ...baseTrip(booking),
          id: delivery.lrNumber.trim(),
          origin: delivery.originCity?.trim() || bookingOrigin(booking),
          destination: delivery.destinationCity?.trim() || bookingDestination(booking),
        })),
    );

    setBookingTrackingTrips({
      dispatchTrips,
      resolvableTrips: [...dispatchTrips, ...deliveryTrips],
    });
  }, [store, tenantId]);
}
