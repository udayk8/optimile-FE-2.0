import { createContext, useContext, type PropsWithChildren, type ReactNode } from 'react'

/**
 * Cross-module integration PORT for the Customer Dashboard.
 *
 * The Customer Dashboard runs in two modes:
 *  - standalone `/customer` (its own app, no shared store) — bridge is null and
 *    the dashboard falls back to local demo data, so the standalone build keeps
 *    working with no dependency on shared-admin-core.
 *  - embedded inside the tenant workspace
 *    (`/tenant-admin/tenant/:tenantId/customer-portal`) — shared-admin-core
 *    injects an adapter through this context so the dashboard reads/writes the
 *    SAME shared tenant booking store, pre-filtered to the LOGGED-IN customer.
 *
 * IMPORTANT: this file (and everything under `@customer/integration`) imports
 * only from `@customer/*` / react, so the standalone customer build keeps
 * working. The adapter that fulfils this port lives in shared-admin-core,
 * preserving the one-way dependency (shared-admin-core → customer-web) with no
 * circular import. This is the same pattern used by the Vendor Portal bridge.
 */

// Customer-facing booking statuses (a curated subset of the internal booking
// lifecycle — no internal-only assignment sub-states are surfaced).
export type CustomerBookingStatus =
  | 'DRAFT'
  | 'PENDING_RATE_APPROVAL'
  | 'PENDING_AUCTION'
  | 'PENDING_ASSIGNMENT'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'IN_TRANSIT_DELAYED'
  | 'IN_TRANSIT_EXCEPTION'
  | 'DELIVERED'
  | 'CANCELLED'

// The booking shape the dashboard renders. The adapter maps the shared
// BookingRecord into this customer-safe view (no vendor/driver assignment
// internals beyond what a customer is allowed to see).
export interface CustomerBookingView {
  id: string
  salesOrder: string
  status: CustomerBookingStatus
  origin: string
  destination: string
  consignee: string
  vehicle: string
  driver: string
  driverPhone: string
  weight: number
  material: string
  quantity: string
  eta: string
  bookingDate: string
  createdBy: 'ERP' | 'Customer' | 'Ops'
  freight: number
  lrNumber: string
  progress: number
  lastUpdate: string
  avgSpeed: number
  distanceKm: number
  delayedHours?: number
  exceptionNote?: string
  epod?: {
    status: 'Captured' | 'Pending'
    method: 'OTP' | 'Photo + OTP'
    timestamp?: string
    feedback?: string
  }
  consigneeLink: 'Sent and viewed' | 'Sent' | 'Not sent'
  loadStops: Array<{
    destination: string
    material: string
    quantity: string
    weight: number
    tat: string
    pod: 'Captured' | 'Pending' | 'Not applicable'
  }>
  timeline: Array<{ label: string; time: string; state: 'done' | 'current' | 'future' | 'issue' }>
  documents?: Array<{
    invoiceNumber: string
    invoiceDate: string | null
    ewayBillNumber: string | null
    ewayBillExpiry: string | null
    uploadedAt: string
  }>
  destinationChangeRequests?: Array<{
    id: string
    reason: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    raisedAt: string
  }>
}

// Master-data options for the customer Create Booking form (pre-filtered to the
// logged-in customer). No customer dropdown — the customer is the session.
export interface CustomerAddressOption {
  id: string
  label: string
  city: string
  usage: 'ORIGIN' | 'DESTINATION' | 'BOTH'
}
export interface CustomerMaterialOption {
  id: string
  label: string
  uom: string
}
export interface CustomerVehicleTypeOption {
  id: string
  label: string
}

// Form payload the dashboard submits; the adapter expands it into a full
// shared BookingRecord (customerId/tenantId/source/lifecycle status injected).
export interface CustomerCreateBookingInput {
  originAddressId: string
  destinationAddressId: string
  materialId: string
  quantity: number
  weight: number
  uom: string
  vehicleTypeId: string | null
  pickupDate: string | null
  goodsValue: number | null
  specialInstructions: string | null
}

export interface CustomerDataBridge {
  // Logged-in identity (from the shared session context).
  tenantId: string
  tenantName: string | null
  customerId: string
  customerName: string

  // Bookings for THIS customer only, mapped to the dashboard view shape and
  // sourced from the same shared store the internal Booking module uses.
  bookings: CustomerBookingView[]
  getBookingById: (id: string) => CustomerBookingView | null

  // Master data for the Create Booking form (customer-scoped).
  addresses: CustomerAddressOption[]
  materials: CustomerMaterialOption[]
  vehicleTypes: CustomerVehicleTypeOption[]

  // Creates a booking AS the logged-in customer through the SAME shared store
  // method the internal module uses (source=CUSTOMER_PORTAL). Returns the new
  // booking id so the UI can navigate to it.
  createBooking: (input: CustomerCreateBookingInput) => string

  requestDestinationChange: (bookingId: string, reason: string) => void

  // Renders the FULL internal Create Booking page (reused — not duplicated),
  // locked to this customer with the customer selector hidden. Provided only
  // when embedded. `onCreated` fires after a successful submit so the dashboard
  // can return to the bookings list. Falls back to the local form when absent.
  renderCreateBooking?: (onCreated: (bookingId: string) => void) => ReactNode
}

const CustomerDataBridgeContext = createContext<CustomerDataBridge | null>(null)

export function CustomerDataBridgeProvider({
  value,
  children,
}: PropsWithChildren<{ value: CustomerDataBridge }>) {
  return (
    <CustomerDataBridgeContext.Provider value={value}>{children}</CustomerDataBridgeContext.Provider>
  )
}

/**
 * Returns the injected bridge, or `null` when the dashboard runs standalone (no
 * provider mounted) or is opened by a non-customer session. Consumers fall back
 * to local demo data when null.
 */
export function useCustomerBridge(): CustomerDataBridge | null {
  return useContext(CustomerDataBridgeContext)
}
