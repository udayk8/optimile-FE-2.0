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
  /** Material code shown in the selector (e.g. "MAT-001"). */
  label: string
  /** Human-readable description / sub-brand (e.g. "OPC 53 Grade Cement"). */
  description: string
  uom: string
  /** Weight per 1 unit of `uom`, in `weightUom` units. Null means no auto-calculation. */
  conversionValue: number | null
  weightUom: string | null
}
export interface CustomerVehicleTypeOption {
  id: string
  label: string
}

// Form payload the dashboard submits; the adapter expands it into a full
// shared BookingRecord (customerId/tenantId/source/lifecycle status injected).
export type CustomerCommercialType  = 'SPOT' | 'CONTRACT'
export type CustomerServiceType     = 'FTL' | 'PTL'
export type CustomerContractRateType = 'PER_TRIP' | 'PER_MT' | 'PER_KM'

export interface CustomerCreateBookingInput {
  commercialType:      CustomerCommercialType
  serviceType:         CustomerServiceType
  contractRateType:    CustomerContractRateType
  originAddressId:     string
  destinationAddressId: string
  materialId:          string
  quantity:            number
  weight:              number
  uom:                 string
  weightUom:           string
  vehicleTypeId:       string | null
  pickupDate:          string | null
  pickupTime:          string | null
  goodsValue:          number | null
  specialInstructions: string | null
  distanceKm:          number | null
  spotContractId:      string | null
  enteredRate:         number | null
  deviationRemark:     string | null
  /** When true the booking is persisted with DRAFT status instead of PENDING_ASSIGNMENT. */
  asDraft?:            boolean
}

export interface CustomerAddressInput {
  contactPersonName: string
  phone: string
  email: string
  addressName: string
  addressLine1: string
  addressLine2: string
  pincode: string
  country: string
  state: string
  city: string
  gstin: string
  /** Whether the address can be used as origin, destination, or both. */
  usage: 'ORIGIN' | 'DESTINATION' | 'BOTH'
}

export interface CustomerRateCardResult {
  rate: number
  rateType: 'PER_TRIP' | 'PER_MT' | 'PER_KM'
  laneKey: string | null
}

export interface CustomerSpotContractMatch {
  contractId: string
  sourceAuctionId: string
  vendorName: string
  contractedRate: number
  rateUnit: string
  originCity: string
  destinationCity: string
  endDate: string
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

  // Looks up a CONTRACT rate card for the given lane / route configuration.
  // Returns the matched rate and rate type, or null when no rate card covers the lane.
  lookupContractRate: (params: {
    originAddressId: string
    destinationCity: string
    vehicleTypeCode: string | null
    rateType: CustomerContractRateType
    weight: number
    pickupDate: string | null
  }) => CustomerRateCardResult | null

  // Weight UOM options for the Create Booking form (tenant-configured, e.g. KG, MT, TON).
  weightUomOptions: string[]

  // Returns a live SPOT auction contract for the given city pair, or null if none.
  // Used by the Create Booking form to surface the spot contract panel (mirrors TMS).
  getSpotContractForLane: (originCity: string, destinationCity: string) => CustomerSpotContractMatch | null

  // Saves a new address under the logged-in customer and returns it so the form
  // can immediately select it without a reload.
  createAddress: (input: CustomerAddressInput) => CustomerAddressOption

  // Creates a booking AS the logged-in customer through the SAME shared store
  // method the internal module uses (source=CUSTOMER_PORTAL). Returns the new
  // booking id so the UI can navigate to it.
  createBooking: (input: CustomerCreateBookingInput) => string

  /** Cancel a booking — only allowed for pre-dispatch statuses. */
  cancelBooking: (bookingId: string, reason: string) => void

  /** Update an existing DRAFT / PENDING booking in place. Returns the same bookingId. */
  updateBooking: (bookingId: string, input: CustomerCreateBookingInput) => string

  /**
   * Return form-compatible pre-fill data for an existing booking so the edit
   * form can initialise its state without re-fetching.
   */
  getBookingForEdit: (bookingId: string) => CustomerCreateBookingInput | null

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
