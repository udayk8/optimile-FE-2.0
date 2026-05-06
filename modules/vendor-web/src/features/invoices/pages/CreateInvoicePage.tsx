import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, FilePlus, ReceiptText } from 'lucide-react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { Card, CardContent } from '@vendor/components/ui/card'
import { useAppStore } from '@vendor/stores/app.store'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { formatDate } from '@vendor/lib/date-utils'
import { EmptyState } from '@vendor/components/shared/EmptyState'

type Step = 'select' | 'review'

const PAGE_SIZE = 5
const GST_RATE = 12

export default function CreateInvoicePage() {
  const navigate = useNavigate()
  const { trips, generateInvoice } = useAppStore()
  const [step, setStep] = useState<Step>('select')
  const [page, setPage] = useState(1)
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([])

  const eligibleTrips = useMemo(
    () => trips.filter((trip) => trip.status === 'DELIVERED' && trip.podStatus === 'CONFIRMED' && !trip.isInvoiced && (trip.freightRate > 0 || trip.expenseSummary.approved > 0)),
    [trips],
  )

  const eligibleTripIds = useMemo(() => eligibleTrips.map((trip) => trip.id), [eligibleTrips])

  const selectedTrips = useMemo(
    () => eligibleTrips.filter((trip) => selectedTripIds.includes(trip.id)),
    [eligibleTrips, selectedTripIds],
  )

  const totals = useMemo(() => {
    const subtotal = selectedTrips.reduce((sum, trip) => sum + trip.freightRate + trip.expenseSummary.approved, 0)
    const gstAmount = Math.round(subtotal * (GST_RATE / 100))
    return {
      subtotal,
      gstAmount,
      grandTotal: subtotal + gstAmount,
      bookingCount: selectedTrips.length,
    }
  }, [selectedTrips])

  const totalPages = Math.max(1, Math.ceil(eligibleTrips.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedTrips = eligibleTrips.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const selectedOnPage = pagedTrips.filter((trip) => selectedTripIds.includes(trip.id)).length
  const allOnPageSelected = pagedTrips.length > 0 && selectedOnPage === pagedTrips.length

  const toggleTrip = (tripId: string) => {
    setSelectedTripIds((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId],
    )
  }

  const togglePageSelection = () => {
    setSelectedTripIds((prev) => {
      const current = new Set(prev)
      if (allOnPageSelected) {
        pagedTrips.forEach((trip) => current.delete(trip.id))
      } else {
        pagedTrips.forEach((trip) => current.add(trip.id))
      }
      return Array.from(current)
    })
  }

  const canReview = selectedTrips.length > 0

  const handleSubmit = () => {
    generateInvoice({
      tripIds: selectedTrips.map((trip) => trip.id),
      gstRate: GST_RATE,
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
          <div className="mt-2 text-sm text-gray-500">Freight plus approved expenses.</div>
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
                      <th className="px-5 py-3 font-bold text-right">Approved expenses</th>
                      <th className="px-5 py-3 font-bold text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pagedTrips.map((trip) => {
                      const lineTotal = trip.freightRate + trip.expenseSummary.approved
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
                              {trip.podStatus && <StatusBadge status={trip.podStatus} />}
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
                          <td className="px-5 py-4 text-right font-medium text-rose-600">
                            <CurrencyDisplay amount={trip.expenseSummary.approved} />
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
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-text">Review selected bookings</h3>
              <p className="mt-1 text-sm text-gray-500">Confirm the booking set before submitting the invoice.</p>
            </div>
            <div className="divide-y divide-gray-100">
              {selectedTrips.map((trip) => (
                <div key={trip.id} className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-text">{trip.id}</span>
                      <StatusBadge status={trip.status} />
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Line total</div>
                    <div className="font-semibold text-text">
                      <CurrencyDisplay amount={trip.freightRate + trip.expenseSummary.approved} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-6">
              <Button variant="outline" onClick={() => setStep('select')}>
                Back to selection
              </Button>
              <Button onClick={handleSubmit}>
                Submit invoice
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-900 p-6 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Review summary</h3>
                <p className="text-sm text-gray-300">This is the invoice total that will be submitted.</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Bookings selected</span>
                <span>{totals.bookingCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal</span>
                <span><CurrencyDisplay amount={totals.subtotal} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">GST</span>
                <span><CurrencyDisplay amount={totals.gstAmount} /></span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold">
                <span>Grand total</span>
                <span><CurrencyDisplay amount={totals.grandTotal} /></span>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 p-4 text-xs text-gray-300">
              After submission, this invoice will be created with status <span className="font-semibold text-white">SUBMITTED</span> and move to the invoice list. Once approved, it can be used in bill discounting.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
