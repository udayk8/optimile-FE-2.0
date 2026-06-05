import { useAppStore } from '@vendor/stores/app.store'
import { useTenantBridge } from '@vendor/integration/tenant-data-bridge'
import { useVendorBookings } from '@vendor/integration/useVendorBookings'
import type { Invoice, Dispute, InvoiceLineItem } from '@vendor/types'

export interface GenerateInvoicePayload {
  tripIds: string[]
  gstRate?: number
  invoiceDate?: string
  dueDate?: string
  invoiceNumber?: string
}

export interface VendorInvoicesData {
  invoices: Invoice[]
  disputes: Dispute[]
  generateInvoice: (payload: GenerateInvoicePayload) => void
  respondToDispute: (disputeId: string, message: string, attachmentNames?: string[]) => void
  createResubmissionInvoice: (oldInvoiceId: string, lineItems: InvoiceLineItem[], invoiceNumber?: string) => void
}

/**
 * Invoices data source for the Vendor Portal. When embedded, invoices/disputes
 * come from the SHARED tenant store (so finance approve/dispute/resubmit reflect
 * here, and vendor-generated invoices reach finance). Standalone falls back to
 * the local app.store.
 */
export function useVendorInvoices(): VendorInvoicesData {
  const bridge = useTenantBridge()
  const { trips } = useVendorBookings()
  const storeInvoices = useAppStore((s) => s.invoices)
  const storeDisputes = useAppStore((s) => s.disputes)
  const storeGenerate = useAppStore((s) => s.generateInvoice)
  const storeRespond = useAppStore((s) => s.respondToDispute)
  const storeResubmit = useAppStore((s) => s.createResubmissionInvoice)

  if (bridge) {
    return {
      invoices: bridge.vendorInvoices,
      disputes: bridge.vendorDisputes,
      generateInvoice: (payload) => {
        const gstRate = payload.gstRate ?? 12
        const selected = payload.tripIds
          .map((id) => trips.find((t) => t.id === id))
          .filter((t): t is NonNullable<typeof t> => Boolean(t && t.status === 'COMPLETED' && !t.isInvoiced))
        if (selected.length === 0) return
        const lineItems: InvoiceLineItem[] = selected.map((t) => ({
          tripId: t.id,
          tripReference: t.id,
          freightCharge: t.freightRate || 0,
          lineTotal: t.freightRate || 0,
        }))
        const subtotal = lineItems.reduce((s, li) => s + li.lineTotal, 0)
        const gstAmount = Math.round(subtotal * (gstRate / 100))
        const tripDates = selected.map((t) => (t as any).completedDate ?? (t as any).deliveredDate ?? payload.invoiceDate ?? new Date().toISOString().slice(0, 10)).sort()
        const invoiceDate = (payload.invoiceDate ?? new Date().toISOString()).slice(0, 10)
        const invoiceNumber = payload.invoiceNumber ?? `INV-${invoiceDate.slice(0, 4)}-${String(100 + Math.floor((storeInvoices.length + bridge.vendorInvoices.length) % 900)).padStart(3, '0')}`
        const paymentDueDate = (payload.dueDate ?? new Date(Date.parse(invoiceDate) + 30 * 86400000).toISOString()).slice(0, 10)
        bridge.submitInvoice({
          invoiceNumber,
          invoiceDate,
          paymentDueDate,
          lineItems,
          subtotal,
          gstAmount,
          grandTotal: subtotal + gstAmount,
          billingPeriod: { from: tripDates[0] ?? invoiceDate, to: tripDates.at(-1) ?? invoiceDate },
          tripReferences: selected.map((t) => t.id),
        })
      },
      respondToDispute: (disputeId, message) => {
        const d = bridge.vendorDisputes.find((x) => x.id === disputeId)
        if (d) bridge.respondToInvoiceDispute(d.invoiceId, message)
      },
      createResubmissionInvoice: (oldInvoiceId, lineItems, invoiceNumber) =>
        bridge.createResubmissionInvoice(oldInvoiceId, lineItems, invoiceNumber),
    }
  }

  return {
    invoices: storeInvoices,
    disputes: storeDisputes,
    generateInvoice: storeGenerate,
    respondToDispute: storeRespond,
    createResubmissionInvoice: storeResubmit,
  }
}
