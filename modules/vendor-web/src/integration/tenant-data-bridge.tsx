import { createContext, useContext, type PropsWithChildren } from 'react'
import type { Driver, Indent, Trip, Vehicle } from '@vendor/types'

/**
 * Cross-module integration PORT.
 *
 * The Vendor Portal normally runs against its own local Zustand store
 * (standalone `/vendor` app). When it is embedded inside the tenant workspace
 * (`/tenant-admin/tenant/:tenantId/vendor-portal`), shared-admin-core injects an
 * adapter through this context so the portal reads/writes the SAME shared tenant
 * master data (vehicles, drivers) and sees bookings assigned to the logged-in
 * vendor — all pre-filtered to that vendor.
 *
 * IMPORTANT: this file (and everything under `@vendor/integration`) imports only
 * from `@vendor/*`, so the standalone vendor build keeps working. The adapter
 * that fulfils this port lives in shared-admin-core, preserving the one-way
 * dependency (shared-admin-core → vendor-web) with no circular import.
 *
 * All data is typed with the Vendor Portal's own `Vehicle`/`Driver`/`Indent`/
 * `Trip` shapes so existing pages render unchanged.
 */
export interface VendorBookingParty {
  name: string
  address: string
  contact?: string
  phone?: string
}

export interface VendorBookingDocument {
  id: string
  title: string
  fileName: string
  url: string
}

// Rich detail for one booking, resolved from the shared booking + customer
// addresses + LR/documents — used by the embedded booking detail page.
export interface VendorBookingDetail {
  bookingRef: string
  customerName: string
  origin: string
  destination: string
  consignor: VendorBookingParty | null
  consignee: VendorBookingParty | null
  qty: string
  weight: string
  pickup: string
  vehicle: string
  driver: string
  status: string
  freight: number
  lrNumbers: string[]
  documents: VendorBookingDocument[]
}

export interface TenantDataBridge {
  // Logged-in identity (from the shared session context).
  tenantId: string
  tenantName: string | null
  vendorId: string | null
  vendorName: string | null

  // Fleet — vendor-scoped reads + writes against shared tenant master data.
  vehicles: Vehicle[]
  drivers: Driver[]
  addVehicle: (vehicle: Vehicle) => void
  updateVehicle: (vehicle: Vehicle) => void
  addDriver: (driver: Driver) => void
  updateDriver: (driver: Driver) => void
  /** Tenant vehicle-type labels for the embedded Add Vehicle form dropdown. */
  vehicleTypeOptions: string[]

  // Bookings for this vendor, pre-bucketed into vendor-web shapes:
  //  - bookingIndents: incoming PENDING indents (Accept / Reject)
  //  - bookingTrips: accepted-vehicle-pending (status ACCEPTED) + assigned trips
  bookingIndents: Indent[]
  bookingTrips: Trip[]
  acceptBooking: (bookingId: string) => void
  declineBooking: (bookingId: string) => void
  /** Vendor assigns a vehicle+driver to an accepted booking. */
  assignVehicle: (bookingId: string, vehicleId: string, driverId: string) => void
  /** Full booking detail (consignor/consignee, documents, LR) for the detail page. */
  getBookingDetail: (bookingRef: string) => VendorBookingDetail | null
}

const TenantDataBridgeContext = createContext<TenantDataBridge | null>(null)

export function TenantDataBridgeProvider({
  value,
  children,
}: PropsWithChildren<{ value: TenantDataBridge }>) {
  return (
    <TenantDataBridgeContext.Provider value={value}>{children}</TenantDataBridgeContext.Provider>
  )
}

/**
 * Returns the injected bridge, or `null` when the portal runs standalone (no
 * provider mounted). Consumers fall back to the local app.store when null.
 */
export function useTenantBridge(): TenantDataBridge | null {
  return useContext(TenantDataBridgeContext)
}

/**
 * True when the portal should render the LOCAL DEMO dataset instead of the
 * bridge: either standalone (no bridge) or embedded for a vendor that has no
 * real tenant data yet (freshly onboarded vendor, or a demo vendor like Mahesh
 * Transport). Both bookings AND fleet are checked together so every consumer
 * (useVendorBookings, useFleetData, AssignVehicleModal) reads from the SAME
 * source — otherwise assign would mix bridge trips with store vehicles (or vice
 * versa) and silently fail on id lookup.
 */
export function shouldUseDemoData(bridge: TenantDataBridge | null): boolean {
  if (!bridge) return true
  return (
    bridge.bookingIndents.length === 0 &&
    bridge.bookingTrips.length === 0 &&
    bridge.vehicles.length === 0 &&
    bridge.drivers.length === 0
  )
}
