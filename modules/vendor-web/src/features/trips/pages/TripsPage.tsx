import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useModuleNavigate as useNavigate } from '@vendor/hooks/useModuleRoute'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { PageFilterBar } from '@vendor/components/shared/PageFilterBar'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate, formatDateTime } from '@vendor/lib/date-utils'
import { useVendorBookings } from '@vendor/integration/useVendorBookings'
import { useVendorInvoices } from '@vendor/integration/useVendorInvoices'
import { Truck, Package, CheckCircle, XCircle, Route, Upload, Wrench } from 'lucide-react'
import { AssignVehicleModal } from '@vendor/components/shared/AssignVehicleModal'
import { ConfirmDialog } from '@vendor/components/shared/ConfirmDialog'
import { ChangeAssignmentModal } from '@vendor/features/trips/components/ChangeAssignmentModal'
import type { Trip } from '@vendor/types'

const PAGE_SIZE = 10

// Most recent lifecycle event — falls back to creation time.
const lastUpdateTime = (trip: { createdAt: string; timeline?: { timestamp: string }[] }) =>
  trip.timeline?.length ? [...trip.timeline].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).at(-1)!.timestamp : trip.createdAt

type BookingsTab =
  | 'all'
  | 'pending-allocation'
  | 'assignment'
  | 'in-transit'
  | 'pending-pod'
  | 'completed'
  | 'invoiced'
  | 'exception'
  | 'cancelled'
  | 'rejected'

const BOOKING_TABS: BookingsTab[] = [
  'all',
  'pending-allocation',
  'assignment',
  'in-transit',
  'pending-pod',
  'completed',
  'invoiced',
  'exception',
  'cancelled',
  'rejected',
]

const ASSIGNMENT_STATES = new Set<Trip['status']>([
  'ACCEPTED',
  'ASSIGNED',
  'OUT_FOR_PICKUP',
  'PICKUP_REACHED',
  'LOADING_STARTED',
  'LOADING_COMPLETED',
])

const IN_TRANSIT_STATES = new Set<Trip['status']>(['IN_TRANSIT', 'DESTINATION_REACHED'])

const REASON_LABEL: Record<string, string> = {
  VEHICLE_BREAKDOWN: 'Vehicle Breakdown',
  DRIVER_BREAKDOWN: 'Driver Breakdown',
  VEHICLE_OR_DRIVER_BREAKDOWN: 'Vehicle / Driver Breakdown',
}

// "Indents" is the cross-module label for vendor-assigned bookings awaiting
// action; it maps onto the existing Pending Allocation tab.
const TAB_ALIASES: Record<string, BookingsTab> = { indents: 'pending-allocation' }

function resolveTab(raw: string | null): BookingsTab | null {
  if (!raw) return null
  if (BOOKING_TABS.includes(raw as BookingsTab)) return raw as BookingsTab
  return TAB_ALIASES[raw] ?? null
}

function getBookingsTab(pathname: string, search: string): BookingsTab {
  const pathTab = resolveTab(pathname.split('/')[2])
  if (pathTab) return pathTab

  const searchTab = resolveTab(new URLSearchParams(search).get('tab'))
  return searchTab ?? 'pending-allocation'
}

