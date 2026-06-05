import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@vendor/hooks/useModuleRoute'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate, formatDateTime } from '@vendor/lib/date-utils'
import { useVendorBookings } from '@vendor/integration/useVendorBookings'
import { Truck, MapPin, Package, CheckCircle, XCircle, Route, Upload, Wrench } from 'lucide-react'
import { AssignVehicleModal } from '@vendor/components/shared/AssignVehicleModal'
import { ConfirmDialog } from '@vendor/components/shared/ConfirmDialog'
import { ChangeAssignmentModal } from '@vendor/features/trips/components/ChangeAssignmentModal'
import type { Trip } from '@vendor/types'

// Pickup time comes from the originating indent's reporting slot.
const pickupTime = (trip: { indentId: string }, indents: { id: string; reportingDateTime: string }[]) =>
  indents.find((indent) => indent.id === trip.indentId)?.reportingDateTime
// Most recent lifecycle event — falls back to creation time.
const lastUpdateTime = (trip: { createdAt: string; timeline?: { timestamp: string }[] }) =>
  trip.timeline?.length ? [...trip.timeline].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).at(-1)!.timestamp : trip.createdAt

type BookingsTab =
  | 'pending-allocation'
  | 'assignment'
  | 'in-transit'
  | 'pending-pod'
  | 'completed'
  | 'exception'
  | 'cancelled'
  | 'rejected'

