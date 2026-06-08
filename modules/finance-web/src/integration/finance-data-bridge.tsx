import { createContext, useContext, type PropsWithChildren } from 'react'
import type { ARInvoice, ARTrip, LedgerEntry } from '@finance/lib/receivablesStore'
import type { VendorBill } from '@finance/lib/payablesStore'

/**
 * The contracted/awarded rate behind a booking, surfaced to Finance for
 * transparency on the invoice / 3-way-match views. `source` distinguishes a
 * spot-auction win from a standing rate-card contract. All fields are best-effort
 * (the embedded adapter fills them from the booking's assignment / spot contract);
 * absent for manual/own-fleet bookings that have no underlying contract.
 */
export interface RateCardDescriptor {
  source: 'SPOT' | 'CONTRACT'
  rateCardId?: string
  lane: string
  vehicleType?: string
  rate: number
  rateType: 'PER_TRIP' | 'PER_KM' | 'PER_MT'
  validFrom?: string
  validTo?: string
  // Auction-win provenance (AP/vendor side only). Present when the vendor was
  // awarded this lane via an auction — the contract the vendor "won". Lets Finance
  // show the win behind the 3-way-match baseline (source auction, L1/L2/L3 rank,
  // volume split). Absent for manually-uploaded vendor contracts / customer cards.
  awarded?: boolean
  sourceAuctionId?: string
  allocationRank?: 'L1' | 'L2' | 'L3'
  volumeAllocationPercent?: number
}

/**
 * Per-customer credit-limit snapshot surfaced to the finance Credit Limits screen
 * (BRD 3.5). `used` is the live outstanding (unpaid AR) for that customer; the
 * block fields mirror the customer's persisted indent-block flag. Absent when
 * finance runs standalone (the page falls back to its CLIENTS mock).
 */
export interface FinanceCustomerCredit {
  customerId: string
  name: string
  creditLimit: number
  used: number
  utilizationPercent: number
  blocked: boolean
  blockReason?: string
  blockedBy?: string
  blockedAt?: string
  overridden?: boolean
}

/**
 * Cross-module integration PORT for the Finance module.
 *
 * Finance runs in two modes:
 *  - standalone `/finance` — bridge is null, pages use their own mock/demo data
 *    (the receivables store seeds), so the standalone build keeps working with
 *    no dependency on shared-admin-core.
 *  - embedded inside the tenant workspace — shared-admin-core injects an adapter
 *    so the receivables pages (Pending POD, Invoicing, Collections) read REAL
 *    booking/POD data from the shared tenant store, and invoice creation writes
 *    back to that store (createTenantInvoice + marks booking.invoiceId).
 *
 * Same one-way-dependency pattern as the Vendor/Customer bridges: this file
 * imports only `@finance/*` + react; the adapter lives in shared-admin-core.
 * Trips/invoices are typed with the receivables store's own ARTrip/ARInvoice
 * shapes so the existing finance pages render unchanged.
 */
export interface FinanceDataBridge {
  // Real bookings projected into the receivables "trip" shape (one per booking),
  // covering the POD → invoice pipeline (pending / uploaded / validated / invoiced).
  trips: ARTrip[]
  // Real shared invoices projected into the AR invoice shape for the invoice list.
  invoices: ARInvoice[]

  // POD actions write to the shared booking (booking.pod) so the change syncs to
  // Booking/Customer views too. (Existing POD upload flow is not replaced.)
  uploadPod: (tripId: string) => void
  validatePod: (tripId: string, ok: boolean, reason?: string) => void

  // Creates ONE invoice for the given trips' bookings (one customer): writes a
  // shared TenantInvoiceRecord and marks each booking invoiced so it leaves
  // Ready-to-Invoice and cannot be invoiced twice. Returns the new invoice id.
  generateInvoice: (tripIds: string[]) => string | null

  // Accounts-payable side: REAL vendor-submitted invoices projected as vendor
  // bills (linked bookings + GSTINs + billing breakdown) for the 3-way-match
  // review. The lifecycle actions write back to the shared collection so the
  // vendor portal's tabs reflect the finance decision.
  vendorBills?: VendorBill[]
  approveVendorBill?: (id: string) => void
  disputeVendorBill?: (id: string, reason: string) => void
  requestVendorResubmission?: (id: string, message?: string) => void
  rejectVendorBill?: (id: string, reason?: string) => void
  replyToVendorDispute?: (id: string, message: string) => void

  // Credit-limit monitoring + indent blocking (BRD 3.5). `customers` carries each
  // client's live utilization; the two actions persist a block flag / documented
  // override onto the shared customer record so indent creation can enforce it.
  customers?: FinanceCustomerCredit[]
  setIndentBlock?: (customerId: string, blocked: boolean, note: string) => void
  overrideIndentBlock?: (customerId: string, justification: string) => void
  // Commit a working-capital budget as the customer's credit limit (BRD 3.5).
  setCreditLimit?: (customerId: string, amount: number) => void

  // Record a customer payment against an AR invoice — marks it paid so it leaves
  // the client's live credit utilisation (BRD 3.5).
  recordPayment?: (invoiceId: string) => void
  // AR lifecycle write-backs so finance decisions persist in embedded mode.
  submitInvoice?: (invoiceId: string) => void
  decideInvoice?: (invoiceId: string, decision: 'approve' | 'correction' | 'dispute') => void
  // Real AR ledger projected from invoices (Invoice + Payment rows, running balance).
  arLedger?: LedgerEntry[]
}

const FinanceDataBridgeContext = createContext<FinanceDataBridge | null>(null)

export function FinanceDataBridgeProvider({
  value,
  children,
}: PropsWithChildren<{ value: FinanceDataBridge }>) {
  return (
    <FinanceDataBridgeContext.Provider value={value}>{children}</FinanceDataBridgeContext.Provider>
  )
}

/**
 * Returns the injected bridge, or `null` when Finance runs standalone (no
 * provider mounted). Consumers fall back to the local mock receivables store.
 */
export function useFinanceBridge(): FinanceDataBridge | null {
  return useContext(FinanceDataBridgeContext)
}