function BookingCard({ title, count, active, onClick }: { title: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
        active ? 'bg-white text-text shadow-sm' : 'text-gray-600 hover:text-primary'
      }`}
    >
      {title}
      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{count}</span>
    </button>
  )
}

function Pager({ total, page, setPage }: { total: number; page: number; setPage: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safe = Math.min(page, totalPages)
  if (total === 0) return null
  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm text-gray-600">
      <span>
        Showing {(safe - 1) * PAGE_SIZE + 1}-{Math.min(safe * PAGE_SIZE, total)} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={safe <= 1} onClick={() => setPage(safe - 1)}>Prev</Button>
        <Button size="sm" variant="outline" disabled={safe >= totalPages} onClick={() => setPage(safe + 1)}>Next</Button>
      </div>
    </div>
  )
}

export default function TripsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = getBookingsTab(location.pathname, location.search)

  const { indents, trips, declineIndent, acceptIndent, isBridgeRecord, getBookingDetail } = useVendorBookings()
  const { invoices } = useVendorInvoices()

  // contractId → customer name, derived from the seeded indents so mock trips
  // (whose own indent may already be consumed) still resolve a customer.
  const contractCustomer = useMemo(() => {
    const map = new Map<string, string>()
    indents.forEach((i) => { if (i.contractId && i.contractReference) map.set(i.contractId, i.contractReference) })
    return map
  }, [indents])

  // Customer (the tenant the booking belongs to) for a row — from the bridge
  // detail when embedded, else the originating indent's contract reference, else
  // the trip's contract → customer mapping (mock data).
  const customerFor = (id: string, indentId?: string) =>
    getBookingDetail(id)?.customerName
    ?? indents.find((i) => i.id === (indentId ?? id))?.contractReference
    ?? (() => { const t = trips.find((x) => x.id === id); return t ? contractCustomer.get(t.contractId) : undefined })()
    ?? '—'

  // Map each invoiced trip → the invoice number it belongs to.
  const invoiceByTripId = useMemo(() => {
    const map = new Map<string, string>()
    for (const invoice of invoices) {
      const label = invoice.invoiceNumber || invoice.id
      ;(invoice.tripReferences ?? []).forEach((ref) => map.set(ref, label))
      invoice.lineItems.forEach((line) => { if (line.tripId) map.set(line.tripId, label) })
    }
    return map
  }, [invoices])

  // Cross-module (bridge) bookings render on white; local mock demo rows on light gray.
  const rowClass = (id: string) =>
    isBridgeRecord(id) ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'
  const [assignTripId, setAssignTripId] = useState<string | null>(null)
  const [declineConfirmId, setDeclineConfirmId] = useState<string | null>(null)
  const [reassignTripId, setReassignTripId] = useState<string | null>(null)

  // Search + date filter + pagination shared across tabs.
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  // Date filter unapplied by default — all bookings show until a range is set.
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Reset to the first page whenever the view changes.
  useEffect(() => {
    setPage(1)
  }, [activeTab, search, fromDate, toDate])

  // Pickup date/time comes from the originating indent's reporting slot; falls
  // back to the booking creation time so the column is never empty.
  const pickupOfTrip = (trip: { indentId?: string; createdAt?: string }) =>
    indents.find((indent) => indent.id === trip.indentId)?.reportingDateTime ?? trip.createdAt

  const pendingAllocation = indents.filter((indent) => indent.status === 'PENDING')

  const exceptionBookings = trips.filter((trip) => trip.exceptionFlag === true)
  const exceptionTripIds = new Set(exceptionBookings.map((t) => t.id))

  const assignmentBookings = trips.filter((trip) =>
    ASSIGNMENT_STATES.has(trip.status) && !exceptionTripIds.has(trip.id)
  )
  const inTransitBookings = trips.filter((trip) =>
    IN_TRANSIT_STATES.has(trip.status) && !exceptionTripIds.has(trip.id)
  )
  const pendingPodBookings = trips.filter((trip) => trip.status === 'POD_PENDING')
  const completedBookings = trips.filter((trip) => trip.status === 'COMPLETED')
  const cancelledTripBookings = trips.filter((trip) => trip.status === 'CANCELLED')
  const cancelledBookings = cancelledTripBookings.map((trip) => ({
    id: trip.id,
    originCity: trip.laneDetails.origin.city,
    destinationCity: trip.laneDetails.destination.city,
    stage: 'Post Dispatch',
    cancelledBy: 'Vendor',
    reason: 'Booking cancelled',
    detailsPath: `/vendor/bookings/cancelled/${trip.id}`,
    createdAt: trip.createdAt,
    timeline: trip.timeline,
  }))
  const rejectedIndentBookings = indents.filter((indent) => indent.status === 'DECLINED')
  const rejectedBookings = rejectedIndentBookings.map((indent) => ({
    id: indent.id,
    originCity: indent.laneDetails.origin.city,
    destinationCity: indent.laneDetails.destination.city,
    stage: 'Pending Transport Allocation',
    rejectedBy: 'Vendor',
    reason: indent.rejectionReason ?? 'Declined before allocation',
    detailsPath: `/vendor/bookings/rejected/${indent.id}`,
    createdAt: indent.createdAt,
  }))

  // Unified rows for the "All" tab — every indent + trip the vendor can see.
  const detailPathForTrip = (trip: Trip) => {
    const seg = trip.exceptionFlag
      ? 'exception'
      : trip.status === 'COMPLETED'
        ? 'completed'
        : trip.status === 'POD_PENDING'
          ? 'pending-pod'
          : trip.status === 'CANCELLED'
            ? 'cancelled'
            : IN_TRANSIT_STATES.has(trip.status)
              ? 'in-transit'
              : 'assignment'
    return `/vendor/bookings/${seg}/${trip.id}`
  }
  const allRows = useMemo(
    () => [
      ...indents.map((indent) => ({
        id: indent.id,
        status: indent.status,
        originCity: indent.laneDetails.origin.city,
        destinationCity: indent.laneDetails.destination.city,
        pickup: indent.reportingDateTime,
        lastUpdate: indent.createdAt,
        createdAt: indent.createdAt,
        detailsPath:
          indent.status === 'DECLINED' ? `/vendor/bookings/rejected/${indent.id}` : `/vendor/bookings/new/${indent.id}`,
      })),
      ...trips.map((trip) => ({
        id: trip.id,
        status: trip.status,
        originCity: trip.laneDetails.origin.city,
        destinationCity: trip.laneDetails.destination.city,
        pickup: pickupOfTrip(trip),
        lastUpdate: lastUpdateTime(trip),
        createdAt: trip.createdAt,
        detailsPath: detailPathForTrip(trip),
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indents, trips],
  )

  // ── Search + date filtering ──
  const q = search.trim().toLowerCase()
  const matches = (...vals: (string | undefined | null)[]) =>
    !q || vals.some((v) => (v ?? '').toLowerCase().includes(q))
  // Date filter applies to every tab EXCEPT Pending Allocation.
  const dateOk = (createdAt: string | undefined, applyDate: boolean) => {
    if (!applyDate) return true
    const d = (createdAt ?? '').slice(0, 10)
    return (!fromDate || d >= fromDate) && (!toDate || d <= toDate)
  }
  const pageSlice = <T,>(rows: T[]): T[] => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const fAll = allRows.filter((r) => matches(r.id, r.originCity, r.destinationCity, r.status) && dateOk(r.createdAt, true))
  const fPending = pendingAllocation.filter((i) =>
    matches(i.id, i.laneDetails.origin.city, i.laneDetails.destination.city, i.status),
  )
  const fAssignment = assignmentBookings.filter(
    (t) =>
      matches(t.id, t.laneDetails.origin.city, t.laneDetails.destination.city, t.status, t.assignedVehicle.registrationNumber, t.assignedDriver.name) &&
      dateOk(t.createdAt, true),
  )
  const fInTransit = inTransitBookings.filter(
    (t) =>
      matches(t.id, t.laneDetails.origin.city, t.laneDetails.destination.city, t.status, t.assignedVehicle.registrationNumber, t.assignedDriver.name) &&
      dateOk(t.createdAt, true),
  )
  const fPendingPod = pendingPodBookings.filter(
    (t) => matches(t.id, t.laneDetails.origin.city, t.laneDetails.destination.city, t.status) && dateOk(t.createdAt, true),
  )
  const fCompleted = completedBookings.filter(
    (t) => matches(t.id, t.laneDetails.origin.city, t.laneDetails.destination.city, t.status) && dateOk(t.createdAt, true),
  )
  const fException = exceptionBookings.filter(
    (t) => matches(t.id, t.laneDetails.origin.city, t.laneDetails.destination.city, t.status) && dateOk(t.createdAt, true),
  )
  const fCancelled = cancelledBookings.filter(
    (b) => matches(b.id, b.originCity, b.destinationCity, b.stage, b.reason) && dateOk(b.createdAt, true),
  )
  const fRejected = rejectedBookings.filter(
    (b) => matches(b.id, b.originCity, b.destinationCity, b.stage, b.reason) && dateOk(b.createdAt, true),
  )
  // Invoiced bookings — any trip referenced by an invoice.
  const invoicedBookings = trips.filter((trip) => invoiceByTripId.has(trip.id))
  const fInvoiced = invoicedBookings.filter(
    (t) => matches(t.id, t.laneDetails.origin.city, t.laneDetails.destination.city, t.status, invoiceByTripId.get(t.id)) && dateOk(t.createdAt, true),
  )

  const tabs: { key: BookingsTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: fAll.length },
    { key: 'pending-allocation', label: 'Pending Allocation', count: fPending.length },
    { key: 'assignment', label: 'Assignment', count: fAssignment.length },
    { key: 'in-transit', label: 'In Transit', count: fInTransit.length },
    { key: 'pending-pod', label: 'Pending POD', count: fPendingPod.length },
    { key: 'completed', label: 'Completed', count: fCompleted.length },
    { key: 'invoiced', label: 'Invoiced', count: fInvoiced.length },
    { key: 'exception', label: 'Exception', count: fException.length },
    { key: 'cancelled', label: 'Cancelled', count: fCancelled.length },
    { key: 'rejected', label: 'Rejected', count: fRejected.length },
  ]

  return (
    <div>
      <HeroCard
        eyebrow="BOOKINGS"
        title="Bookings"
        subtitle="Manage booking requests, active bookings, delivery confirmation, and exceptions"
        icon={<Truck className="h-5 w-5 text-primary" />}
      />

      {/* Search + date filter (date applies to every tab except Pending Allocation). */}
      <div className="mt-6">
        <PageFilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search bookings by ID, source, destination, status…"
          fromDate={fromDate}
          toDate={toDate}
          onFromDate={setFromDate}
          onToDate={setToDate}
          onClear={() => { setSearch(''); setFromDate(''); setToDate('') }}
        />
      </div>

      <div className="mt-4 mb-6 flex items-center justify-between gap-4">
        <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
          {tabs.map((tab) => (
            <BookingCard
              key={tab.key}
              title={tab.label}
              count={tab.count}
              active={activeTab === tab.key}
              onClick={() => navigate(`/vendor/bookings?tab=${tab.key}`)}
            />
          ))}
        </div>
      </div>

      {activeTab === 'all' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {fAll.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Package className="h-12 w-12" />} title="No bookings" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold">Booking</th>
                      <th className="px-5 py-3 font-bold">Customer</th>
                      <th className="px-5 py-3 font-bold">Source</th>
                      <th className="px-5 py-3 font-bold">Destination</th>
                      <th className="px-5 py-3 font-bold">Pickup Date &amp; Time</th>
                      <th className="px-5 py-3 font-bold">Last Update</th>
                      <th className="px-5 py-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pageSlice(fAll).map((row) => (
                      <tr key={row.id} className={rowClass(row.id)}>
                        <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
                        <td className="px-5 py-4"><div className="font-mono text-sm font-semibold">{row.id}</div></td>
                        <td className="px-5 py-4 text-sm text-text">{customerFor(row.id)}</td>
                        <td className="px-5 py-4 text-sm text-text">{row.originCity}</td>
                        <td className="px-5 py-4 text-sm text-text">{row.destinationCity}</td>
                        <td className="px-5 py-4 text-sm text-text">{row.pickup ? formatDateTime(row.pickup) : '—'}</td>
                        <td className="px-5 py-4 text-sm text-text">{formatDateTime(row.lastUpdate)}</td>
                        <td className="px-5 py-4 text-right">
                          <Button size="sm" variant="outline" onClick={() => navigate(row.detailsPath)}>View Details</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager total={fAll.length} page={page} setPage={setPage} />
            </>
          )}
        </div>
      )}

      {activeTab === 'pending-allocation' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {fPending.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Package className="h-12 w-12" />} title="No bookings pending allocation" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold">Booking</th>
                      <th className="px-5 py-3 font-bold">Customer</th>
                      <th className="px-5 py-3 font-bold">Source</th>
                      <th className="px-5 py-3 font-bold">Destination</th>
                      <th className="px-5 py-3 font-bold">Pickup Date &amp; Time</th>
                      <th className="px-5 py-3 font-bold">Received</th>
                      <th className="px-5 py-3 font-bold">SLA</th>
                      <th className="px-5 py-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pageSlice(fPending).map((indent) => (
                      <tr key={indent.id} className={rowClass(indent.id)}>
                        <td className="px-5 py-4"><StatusBadge status={indent.status} label="Pending Allocation" /></td>
                        <td className="px-5 py-4"><div className="font-mono text-sm font-semibold">{indent.id}</div></td>
                        <td className="px-5 py-4 text-sm text-text">{customerFor(indent.id)}</td>
                        <td className="px-5 py-4 text-sm text-text">{indent.laneDetails.origin.city}</td>
                        <td className="px-5 py-4 text-sm text-text">{indent.laneDetails.destination.city}</td>
                        <td className="px-5 py-4 text-sm text-text">{formatDateTime(indent.reportingDateTime)}</td>
                        <td className="px-5 py-4 text-sm text-text">{formatDateTime(indent.createdAt)}</td>
                        <td className="px-5 py-4"><SLACountdown deadline={indent.slaDeadline} /></td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button size="sm" variant="success" onClick={() => { acceptIndent(indent.id); navigate('/vendor/bookings?tab=assignment') }}>
                              <CheckCircle className="mr-1 h-3.5 w-3.5" /> Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDeclineConfirmId(indent.id)}>
                              <XCircle className="mr-1 h-3.5 w-3.5" /> Decline
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/new/${indent.id}`)}>View Details</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager total={fPending.length} page={page} setPage={setPage} />
            </>
          )}
        </div>
      )}

      {activeTab === 'assignment' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {fAssignment.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Truck className="h-12 w-12" />} title="No bookings in assignment" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1300px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold">Booking</th>
                      <th className="px-5 py-3 font-bold">Customer</th>
                      <th className="px-5 py-3 font-bold">Source</th>
                      <th className="px-5 py-3 font-bold">Destination</th>
                      <th className="px-5 py-3 font-bold">Pickup Date &amp; Time</th>
                      <th className="px-5 py-3 font-bold">Last Update</th>
                      <th className="px-5 py-3 font-bold">Vehicle</th>
                      <th className="px-5 py-3 font-bold">Driver</th>
                      <th className="px-5 py-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pageSlice(fAssignment).map((booking) => (
                      <tr key={booking.id} className={rowClass(booking.id)}>
                        <td className="px-5 py-4"><StatusBadge status={booking.status} /></td>
                        <td className="px-5 py-4"><div className="font-mono text-sm font-semibold">{booking.id}</div></td>
                        <td className="px-5 py-4 text-sm text-text">{customerFor(booking.id, booking.indentId)}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.laneDetails.origin.city}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.laneDetails.destination.city}</td>
                        <td className="px-5 py-4 text-sm text-text">{(() => { const p = pickupOfTrip(booking); return p ? formatDateTime(p) : '—' })()}</td>
                        <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(booking))}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.assignedVehicle.registrationNumber}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.assignedDriver.name}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {booking.status === 'ACCEPTED' && (
                              <Button size="sm" variant="success" onClick={() => setAssignTripId(booking.id)}>
                                <Truck className="mr-1 h-3.5 w-3.5" /> Assign Vehicle &amp; Driver
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/assignment/${booking.id}`)}>View Details</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager total={fAssignment.length} page={page} setPage={setPage} />
            </>
          )}
        </div>
      )}

      {activeTab === 'in-transit' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {fInTransit.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Truck className="h-12 w-12" />} title="No bookings in transit" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1300px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold">Booking</th>
                      <th className="px-5 py-3 font-bold">Customer</th>
                      <th className="px-5 py-3 font-bold">Source</th>
                      <th className="px-5 py-3 font-bold">Destination</th>
                      <th className="px-5 py-3 font-bold">Last Update</th>
                      <th className="px-5 py-3 font-bold">Vehicle</th>
                      <th className="px-5 py-3 font-bold">Driver</th>
                      <th className="px-5 py-3 font-bold text-right">Advance</th>
                      <th className="px-5 py-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pageSlice(fInTransit).map((trip) => (
                      <tr key={trip.id} className={rowClass(trip.id)}>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            <StatusBadge status={trip.status} />
                            {trip.slaFlag && <StatusBadge status={trip.slaFlag} />}
                          </div>
                        </td>
                        <td className="px-5 py-4"><div className="font-mono text-sm font-semibold">{trip.id}</div></td>
                        <td className="px-5 py-4 text-sm text-text">{customerFor(trip.id, trip.indentId)}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.origin.city}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.destination.city}</td>
                        <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(trip))}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.assignedVehicle.registrationNumber}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.assignedDriver.name}</td>
                        <td className="px-5 py-4 text-right text-sm text-text"><CurrencyDisplay amount={trip.advance ?? 0} /></td>
                        <td className="px-5 py-4 text-right">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/in-transit/${trip.id}`)}>View Details</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager total={fInTransit.length} page={page} setPage={setPage} />
            </>
          )}
        </div>
      )}

      {activeTab === 'pending-pod' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {fPendingPod.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Package className="h-12 w-12" />} title="No pending POD bookings" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1150px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold">Booking</th>
                      <th className="px-5 py-3 font-bold">Customer</th>
                      <th className="px-5 py-3 font-bold">Source</th>
                      <th className="px-5 py-3 font-bold">Destination</th>
                      <th className="px-5 py-3 font-bold">Delivered</th>
                      <th className="px-5 py-3 font-bold">Last Update</th>
                      <th className="px-5 py-3 font-bold text-right">Advance</th>
                      <th className="px-5 py-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pageSlice(fPendingPod).map((trip) => (
                      <tr key={trip.id} className={rowClass(trip.id)}>
                        <td className="px-5 py-4"><StatusBadge status="POD_PENDING" /></td>
                        <td className="px-5 py-4"><div className="font-mono text-sm font-semibold">{trip.id}</div></td>
                        <td className="px-5 py-4 text-sm text-text">{customerFor(trip.id, trip.indentId)}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.origin.city}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.destination.city}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.deliveredDate ? formatDate(trip.deliveredDate) : '—'}</td>
                        <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(trip))}</td>
                        <td className="px-5 py-4 text-right text-sm text-text"><CurrencyDisplay amount={trip.advance ?? 0} /></td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-text hover:bg-gray-50">
                              <Upload className="h-3.5 w-3.5" /> Upload POD
                              <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) window.alert(`POD document "${file.name}" uploaded for ${trip.id}`)
                                e.target.value = ''
                              }} />
                            </label>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/pending-pod/${trip.id}`)}>View Details</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager total={fPendingPod.length} page={page} setPage={setPage} />
            </>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {fCompleted.length === 0 ? (
            <div className="p-8"><EmptyState icon={<CheckCircle className="h-12 w-12" />} title="No completed bookings" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold">Booking</th>
                      <th className="px-5 py-3 font-bold">Customer</th>
                      <th className="px-5 py-3 font-bold">Source</th>
                      <th className="px-5 py-3 font-bold">Destination</th>
                      <th className="px-5 py-3 font-bold">Delivered</th>
                      <th className="px-5 py-3 font-bold">Last Update</th>
                      <th className="px-5 py-3 font-bold">Freight</th>
                      <th className="px-5 py-3 font-bold text-right">Advance</th>
                      <th className="px-5 py-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pageSlice(fCompleted).map((trip) => (
                      <tr key={trip.id} className={rowClass(trip.id)}>
                        <td className="px-5 py-4"><StatusBadge status="COMPLETED" /></td>
                        <td className="px-5 py-4"><div className="font-mono text-sm font-semibold">{trip.id}</div></td>
                        <td className="px-5 py-4 text-sm text-text">{customerFor(trip.id, trip.indentId)}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.origin.city}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.destination.city}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.deliveredDate ? formatDate(trip.deliveredDate) : '—'}</td>
                        <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(trip))}</td>
                        <td className="px-5 py-4 text-sm text-text"><CurrencyDisplay amount={trip.freightRate} /></td>
                        <td className="px-5 py-4 text-right text-sm text-text"><CurrencyDisplay amount={trip.advance ?? 0} /></td>
                        <td className="px-5 py-4 text-right">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/completed/${trip.id}`)}>View Details</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager total={fCompleted.length} page={page} setPage={setPage} />
            </>
          )}
        </div>
      )}

      {activeTab === 'invoiced' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {fInvoiced.length === 0 ? (
            <div className="p-8"><EmptyState icon={<CheckCircle className="h-12 w-12" />} title="No invoiced bookings" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold">Booking</th>
                      <th className="px-5 py-3 font-bold">Customer</th>
                      <th className="px-5 py-3 font-bold">Source</th>
                      <th className="px-5 py-3 font-bold">Destination</th>
                      <th className="px-5 py-3 font-bold">Invoice ID</th>
                      <th className="px-5 py-3 font-bold">Freight</th>
                      <th className="px-5 py-3 font-bold">Last Update</th>
                      <th className="px-5 py-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pageSlice(fInvoiced).map((trip) => (
                      <tr key={trip.id} className={rowClass(trip.id)}>
                        <td className="px-5 py-4"><StatusBadge status={trip.status} /></td>
                        <td className="px-5 py-4"><div className="font-mono text-sm font-semibold">{trip.id}</div></td>
                        <td className="px-5 py-4 text-sm text-text">{customerFor(trip.id, trip.indentId)}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.origin.city}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.destination.city}</td>
                        <td className="px-5 py-4 font-mono text-sm font-semibold text-primary">{invoiceByTripId.get(trip.id) ?? '—'}</td>
                        <td className="px-5 py-4 text-sm text-text"><CurrencyDisplay amount={trip.freightRate} /></td>
                        <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(trip))}</td>
                        <td className="px-5 py-4 text-right">
                          <Button size="sm" variant="outline" onClick={() => navigate(detailPathForTrip(trip))}>View Details</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager total={fInvoiced.length} page={page} setPage={setPage} />
            </>
          )}
        </div>
      )}

      {activeTab === 'exception' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {fException.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Route className="h-12 w-12" />} title="No exception bookings" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold">Booking</th>
                      <th className="px-5 py-3 font-bold">Customer</th>
                      <th className="px-5 py-3 font-bold">Source</th>
                      <th className="px-5 py-3 font-bold">Destination</th>
                      <th className="px-5 py-3 font-bold">Issue</th>
                      <th className="px-5 py-3 font-bold">Last Update</th>
                      <th className="px-5 py-3 font-bold">Vehicle / Driver</th>
                      <th className="px-5 py-3 font-bold text-right">Advance</th>
                      <th className="px-5 py-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pageSlice(fException).map((trip) => (
                      <tr key={trip.id} className={rowClass(trip.id)}>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            <StatusBadge status={trip.status} />
                            <StatusBadge status="EXCEPTION" />
                            {trip.slaFlag && <StatusBadge status={trip.slaFlag} />}
                          </div>
                        </td>
                        <td className="px-5 py-4"><div className="font-mono text-sm font-semibold">{trip.id}</div></td>
                        <td className="px-5 py-4 text-sm text-text">{customerFor(trip.id, trip.indentId)}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.origin.city}</td>
                        <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.destination.city}</td>
                        <td className="px-5 py-4">
                          {trip.disruption ? (
                            <div className="space-y-1">
                              <StatusBadge status={trip.disruption.reason} label={REASON_LABEL[trip.disruption.reason] ?? trip.disruption.reason} />
                              {trip.disruption.notes && <p className="text-xs text-gray-500">{trip.disruption.notes}</p>}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(trip))}</td>
                        <td className="px-5 py-4 text-sm text-text">
                          <div>{trip.assignedVehicle.registrationNumber}</div>
                          <div className="text-xs text-gray-500">{trip.assignedDriver.name}</div>
                        </td>
                        <td className="px-5 py-4 text-right text-sm text-text"><CurrencyDisplay amount={trip.advance ?? 0} /></td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => setReassignTripId(trip.id)}>
                              <Wrench className="mr-1 h-3.5 w-3.5" /> Change Assignment
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/exception/${trip.id}`)}>View Details</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager total={fException.length} page={page} setPage={setPage} />
            </>
          )}
        </div>
      )}

      {activeTab === 'cancelled' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {fCancelled.length === 0 ? (
            <div className="p-8"><EmptyState icon={<XCircle className="h-12 w-12" />} title="No cancelled bookings" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold">Booking</th>
                      <th className="px-5 py-3 font-bold">Customer</th>
                      <th className="px-5 py-3 font-bold">Source</th>
                      <th className="px-5 py-3 font-bold">Destination</th>
                      <th className="px-5 py-3 font-bold">Last Update</th>
                      <th className="px-5 py-3 font-bold">Stage</th>
                      <th className="px-5 py-3 font-bold">Cancelled By</th>
                      <th className="px-5 py-3 font-bold">Reason</th>
                      <th className="px-5 py-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pageSlice(fCancelled).map((booking) => (
                      <tr key={booking.id} className={rowClass(booking.id)}>
                        <td className="px-5 py-4"><StatusBadge status="CANCELLED" /></td>
                        <td className="px-5 py-4"><div className="font-mono text-sm font-semibold">{booking.id}</div></td>
                        <td className="px-5 py-4 text-sm text-text">{customerFor(booking.id)}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.originCity}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.destinationCity}</td>
                        <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(booking))}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.stage}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.cancelledBy}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.reason}</td>
                        <td className="px-5 py-4 text-right">
                          <Button size="sm" variant="outline" onClick={() => navigate(booking.detailsPath)}>View Details</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager total={fCancelled.length} page={page} setPage={setPage} />
            </>
          )}
        </div>
      )}

      {activeTab === 'rejected' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {fRejected.length === 0 ? (
            <div className="p-8"><EmptyState icon={<XCircle className="h-12 w-12" />} title="No rejected bookings" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold">Booking</th>
                      <th className="px-5 py-3 font-bold">Customer</th>
                      <th className="px-5 py-3 font-bold">Source</th>
                      <th className="px-5 py-3 font-bold">Destination</th>
                      <th className="px-5 py-3 font-bold">Last Update</th>
                      <th className="px-5 py-3 font-bold">Stage</th>
                      <th className="px-5 py-3 font-bold">Rejected By</th>
                      <th className="px-5 py-3 font-bold">Reason</th>
                      <th className="px-5 py-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pageSlice(fRejected).map((booking) => (
                      <tr key={booking.id} className={rowClass(booking.id)}>
                        <td className="px-5 py-4"><StatusBadge status="REJECTED" /></td>
                        <td className="px-5 py-4"><div className="font-mono text-sm font-semibold">{booking.id}</div></td>
                        <td className="px-5 py-4 text-sm text-text">{customerFor(booking.id)}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.originCity}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.destinationCity}</td>
                        <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(booking))}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.stage}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.rejectedBy}</td>
                        <td className="px-5 py-4 text-sm text-text">{booking.reason}</td>
                        <td className="px-5 py-4 text-right">
                          <Button size="sm" variant="outline" onClick={() => navigate(booking.detailsPath)}>View Details</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager total={fRejected.length} page={page} setPage={setPage} />
            </>
          )}
        </div>
      )}

      {assignTripId && (
        <AssignVehicleModal
          isOpen={!!assignTripId}
          onClose={() => setAssignTripId(null)}
          tripId={assignTripId}
        />
      )}

      <ChangeAssignmentModal
        isOpen={reassignTripId !== null}
        onClose={() => setReassignTripId(null)}
        tripId={reassignTripId}
      />

      <ConfirmDialog
        isOpen={!!declineConfirmId}
        onClose={() => setDeclineConfirmId(null)}
        onConfirm={() => {
          if (declineConfirmId) declineIndent(declineConfirmId)
          setDeclineConfirmId(null)
          navigate('/vendor/bookings?tab=rejected')
        }}
        title="Decline booking?"
        description="This will mark the booking as rejected in the mock data."
        confirmLabel="Decline Booking"
        variant="destructive"
      />
    </div>
  )
}