const BOOKING_TABS: BookingsTab[] = [
  'pending-allocation',
  'assignment',
  'in-transit',
  'pending-pod',
  'completed',
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

export default function TripsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = getBookingsTab(location.pathname, location.search)

  const { indents, trips, declineIndent, acceptIndent, isBridgeRecord } = useVendorBookings()

  // Cross-module (bridge) bookings render on white; local mock demo rows on light gray.
  const rowClass = (id: string) =>
    isBridgeRecord(id) ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'
  const [assignTripId, setAssignTripId] = useState<string | null>(null)
  const [declineConfirmId, setDeclineConfirmId] = useState<string | null>(null)
  const [reassignTripId, setReassignTripId] = useState<string | null>(null)

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
    route: `${trip.laneDetails.origin.city} → ${trip.laneDetails.destination.city}`,
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
    route: `${indent.laneDetails.origin.city} → ${indent.laneDetails.destination.city}`,
    stage: 'Pending Transport Allocation',
    rejectedBy: 'Vendor',
    reason: indent.rejectionReason ?? 'Declined before allocation',
    detailsPath: `/vendor/bookings/rejected/${indent.id}`,
    createdAt: indent.createdAt,
  }))

  const tabs: { key: BookingsTab; label: string; count: number }[] = [
    { key: 'pending-allocation', label: 'Pending Allocation', count: pendingAllocation.length },
    { key: 'assignment', label: 'Assignment', count: assignmentBookings.length },
    { key: 'in-transit', label: 'In Transit', count: inTransitBookings.length },
    { key: 'pending-pod', label: 'Pending POD', count: pendingPodBookings.length },
    { key: 'completed', label: 'Completed', count: completedBookings.length },
    { key: 'exception', label: 'Exception', count: exceptionBookings.length },
    { key: 'cancelled', label: 'Cancelled', count: cancelledBookings.length },
    { key: 'rejected', label: 'Rejected', count: rejectedBookings.length },
  ]

  return (
    <div>
      <HeroCard
        eyebrow="BOOKINGS"
        title="Bookings"
        subtitle="Manage booking requests, active bookings, delivery confirmation, and exceptions"
        icon={<Truck className="h-5 w-5 text-primary" />}
      />

      <div className="mt-6 mb-6 flex items-center justify-between gap-4">
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

      {activeTab === 'pending-allocation' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {pendingAllocation.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Package className="h-12 w-12" />} title="No bookings pending allocation" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Load</th>
                    <th className="px-5 py-3 font-bold">Received</th>
                    <th className="px-5 py-3 font-bold">SLA</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingAllocation.map((indent) => (
                    <tr key={indent.id} className={rowClass(indent.id)}>
                      <td className="px-5 py-4"><StatusBadge status={indent.status} label="Pending Allocation" /></td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{indent.id}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-text">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {indent.laneDetails.origin.city} → {indent.laneDetails.destination.city}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">{formatDateTime(indent.reportingDateTime)}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{indent.loadDetails.commodity}, {indent.loadDetails.weightKg / 1000}T</td>
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
                          <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/new/${indent.id}`)}>
                            View Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'assignment' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {assignmentBookings.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Truck className="h-12 w-12" />} title="No bookings in assignment" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1300px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Pickup</th>
                    <th className="px-5 py-3 font-bold">Last Update</th>
                    <th className="px-5 py-3 font-bold">Vehicle</th>
                    <th className="px-5 py-3 font-bold">Driver</th>
                    <th className="px-5 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {assignmentBookings.map((booking) => (
                    <tr key={booking.id} className={rowClass(booking.id)}>
                      <td className="px-5 py-4"><StatusBadge status={booking.status} /></td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{booking.id}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {booking.laneDetails.origin.city} → {booking.laneDetails.destination.city}
                        </div>
                      </td>
                      {(() => { const p = pickupTime(booking, indents); return (
                      <td className="px-5 py-4 text-sm text-text">{p ? formatDateTime(p) : '—'}</td>
                      ) })()}
                      <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(booking))}</td>
                      <td className="px-5 py-4 text-sm text-text">{booking.assignedVehicle.registrationNumber}</td>
                      <td className="px-5 py-4 text-sm text-text">{booking.assignedDriver.name}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {booking.status === 'ACCEPTED' && (
                            <Button size="sm" variant="success" onClick={() => setAssignTripId(booking.id)}>
                              <Truck className="mr-1 h-3.5 w-3.5" /> Assign Vehicle & Driver
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/assignment/${booking.id}`)}>
                            View Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'in-transit' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {inTransitBookings.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Truck className="h-12 w-12" />} title="No bookings in transit" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1300px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Pickup</th>
                    <th className="px-5 py-3 font-bold">Last Update</th>
                    <th className="px-5 py-3 font-bold">Vehicle</th>
                    <th className="px-5 py-3 font-bold">Driver</th>
                    <th className="px-5 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inTransitBookings.map((trip) => (
                    <tr key={trip.id} className={rowClass(trip.id)}>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge status={trip.status} />
                          {trip.slaFlag && <StatusBadge status={trip.slaFlag} />}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{trip.id}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}
                        </div>
                      </td>
                      {(() => { const p = pickupTime(trip, indents); return (
                      <td className="px-5 py-4 text-sm text-text">{p ? formatDateTime(p) : '—'}</td>
                      ) })()}
                      <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(trip))}</td>
                      <td className="px-5 py-4 text-sm text-text">{trip.assignedVehicle.registrationNumber}</td>
                      <td className="px-5 py-4 text-sm text-text">{trip.assignedDriver.name}</td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/in-transit/${trip.id}`)}>
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pending-pod' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {pendingPodBookings.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Package className="h-12 w-12" />} title="No pending POD bookings" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Delivered</th>
                    <th className="px-5 py-3 font-bold">Last Update</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingPodBookings.map((trip) => (
                    <tr key={trip.id} className={rowClass(trip.id)}>
                      <td className="px-5 py-4"><StatusBadge status="POD_PENDING" /></td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{trip.id}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}</td>
                      <td className="px-5 py-4 text-sm text-text">{trip.deliveredDate ? formatDate(trip.deliveredDate) : '—'}</td>
                      <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(trip))}</td>
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
                          <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/pending-pod/${trip.id}`)}>
                            View Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {completedBookings.length === 0 ? (
            <div className="p-8"><EmptyState icon={<CheckCircle className="h-12 w-12" />} title="No completed bookings" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Delivered</th>
                    <th className="px-5 py-3 font-bold">Last Update</th>
                    <th className="px-5 py-3 font-bold">Freight</th>
                    <th className="px-5 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {completedBookings.map((trip) => (
                    <tr key={trip.id} className={rowClass(trip.id)}>
                      <td className="px-5 py-4">
                        <StatusBadge status="COMPLETED" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{trip.id}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}</td>
                      <td className="px-5 py-4 text-sm text-text">{trip.deliveredDate ? formatDate(trip.deliveredDate) : '—'}</td>
                      <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(trip))}</td>
                      <td className="px-5 py-4 text-sm text-text"><CurrencyDisplay amount={trip.freightRate} /></td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/completed/${trip.id}`)}>
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'cancelled' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {cancelledBookings.length === 0 ? (
            <div className="p-8"><EmptyState icon={<XCircle className="h-12 w-12" />} title="No cancelled bookings" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Last Update</th>
                    <th className="px-5 py-3 font-bold">Stage</th>
                    <th className="px-5 py-3 font-bold">Cancelled By</th>
                    <th className="px-5 py-3 font-bold">Reason</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cancelledBookings.map((booking) => (
                    <tr key={booking.id} className={rowClass(booking.id)}>
                      <td className="px-5 py-4"><StatusBadge status="CANCELLED" /></td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{booking.id}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{booking.route}</td>
                      <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(booking))}</td>
                      <td className="px-5 py-4 text-sm text-text">{booking.stage}</td>
                      <td className="px-5 py-4 text-sm text-text">{booking.cancelledBy}</td>
                      <td className="px-5 py-4 text-sm text-text">{booking.reason}</td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(booking.detailsPath)}>
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rejected' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {rejectedBookings.length === 0 ? (
            <div className="p-8"><EmptyState icon={<XCircle className="h-12 w-12" />} title="No rejected bookings" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Last Update</th>
                    <th className="px-5 py-3 font-bold">Stage</th>
                    <th className="px-5 py-3 font-bold">Rejected By</th>
                    <th className="px-5 py-3 font-bold">Reason</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rejectedBookings.map((booking) => (
                    <tr key={booking.id} className={rowClass(booking.id)}>
                      <td className="px-5 py-4"><StatusBadge status="REJECTED" /></td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{booking.id}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{booking.route}</td>
                      <td className="px-5 py-4 text-sm text-text">{formatDateTime(lastUpdateTime(booking))}</td>
                      <td className="px-5 py-4 text-sm text-text">{booking.stage}</td>
                      <td className="px-5 py-4 text-sm text-text">{booking.rejectedBy}</td>
                      <td className="px-5 py-4 text-sm text-text">{booking.reason}</td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(booking.detailsPath)}>
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'exception' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {exceptionBookings.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Route className="h-12 w-12" />} title="No exception bookings" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Issue</th>
                    <th className="px-5 py-3 font-bold">Last Update</th>
                    <th className="px-5 py-3 font-bold">Vehicle / Driver</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {exceptionBookings.map((trip) => (
                    <tr key={trip.id} className={rowClass(trip.id)}>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge status={trip.status} />
                          <StatusBadge status="EXCEPTION" />
                          {trip.slaFlag && <StatusBadge status={trip.slaFlag} />}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{trip.id}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}</td>
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
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setReassignTripId(trip.id)}>
                            <Wrench className="mr-1 h-3.5 w-3.5" /> Change Assignment
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/exception/${trip.id}`)}>
                            View Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
