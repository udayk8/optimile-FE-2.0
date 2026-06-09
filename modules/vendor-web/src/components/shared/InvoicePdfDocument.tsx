import { forwardRef } from 'react'
import { amountInWords } from '@vendor/lib/pdf'
import { formatDate } from '@vendor/lib/date-utils'
import { stateCodeOf } from '@shared-utils'
import type { BankDetails, CompanyInfo, Invoice, Trip } from '@vendor/types'

/* Transporter freight invoice — classic blue tabular layout (Royal Carriers
   style). Rendered on-screen as the preview and captured by html2canvas for
   the PDF download, so everything is plain DOM + inline-friendly styles. */

const BLUE = '#2D3AC8'

export interface InvoicePdfProps {
  invoice: Invoice
  /** Trips referenced by the invoice line items (for truck / lane / dates / LR). */
  trips: Trip[]
  companyName: string
  companyInfo: CompanyInfo
  bank: BankDetails
  customerName: string
  customerAddress: string
  /** Vendor logo (data URL or URL), configured by the tenant at onboarding. */
  logoUrl?: string
  /** Declaration / terms lines, configured by the tenant at onboarding. */
  terms?: string[]
  /** Resolves shared-booking LR numbers when embedded; optional. */
  getLrNumber?: (tripId: string) => string | null
}

const DEFAULT_TERMS = [
  'No credit is available unless confirmed in writing by our Authorised Signatory.',
  'Interest @ 18% per annum will be charged on delayed payments past the due date.',
  'Any discrepancies in the invoice should be informed in writing within 7 days of submission, otherwise the invoice will be considered as accepted.',
]

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-stretch border-b" style={{ borderColor: '#C7CBEF' }}>
      <div className="w-1/2 px-3 py-1.5 text-[11px] font-semibold text-gray-700">{label}</div>
      <div className={`w-1/2 px-3 py-1.5 text-[11px] ${strong ? 'font-semibold' : ''} text-gray-800`}>{value}</div>
    </div>
  )
}

