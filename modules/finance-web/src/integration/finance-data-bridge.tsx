import { createContext, useContext, type PropsWithChildren } from 'react'
import type { ARInvoice, ARTrip } from '@finance/lib/receivablesStore'

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
