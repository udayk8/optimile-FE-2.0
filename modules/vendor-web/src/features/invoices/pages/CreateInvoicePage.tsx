import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@vendor/hooks/useModuleRoute'
import { ArrowLeft, ArrowRight, CheckCircle2, FilePlus, ReceiptText } from 'lucide-react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { Card, CardContent } from '@vendor/components/ui/card'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { formatDate } from '@vendor/lib/date-utils'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { InvoicePdfDocument } from '@vendor/components/shared/InvoicePdfDocument'
import { useVendorInvoiceProfile } from '@vendor/integration/useVendorInvoiceProfile'
import { useTenantBridge } from '@vendor/integration/tenant-data-bridge'
import { useVendorBookings } from '@vendor/integration/useVendorBookings'
import { useVendorInvoices, invoicedTripIds } from '@vendor/integration/useVendorInvoices'
import { useVendorGstRate } from '@vendor/integration/useVendorGstRate'
import type { Invoice, InvoiceLineItem, Trip } from '@vendor/types'

type Step = 'select' | 'review'

const PAGE_SIZE = 5
const CUSTOMER_ADDRESS =
  '161, Basavanagar Main Rd, above Reliance Trends, Vignan Nagar, Doddanekkundi Road, Bengaluru, Karnataka – 560037'

// Per-booking editable charges (string-backed for the inputs).
type ChargeEdit = { freight: string; advance: string; detention: string; loading: string }

// Default charges pulled from the booking — freight rate + approved expenses,
// bucketed into detention / loading-unloading, plus the advance.
function chargeDefaults(trip: Trip): ChargeEdit {
  const approved = (trip.expenses ?? []).filter((e) => e.status === 'Approved')
  const bucket = (re: RegExp) => approved.filter((e) => re.test(`${e.expenseType ?? ''} ${e.label ?? ''}`)).reduce((s, e) => s + (e.amount || 0), 0)
  const detention = bucket(/detention/i)
  const loading = bucket(/load|unload/i)
  return {
    freight: String(trip.freightRate || 0),
    advance: String(trip.advance ?? 0),
    detention: String(detention),
    loading: String(loading),
  }
}