export const InvoicePdfDocument = forwardRef<HTMLDivElement, InvoicePdfProps>(function InvoicePdfDocument(
  // logoUrl is still accepted (configured at onboarding) but intentionally not
  // rendered on the PDF for now.
  { invoice, trips, companyName, companyInfo, bank, customerName, customerAddress, terms, getLrNumber },
  ref,
) {
  const declarationLines = terms && terms.length > 0 ? terms : DEFAULT_TERMS
  const tripById = new Map(trips.map((t) => [t.id, t]))
  const firstTrip = invoice.lineItems.map((li) => tripById.get(li.tripId)).find(Boolean)

  const lrFor = (tripId: string): string => {
    const bridgeLr = getLrNumber?.(tripId)
    if (bridgeLr) return bridgeLr
    const doc = tripById.get(tripId)?.documents?.find((d) => d.type === 'LR_COPY')
    if (doc) return doc.fileName.replace(/\.[a-z]+$/i, '').toUpperCase()
    // Fallback mock LR for bookings that don't carry one yet — deterministic
    // from the booking reference so it stays stable per trip.
    const digits = tripId.replace(/\D/g, '').slice(-6)
    return `LR-${digits || tripId.toUpperCase()}`
  }

  const paymentTermDays = Math.max(
    0,
    Math.round((new Date(invoice.paymentDueDate).getTime() - new Date(invoice.invoiceDate).getTime()) / 86400000),
  )
  const gstRate = invoice.subtotal > 0 ? Math.round((invoice.gstAmount / invoice.subtotal) * 100) : 0
  // Place of supply: inter-state -> IGST, intra-state -> CGST+SGST. Prefer the
  // stored split; fall back to deriving from the two GSTINs for older invoices.
  const supplierState = stateCodeOf(invoice.vendorGstin)
  const buyerState = stateCodeOf(invoice.customerGstin)
  const interState =
    invoice.igst != null || invoice.cgst != null
      ? (invoice.igst ?? 0) > 0
      : !(supplierState && buyerState && supplierState === buyerState)
  const cgstAmt = invoice.cgst ?? (interState ? 0 : Math.round(invoice.gstAmount / 2))
  const sgstAmt = invoice.sgst ?? (interState ? 0 : invoice.gstAmount - Math.round(invoice.gstAmount / 2))
  const igstAmt = invoice.igst ?? (interState ? invoice.gstAmount : 0)
  const addr = companyInfo.registeredAddress

  return (
    <div ref={ref} className="w-[900px] bg-white text-gray-900" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      <div className="border-2" style={{ borderColor: BLUE }}>
        {/* ── Header: company block + invoice meta ── */}
        <div className="flex">
          <div className="w-1/2 border-r-2 p-4" style={{ borderColor: BLUE }}>
            <h1 className="text-2xl font-extrabold tracking-tight">{companyName}</h1>
            <p className="mt-1 text-[11px] text-gray-700">
              {addr.street}, {addr.city}, {addr.state} – {addr.pincode}
            </p>
            <p className="mt-2 text-[11px] font-bold text-gray-800">
              GST No. {invoice.vendorGstin} | PAN No. {companyInfo.pan}
            </p>
          </div>
          <div className="w-1/2">
            <div className="px-3 py-1.5 text-center text-sm font-bold tracking-[0.2em] text-white" style={{ backgroundColor: BLUE }}>
              INVOICE
            </div>
            <Row label="Invoice No.:" value={invoice.invoiceNumber || invoice.id} />
            <Row label="Bill Date:" value={formatDate(invoice.invoiceDate)} />
            <Row label="Delivery Note:" value="–" />
            <Row label="Terms Of Payment:" value={`${paymentTermDays} Days`} />
            <Row label="Customer Code:" value="OPT-001" />
            <Row label="Buyer's Order No.:" value={invoice.lineItems[0]?.tripReference ?? '—'} />
            <Row label="Due Date:" value={formatDate(invoice.paymentDueDate)} />
            <Row label="Dispatch Through:" value={firstTrip?.assignedVehicle.registrationNumber ?? '—'} />
            <Row label="Destination:" value={firstTrip?.laneDetails.destination.city ?? '—'} />
            <Row label="Origin:" value={firstTrip?.laneDetails.origin.city ?? '—'} />
            <Row label="Terms of Delivery:" value="Door Delivery" strong />
          </div>
        </div>

        {/* ── Bill to ── */}
        <div className="border-t-2 p-4" style={{ borderColor: BLUE }}>
          <p className="text-[11px] font-semibold text-gray-500">BILL TO :</p>
          <p className="mt-1 text-base font-extrabold">{customerName}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-700">{customerAddress}</p>
        </div>

        {/* ── Line items ── */}
        <table className="w-full border-t-2 text-[10px]" style={{ borderColor: BLUE }}>
          <thead>
            <tr className="text-white" style={{ backgroundColor: BLUE }}>
              {['Sr No', 'Bkg ID', 'Shipping Date', 'Delivery Date', 'Vehicle No', 'Origin', 'Destination', 'LR No', 'Freight Cost', 'Advance', 'Expense', 'Total Cost'].map((h) => (
                <th key={h} className="border px-1.5 py-2 text-center font-bold" style={{ borderColor: '#C7CBEF' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, index) => {
              const trip = tripById.get(item.tripId)
              const expense = trip?.approvedExpenses ?? 0
              const totalCost = item.lineTotal + expense
              return (
                <tr key={item.tripId}>
                  <td className="border px-1.5 py-3 text-center" style={{ borderColor: '#C7CBEF' }}>{index + 1}</td>
                  <td className="border px-1.5 py-3 text-center font-semibold" style={{ borderColor: '#C7CBEF' }}>{item.tripReference}</td>
                  <td className="border px-1.5 py-3 text-center" style={{ borderColor: '#C7CBEF' }}>{trip ? formatDate(trip.createdAt) : '—'}</td>
                  <td className="border px-1.5 py-3 text-center" style={{ borderColor: '#C7CBEF' }}>{trip?.deliveredDate ? formatDate(trip.deliveredDate) : '—'}</td>
                  <td className="border px-1.5 py-3 text-center" style={{ borderColor: '#C7CBEF' }}>{(trip?.assignedVehicle.registrationNumber ?? '—').replace(/\s*\(.*\)\s*$/, '')}</td>
                  <td className="border px-1.5 py-3 text-center" style={{ borderColor: '#C7CBEF' }}>{trip?.laneDetails.origin.city ?? '—'}</td>
                  <td className="border px-1.5 py-3 text-center" style={{ borderColor: '#C7CBEF' }}>{trip?.laneDetails.destination.city ?? '—'}</td>
                  <td className="border px-1.5 py-3 text-center" style={{ borderColor: '#C7CBEF' }}>{lrFor(item.tripId)}</td>
                  <td className="border px-1.5 py-3 text-right" style={{ borderColor: '#C7CBEF' }}>{inr(item.freightCharge)}</td>
                  <td className="border px-1.5 py-3 text-right" style={{ borderColor: '#C7CBEF' }}>{(trip?.advance ?? 0) > 0 ? inr(trip!.advance!) : '–'}</td>
                  <td className="border px-1.5 py-3 text-right" style={{ borderColor: '#C7CBEF' }}>{expense > 0 ? inr(expense) : '–'}</td>
                  <td className="border px-1.5 py-3 text-right font-semibold" style={{ borderColor: '#C7CBEF' }}>{inr(totalCost)}</td>
                </tr>
              )
            })}
            {/* filler rows so short invoices still look like the printed form */}
            {Array.from({ length: Math.max(0, 3 - invoice.lineItems.length) }).map((_, i) => (
              <tr key={`filler-${i}`}>
                {Array.from({ length: 12 }).map((__, j) => (
                  <td key={j} className="border px-1.5 py-3" style={{ borderColor: '#C7CBEF' }}>&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── In words + totals ── */}
        <div className="flex border-t-2" style={{ borderColor: BLUE }}>
          <div className="w-1/2 border-r-2 p-4" style={{ borderColor: BLUE }}>
            <p className="text-[12px]"><span className="font-bold">In Words:</span> Rupees {amountInWords(invoice.grandTotal)} Only</p>
          </div>
          <div className="w-1/2 text-[11px]">
            <div className="flex justify-between border-b px-4 py-2" style={{ borderColor: '#C7CBEF' }}>
              <span className="text-gray-700">Taxable Value</span>
              <span className="font-semibold">{inr(invoice.subtotal)}</span>
            </div>
            {interState ? (
              <div className="flex justify-between border-b px-4 py-2" style={{ borderColor: '#C7CBEF' }}>
                <span className="text-gray-700">IGST @ {gstRate}%</span>
                <span className="font-semibold">{inr(igstAmt)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between border-b px-4 py-2" style={{ borderColor: '#C7CBEF' }}>
                  <span className="text-gray-700">CGST @ {gstRate / 2}%</span>
                  <span className="font-semibold">{inr(cgstAmt)}</span>
                </div>
                <div className="flex justify-between border-b px-4 py-2" style={{ borderColor: '#C7CBEF' }}>
                  <span className="text-gray-700">SGST @ {gstRate / 2}%</span>
                  <span className="font-semibold">{inr(sgstAmt)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between px-4 py-2 text-[12px] font-extrabold" style={{ backgroundColor: '#EEF0FB' }}>
              <span>Total Invoice Value</span>
              <span>{inr(invoice.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Bank details + signatory ── */}
        <div className="flex border-t-2" style={{ borderColor: BLUE }}>
          <div className="w-1/2 border-r-2 p-4 text-[11px]" style={{ borderColor: BLUE }}>
            <p className="font-bold">Bank Details:</p>
            <div className="mt-2 space-y-1.5">
              <div className="flex"><span className="w-44 text-gray-500">Account Holder Name:</span><span className="font-semibold">{companyName}</span></div>
              <div className="flex"><span className="w-44 text-gray-500">Account Number:</span><span className="font-semibold">{bank.accountNumber}</span></div>
              <div className="flex"><span className="w-44 text-gray-500">Bank Branch:</span><span className="font-semibold">{bank.bankName}, {bank.branch}</span></div>
              <div className="flex"><span className="w-44 text-gray-500">IFSC:</span><span className="font-semibold">{bank.ifscCode}</span></div>
              <div className="flex"><span className="w-44 text-gray-500">Type of Account:</span><span className="font-semibold capitalize">{bank.accountType.toLowerCase()}</span></div>
              <div className="flex"><span className="w-44 text-gray-500">Make all Cheques payable to:</span><span className="font-semibold">{companyName}</span></div>
            </div>
          </div>
          <div className="flex w-1/2 flex-col justify-between p-4 text-[11px]" />
        </div>

        {/* ── Declaration ── */}
        <div className="px-3 py-1.5 text-center text-[11px] font-bold tracking-[0.2em] text-white" style={{ backgroundColor: BLUE }}>
          DECLARATION
        </div>
        <div className="p-4 text-[10px] leading-relaxed text-gray-700">
          {declarationLines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          <p className="mt-2 text-center font-semibold" style={{ color: BLUE }}>This is a Computer Generated Invoice</p>
        </div>
      </div>
    </div>
  )
})
