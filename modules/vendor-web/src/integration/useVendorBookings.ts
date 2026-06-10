import { useAppStore } from '@vendor/stores/app.store'
import { useTenantBridge, type VendorBookingDetail, type VendorTripExceptionInput } from '@vendor/integration/tenant-data-bridge'
import type { Indent, Trip } from '@vendor/types'

// A PENDING indent's SLA is 2h from when it was sent. Once the slaDeadline
// passes the indent lapses and must not be shown to the vendor anymore — the
// tenant team assigns a vehicle manually instead. Non-pending indents
// (accepted / declined) keep showing in their respective tabs.
function dropExpiredPendingIndents(indents: Indent[]): Indent[] {
  const now = Date.now()
  return indents.filter(
    (i) => i.status !== 'PENDING' || Date.parse(i.slaDeadline) > now,
  )
}

export interface VendorBookingsData {
  indents: Indent[]
  trips: Trip[]
  acceptIndent: (id: string) => void
  declineIndent: (id: string) => void
  assignVehicle: (bookingId: string, vehicleId: string, driverId: string) => void
  /** Rich shared-booking detail (embedded only); null standalone. */
  getBookingDetail: (bookingRef: string) => VendorBookingDetail | null
  /** Record an expense/advance against a booking (persists cross-module when embedded). */
  addBookingExpense: (
    bookingId: string,
    input: { label: string; amount: number; expenseType: string; paymentMode?: string; paidBy?: string; notes?: string },
  ) => void
  /** Report / update / replace / resolve a breakdown exception (persists cross-module when embedded). */
  changeTripException: (tripId: string, input: VendorTripExceptionInput) => void
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
  const addTripExpense = useAppStore((state) => state.addTripExpense)
  const changeTripAssignment = useAppStore((state) => state.changeTripAssignment)

  // Map the unified exception payload onto the local store action.
  const localException = (tripId: string, input: VendorTripExceptionInput) =>
    changeTripAssignment(tripId, {
      vehicleId: input.mode === 'replace' ? input.vehicleId : undefined,
      driverId: input.mode === 'replace' ? input.driverId : undefined,
      issueReason: input.mode === 'report' ? input.reason : undefined,
      notes: input.notes,
      revisedEta: input.revisedEta,
      resolve: input.mode === 'resolve',
    })

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
      indents: dropExpiredPendingIndents([...bridge.bookingIndents, ...indents]),
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
      addBookingExpense: (id, input) =>
        mockTripIds.has(id) ? addTripExpense(id, input) : bridge.addBookingExpense(id, input),
      changeTripException: (id, input) =>
        mockTripIds.has(id) ? localException(id, input) : bridge.changeBookingException(id, input),
      isBridgeRecord: (id) => bridgeIds.has(id),
    }
  }

  // Standalone (no bridge): local mock demo dataset only.
  return { indents: dropExpiredPendingIndents(indents), trips, acceptIndent, declineIndent, assignVehicle: assignVehicleToTrip, getBookingDetail: () => null, addBookingExpense: addTripExpense, changeTripException: localException, isBridgeRecord: () => false }
}
