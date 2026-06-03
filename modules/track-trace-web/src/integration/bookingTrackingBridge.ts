import { Trip, TripStatus } from '../types/fleet.types'
import type { TrackingStatus, TrackingTrip } from '../types/tracking.types'

// ── Booking → Tracking data bridge (port) ──────────────────────────────────
//
// Track-and-Trace reads its operational data through plain (non-React) service
// modules (TripAPI, getActiveTrips). To surface REAL tenant bookings as trips
// without coupling those services to the booking store, the embedded host
// (tenant-admin) mirrors its In-Transit bookings into this module-level
// registry via setBookingTrackingTrips(). The services merge the registry on
// top of their mock data.
//
// Standalone Track-and-Trace never populates the registry → empty → behavior
// is unchanged (pure mock trips).

interface BookingTrackingRegistry {
  // Booking-level In-Transit trips shown on the Dispatch list + TripAPI.getAll.
  dispatchTrips: TrackingTrip[]
  // Superset: booking-level trips PLUS per-delivery (LR) trips, resolvable by id.
  resolvableTrips: TrackingTrip[]
}

let registry: BookingTrackingRegistry = {
  dispatchTrips: [],
  resolvableTrips: [],
}

export function setBookingTrackingTrips(next: BookingTrackingRegistry): void {
  registry = {
    dispatchTrips: next.dispatchTrips ?? [],
    resolvableTrips: next.resolvableTrips ?? [],
  }
}

export function clearBookingTrackingTrips(): void {
  registry = { dispatchTrips: [], resolvableTrips: [] }
}

export function getBookingDispatchTrips(): TrackingTrip[] {
  return registry.dispatchTrips
}

export function getBookingResolvableTrips(): TrackingTrip[] {
  return registry.resolvableTrips
}

export function findBookingTrip(id: string): TrackingTrip | undefined {
  return registry.resolvableTrips.find((trip) => trip.id === id)
}

// Map the rich TrackingTrip status onto the fleet Trip status used by TripAPI.
const TRACKING_TO_TRIP_STATUS: Partial<Record<TrackingStatus, TripStatus>> = {
  Scheduled: TripStatus.PLANNED,
  Assigned: TripStatus.DISPATCHED,
  'At Pickup': TripStatus.DISPATCHED,
  Loading: TripStatus.DISPATCHED,
  'In Transit': TripStatus.IN_TRANSIT,
  'At Checkpoint': TripStatus.IN_TRANSIT,
  'Near Destination': TripStatus.IN_TRANSIT,
  Delayed: TripStatus.IN_TRANSIT,
  'Route Deviated': TripStatus.IN_TRANSIT,
  'At Destination': TripStatus.IN_TRANSIT,
  Unloading: TripStatus.IN_TRANSIT,
  Completed: TripStatus.COMPLETED,
  Cancelled: TripStatus.CANCELLED,
}

// Booking-derived TrackingTrip → fleet Trip shape consumed by TripAPI. Real
// bookings have no track-trace vehicle/driver records, so vehicle_id/driver_id
// stay null; the pages fall back to the TrackingTrip's vehicleNumber/driverName.
export function bookingTrackingTripToFleetTrip(trip: TrackingTrip): Trip {
  return {
    trip_id: trip.id,
    booking_reference: trip.bookingId,
    origin: trip.origin,
    destination: trip.destination,
    scheduled_start_time: trip.scheduledPickupTime,
    status: TRACKING_TO_TRIP_STATUS[trip.status] ?? TripStatus.IN_TRANSIT,
    vehicle_id: null,
    driver_id: null,
    created_at: trip.scheduledPickupTime,
  }
}
