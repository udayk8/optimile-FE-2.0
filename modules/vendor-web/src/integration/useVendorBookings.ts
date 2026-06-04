import { useAppStore } from '@vendor/stores/app.store'
import { useTenantBridge, type VendorBookingDetail } from '@vendor/integration/tenant-data-bridge'
import type { Indent, Trip } from '@vendor/types'

export interface VendorBookingsData {
  indents: Indent[]
  trips: Trip[]
  acceptIndent: (id: string) => void
  declineIndent: (id: string) => void
  assignVehicle: (bookingId: string, vehicleId: string, driverId: string) => void
  /** Rich shared-booking detail (embedded only); null standalone. */
  getBookingDetail: (bookingRef: string) => VendorBookingDetail | null
  /** True when the record came from the cross-module tenant bridge (vs local mock data). */
  isBridgeRecord: (id: string) => boolean
}

/**
 * Bookings data source for the Vendor Portal. When embedded, indents/trips are
 * derived from the shared tenant bookings assigned to the logged-in vendor;
 * standalone it falls back to the local app.store.
 */
export function useVendorBookings(): VendorBookingsData {
  const bridge = useTenantBridge()
  const indents = useAppStore((state) => state.indents)
  const trips = useAppStore((state) => state.trips)
  const acceptIndent = useAppStore((state) => state.acceptIndent)
  const declineIndent = useAppStore((state) => state.declineIndent)
  const assignVehicleToTrip = useAppStore((state) => state.assignVehicleToTrip)

  // Embedded → MERGE the vendor's real tenant bookings (bridge) with the local
  // mock demo dataset, so a freshly onboarded / demo vendor like Mahesh sees the
  // demo baseline AND any real indents/bookings created for them later. Real
  // records come first. Accept/decline/assign route by which set owns the id.
  if (bridge) {
    const mockIndentIds = new Set(indents.map((i) => i.id))
    const mockTripIds = new Set(trips.map((t) => t.id))
    const bridgeIds = new Set([
      ...bridge.bookingIndents.map((i) => i.id),
      ...bridge.bookingTrips.map((t) => t.id),
    ])
    return {
      indents: [...bridge.bookingIndents, ...indents],
      trips: [...bridge.bookingTrips, ...trips],
      acceptIndent: (id) => (mockIndentIds.has(id) ? acceptIndent(id) : bridge.acceptBooking(id)),
      declineIndent: (id) => (mockIndentIds.has(id) ? declineIndent(id) : bridge.declineBooking(id)),
      assignVehicle: (tripId, vehicleId, driverId) =>
        mockTripIds.has(tripId)
          ? assignVehicleToTrip(tripId, vehicleId, driverId)
          : bridge.assignVehicle(tripId, vehicleId, driverId),
      // Mock trips have no rich detail; bridge.getBookingDetail returns null for
      // any ref it doesn't own, so this is safe for both.
      getBookingDetail: bridge.getBookingDetail,
      isBridgeRecord: (id) => bridgeIds.has(id),
    }
  }

  // Standalone (no bridge): local mock demo dataset only.
  return { indents, trips, acceptIndent, declineIndent, assignVehicle: assignVehicleToTrip, getBookingDetail: () => null, isBridgeRecord: () => false }
}