const num = (v: string) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export default function CreateInvoicePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { trips } = useVendorBookings()
  const { generateInvoice, createResubmissionInvoice, invoices } = useVendorInvoices()
  // Vendor's GST rate, configured by the tenant admin at onboarding (cross-module).
  const GST_RATE = useVendorGstRate()
  const [step, setStep] = useState<Step>('select')
  const [page, setPage] = useState(1)
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([])
  // Editable per-booking charges, keyed by trip id.
  const [edits, setEdits] = useState<Record<string, ChargeEdit>>({})
  // Rows are read-only until the user clicks the row's "Edit".
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set())
  const toggleRowEdit = (tripId: string) =>
    setEditingRows((prev) => {
      const next = new Set(prev)
      if (next.has(tripId)) next.delete(tripId)
      else next.add(tripId)
      return next
    })
  const setEditField = (tripId: string, field: keyof ChargeEdit, value: string) =>
    setEdits((prev) => ({ ...prev, [tripId]: { ...(prev[tripId] ?? { freight: '0', advance: '0', detention: '0', loading: '0' }), [field]: value } }))

  // Resubmission: ?resubmit=<invoiceId> loads that invoice's bookings + charges
  // into the same editable flow, then submits as a corrected (superseding) invoice.
  const resubmitId = useMemo(() => new URLSearchParams(location.search).get('resubmit'), [location.search])
  const resubmitInvoice = useMemo(
    () => (resubmitId ? invoices.find((inv) => inv.id === resubmitId) ?? null : null),
    [resubmitId, invoices],
  )
  const [resubmitInit, setResubmitInit] = useState(false)

  // A booking is eligible to bill once it is COMPLETED with a freight value and
  // no active invoice already covers it. Raising an invoice removes the booking
  // here; the invoice being CLOSED brings it back. Derived from the invoice
  // list so the two stay consistent.
  const lockedTripIds = useMemo(() => invoicedTripIds(invoices), [invoices])
  const eligibleTrips = useMemo(
    () => trips.filter((trip) => trip.status === 'COMPLETED' && !lockedTripIds.has(trip.id) && trip.freightRate > 0),
    [trips, lockedTripIds],
  )

  const eligibleTripIds = useMemo(() => eligibleTrips.map((trip) => trip.id), [eligibleTrips])

  // Selected bookings resolve from the FULL trip list (resubmission re-bills
  // already-invoiced bookings, which are excluded from the eligible set).
  const selectedTrips = useMemo(
    () => selectedTripIds.map((id) => trips.find((t) => t.id === id)).filter((t): t is Trip => Boolean(t)),
    [trips, selectedTripIds],
  )

  // Resolve a booking's editable charges — the live edit if present, else defaults.
  const chargesFor = (trip: Trip): ChargeEdit => edits[trip.id] ?? chargeDefaults(trip)

  // Line items built from the edited charges. lineTotal (taxable) excludes advance.
  const lineItems = useMemo<InvoiceLineItem[]>(
    () =>
      selectedTrips.map((trip) => {
        const c = chargesFor(trip)
        const freight = num(c.freight)
        const detention = num(c.detention)
        const loading = num(c.loading)
        return {
          tripId: trip.id,
          tripReference: trip.id,
          freightCharge: freight,
          advance: num(c.advance),
          detentionCharges: detention,
          loadingUnloadingCharges: loading,
          lineTotal: freight + detention + loading,
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedTrips, edits],
  )

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0)
    const gstAmount = Math.round(subtotal * (GST_RATE / 100))
    const totalAdvance = lineItems.reduce((sum, li) => sum + (li.advance ?? 0), 0)
    return {
      subtotal,
      gstAmount,
      grandTotal: subtotal + gstAmount,
      totalAdvance,
      netPayable: subtotal + gstAmount - totalAdvance,
      bookingCount: lineItems.length,
    }
  }, [lineItems, GST_RATE])

  const bridge = useTenantBridge()
  const { getBookingDetail } = useVendorBookings()
  const invoiceProfile = useVendorInvoiceProfile()
  const customerName = bridge?.tenantName ?? 'Optimile Pvt Ltd'
  const getLrNumber = (tripId: string) => getBookingDetail(tripId)?.lrNumbers?.[0] ?? null

  // Draft invoice mirroring what will be created — drives the PDF preview.
  const draftInvoice = useMemo((): Invoice => {
    const now = new Date().toISOString()
    return {
      id: 'DRAFT',
      invoiceNumber: resubmitInvoice ? `${resubmitInvoice.invoiceNumber} (revised)` : 'DRAFT (assigned on submit)',
      invoiceDate: now,
      paymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      subtotal: totals.subtotal,
      gstAmount: totals.gstAmount,
      grandTotal: totals.grandTotal,
      status: 'PENDING',
      lineItems,
      // Preview only — the submitted invoice's GSTINs + GST split are set in the store.
      vendorGstin: invoiceProfile.companyInfo.gstin,
      customerGstin: '27AABCU9603R1ZM',
      createdAt: now,
    } as unknown as Invoice
  }, [lineItems, totals, invoiceProfile, resubmitInvoice])

  // Seed default charges for any selected booking that has no edits yet, so the
  // inputs are controlled and editing one field never wipes the others.
  useEffect(() => {
    setEdits((prev) => {
      let changed = false
      const next = { ...prev }
      for (const trip of selectedTrips) {
        if (!next[trip.id]) {
          next[trip.id] = chargeDefaults(trip)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [selectedTrips])

  // Resubmission: load the invoice's bookings + charges into the editable flow.
  useEffect(() => {
    if (!resubmitInvoice || resubmitInit) return
    const seeded: Record<string, ChargeEdit> = {}
    for (const li of resubmitInvoice.lineItems) {
      const trip = trips.find((t) => t.id === li.tripId)
      const def = trip ? chargeDefaults(trip) : { freight: '0', advance: '0', detention: '0', loading: '0' }
      seeded[li.tripId] = {
        freight: String(li.freightCharge ?? def.freight),
        advance: String(li.advance ?? def.advance),
        detention: String(li.detentionCharges ?? def.detention),
        loading: String(li.loadingUnloadingCharges ?? def.loading),
      }
    }
    setEdits((prev) => ({ ...seeded, ...prev }))
    setSelectedTripIds(resubmitInvoice.lineItems.map((li) => li.tripId))
    setStep('review')
    setResubmitInit(true)
  }, [resubmitInvoice, resubmitInit, trips])

  const totalPages = Math.max(1, Math.ceil(eligibleTrips.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedTrips = eligibleTrips.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const selectedOnPage = pagedTrips.filter((trip) => selectedTripIds.includes(trip.id)).length
  const allOnPageSelected = pagedTrips.length > 0 && selectedOnPage === pagedTrips.length

  // Cap at 5 bookings per invoice so the document fits a single A4 page.
  const MAX_INVOICE_TRIPS = 5
  const toggleTrip = (tripId: string) => {
    setSelectedTripIds((prev) => {
      if (prev.includes(tripId)) return prev.filter((id) => id !== tripId)
      if (prev.length >= MAX_INVOICE_TRIPS) {
        window.alert(`You can invoice up to ${MAX_INVOICE_TRIPS} bookings together (A4 page limit).`)
        return prev
      }
      return [...prev, tripId]
    })
  }

  const togglePageSelection = () => {
    setSelectedTripIds((prev) => {
      const current = new Set(prev)
      if (allOnPageSelected) {
        pagedTrips.forEach((trip) => current.delete(trip.id))
      } else {
        for (const trip of pagedTrips) {
          if (current.size >= MAX_INVOICE_TRIPS) break
          current.add(trip.id)
        }
        if (current.size >= MAX_INVOICE_TRIPS) {
          window.alert(`You can invoice up to ${MAX_INVOICE_TRIPS} bookings together (A4 page limit).`)
        }
      }
      return Array.from(current)
    })
  }

  const canReview = selectedTrips.length > 0

  const handleSubmit = () => {
    if (resubmitInvoice) {
      // Corrected invoice supersedes the resubmission-required one.
      createResubmissionInvoice(resubmitInvoice.id, lineItems)
      navigate('/vendor/invoices?tab=pending')
      return
    }
    generateInvoice({
      tripIds: selectedTrips.map((trip) => trip.id),
      gstRate: GST_RATE,
      lineItems,
    })
    navigate('/vendor/invoices/list')
  }

  const selectHeaderText = canReview
    ? `${selectedTrips.length} booking${selectedTrips.length === 1 ? '' : 's'} selected across pages.`
    : 'Select one or more completed bookings to create an invoice.'

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="pl-0 text-gray-500 hover:text-text" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <HeroCard
        eyebrow="INVOICES"
        title="Create Invoice"
        subtitle="Select completed uninvoiced bookings, review totals, and submit the invoice."
        icon={<FilePlus className="h-6 w-6 text-primary" />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Eligible bookings</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text">{eligibleTrips.length}</div>
          <div className="mt-2 text-sm text-gray-500">Completed and uninvoiced trips.</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Subtotal</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text">
            <CurrencyDisplay amount={totals.subtotal} />
          </div>
          <div className="mt-2 text-sm text-gray-500">Freight for selected bookings.</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">GST at {GST_RATE}%</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text">
            <CurrencyDisplay amount={totals.gstAmount} />
          </div>
          <div className="mt-2 text-sm text-gray-500">Added before submission.</div>
        </div>
      </div>

      {step === 'select' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text">Completed bookings</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectHeaderText}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={togglePageSelection} disabled={pagedTrips.length === 0}>
                {allOnPageSelected ? 'Clear page selection' : 'Select all on page'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/vendor/invoices/list')}>
                Go to invoice list
              </Button>
            </div>
          </div>

          {eligibleTrips.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No eligible bookings"
                description="Completed bookings will appear here once POD is confirmed and they are not yet invoiced."
              />
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={togglePageSelection}
                          aria-label="Select all bookings on this page"
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </th>
                      <th className="px-5 py-3 font-bold">Booking</th>
                      <th className="px-5 py-3 font-bold">Route</th>
                      <th className="px-5 py-3 font-bold">Delivered</th>
                      <th className="px-5 py-3 font-bold text-right">Freight</th>
                      <th className="px-5 py-3 font-bold text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pagedTrips.map((trip) => {
                      const lineTotal = trip.freightRate
                      const selected = selectedTripIds.includes(trip.id)
                      return (
                        <tr
                          key={trip.id}
                          className={`cursor-pointer transition hover:bg-gray-50 ${selected ? 'bg-emerald-50/30' : ''}`}
                          onClick={() => toggleTrip(trip.id)}
                        >
                          <td className="px-5 py-4">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleTrip(trip.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-gray-300"
                              aria-label={`Select ${trip.id}`}
                            />
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-mono text-sm font-semibold text-text">{trip.id}</div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <StatusBadge status={trip.status} />
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-text">
                            {trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600">
                            {trip.deliveredDate ? formatDate(trip.deliveredDate) : '—'}
                          </td>
                          <td className="px-5 py-4 text-right font-medium text-emerald-600">
                            <CurrencyDisplay amount={trip.freightRate} />
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-text">
                            <CurrencyDisplay amount={lineTotal} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
                <span>
                  Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, eligibleTrips.length)} of {eligibleTrips.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={safePage === 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <span className="rounded-lg bg-gray-50 px-3 py-2 font-semibold text-text">
                    Page {safePage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={safePage === totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 border-t border-gray-100 px-6 py-5 md:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Bookings selected</div>
              <div className="mt-1 text-lg font-semibold text-text">{totals.bookingCount}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Subtotal</div>
              <div className="mt-1 text-lg font-semibold text-text">
                <CurrencyDisplay amount={totals.subtotal} />
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">GST + total</div>
              <div className="mt-1 text-lg font-semibold text-text">
                <CurrencyDisplay amount={totals.gstAmount} /> / <CurrencyDisplay amount={totals.grandTotal} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 p-6 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-500">
              {canReview ? `${selectedTrips.length} booking${selectedTrips.length === 1 ? '' : 's'} selected.` : 'Select at least one booking to continue.'}
            </div>
            <Button disabled={!canReview} onClick={() => setStep('review')}>
              Review invoice
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <>
        <div className="grid gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-text">Review &amp; edit charges</h3>
              <p className="mt-1 text-sm text-gray-500">Charges are read-only by default — click <span className="font-semibold">Edit</span> on a row to adjust its freight, advance, detention and loading &amp; unloading before raising the invoice.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3 text-right">Freight</th>
                    <th className="px-4 py-3 text-right">Advance</th>
                    <th className="px-4 py-3 text-right">Detention</th>
                    <th className="px-4 py-3 text-right">Loading &amp; Unloading</th>
                    <th className="px-4 py-3 text-right">Line total</th>
                    <th className="px-4 py-3 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedTrips.map((trip) => {
                    const c = chargesFor(trip)
                    const lineTotal = num(c.freight) + num(c.detention) + num(c.loading)
                    const editing = editingRows.has(trip.id)
                    const cell = (key: keyof ChargeEdit) => (
                      <td className="px-4 py-3 text-right">
                        {editing ? (
                          <input
                            type="number"
                            value={c[key]}
                            onChange={(e) => setEditField(trip.id, key, e.target.value)}
                            className="h-9 w-28 rounded-lg border border-gray-300 px-2 text-right text-sm outline-none focus:border-primary"
                          />
                        ) : (
                          <CurrencyDisplay amount={num(c[key])} />
                        )}
                      </td>
                    )
                    return (
                      <tr key={trip.id}>
                        <td className="px-4 py-3"><span className="font-mono text-sm font-semibold text-text">{trip.id}</span></td>
                        <td className="px-4 py-3 text-gray-600">{trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}</td>
                        {cell('freight')}
                        {cell('advance')}
                        {cell('detention')}
                        {cell('loading')}
                        <td className="px-4 py-3 text-right font-semibold text-text"><CurrencyDisplay amount={lineTotal} /></td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleRowEdit(trip.id)}
                            className="text-sm font-semibold text-primary hover:underline"
                          >
                            {editing ? 'Done' : 'Edit'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Invoice preview — exact document that the PDF download produces ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-text">Invoice preview</h3>
            <p className="mt-1 text-sm text-gray-500">This is exactly how the invoice PDF will look. The invoice number is assigned on submit.</p>
          </div>
          <div className="overflow-x-auto bg-gray-100 p-6">
            <div className="mx-auto w-fit shadow-lg">
              <InvoicePdfDocument
                invoice={draftInvoice}
                trips={selectedTrips}
                companyName={invoiceProfile.companyName}
                companyInfo={invoiceProfile.companyInfo}
                bank={invoiceProfile.bank}
                terms={invoiceProfile.terms}
                logoUrl={invoiceProfile.logoUrl}
                customerName={customerName}
                customerCode={bridge?.tenantCode ?? undefined}
                customerAddress={CUSTOMER_ADDRESS}
                getLrNumber={getLrNumber}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 p-6">
            {!resubmitInvoice && (
              <Button variant="outline" onClick={() => setStep('select')}>
                Back to selection
              </Button>
            )}
            <Button onClick={handleSubmit}>
              {resubmitInvoice ? 'Submit revised invoice' : 'Submit invoice'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        </>
      )}
    </div>
  )
}
