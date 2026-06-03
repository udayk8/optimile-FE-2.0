import { useAppStore } from '@vendor/stores/app.store'
import { useTenantBridge, shouldUseDemoData, type VendorBookingDetail } from '@vendor/integration/tenant-data-bridge'
import type { Indent, Trip } from '@vendor/types'

export interface VendorBookingsData {
  indents: Indent[]
  trips: Trip[]
  acceptIndent: (id: string) => void
  declineIndent: (id: string) => void
  assignVehicle: (bookingId: string, vehicleId: string, driverId: string) => void
  /** Rich shared-booking detail (embedded only); null standalone. */
  getBookingDetail: (bookingRef: string) => VendorBookingDetail | null
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

  // Embedded vendor with real tenant data → use the bridge bookings.
  if (bridge && !shouldUseDemoData(bridge)) {
    return {
      indents: bridge.bookingIndents,
      trips: bridge.bookingTrips,
      acceptIndent: bridge.acceptBooking,
      declineIndent: bridge.declineBooking,
      assignVehicle: bridge.assignVehicle,
      getBookingDetail: bridge.getBookingDetail,
    }
  }

  // Standalone, OR embedded for a vendor with no tenant data yet (freshly
  // onboarded vendor, or a demo vendor like Mahesh Transport): fall back to the
  // local demo dataset so the portal isn't empty. useFleetData uses the SAME
  // predicate so vehicles/drivers and trips stay on one source and assign works.
  return { indents, trips, acceptIndent, declineIndent, assignVehicle: assignVehicleToTrip, getBookingDetail: () => null }
}
