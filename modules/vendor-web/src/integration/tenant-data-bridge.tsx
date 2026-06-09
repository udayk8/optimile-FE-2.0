import { createContext, useContext, type PropsWithChildren } from 'react'
import type { Driver, Indent, Trip, Vehicle, Invoice, Dispute, InvoiceLineItem, CompanyInfo, BankDetails } from '@vendor/types'

/**
 * Invoice-document profile the tenant configures for this vendor at onboarding
 * (company, GST/PAN, address, bank, terms, logo). The vendor's invoice PDF
 * reads everything from here — nothing is hardcoded in the portal.
 */
export interface VendorInvoiceProfile {
  companyName: string
  companyInfo: CompanyInfo
  bank: BankDetails
  terms: string[]
  logoUrl?: string
  /** active = fully onboarded; onboarding_incomplete = mandatory data missing. */
  status: 'active' | 'onboarding_incomplete' | 'inactive'
}

/** Payload the vendor portal sends when generating an invoice (embedded mode). */
export interface VendorInvoiceSubmitPayload {
  invoiceNumber: string
  invoiceDate: string
  paymentDueDate: string
  lineItems: InvoiceLineItem[]
  subtotal: number
  gstAmount: number
  grandTotal: number
  billingPeriod: { from: string; to: string }
  tripReferences: string[]
}

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

  /** Invoice-document profile (company/bank/terms/logo) the tenant configured
   *  for this vendor. null when the vendor record can't be resolved. */
  invoiceProfile: VendorInvoiceProfile | null

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
  /**
   * Like assignVehicle but takes the full vendor-shaped records, so a local
   * demo vehicle/driver (not yet in tenant master data) is auto-onboarded to
   * the tenant before assignment.
   */
  assignVehicleResolved: (bookingId: string, vehicle: Vehicle, driver: Driver) => void
  /** Full booking detail (consignor/consignee, documents, LR) for the detail page. */
  getBookingDetail: (bookingRef: string) => VendorBookingDetail | null

  // Vendor (AP) invoices — single source of truth shared with the finance module.
  // The vendor reads its own invoices/disputes here and the finance decisions
  // (approve/dispute/resubmission/reject) are reflected automatically.
  vendorInvoices: Invoice[]
  vendorDisputes: Dispute[]
  /** Vendor generates a new invoice for the selected completed trips. */
  submitInvoice: (payload: VendorInvoiceSubmitPayload) => void
  /** Vendor posts a reply on an open dispute thread. */
  respondToInvoiceDispute: (invoiceId: string, message: string) => void
  /** Vendor raises a corrected invoice that supersedes a resubmission-required one. */
  createResubmissionInvoice: (oldInvoiceId: string, lineItems: InvoiceLineItem[], invoiceNumber?: string) => void
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
