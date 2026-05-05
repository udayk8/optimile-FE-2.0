import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate, formatDateTime } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { Truck, MapPin, Package, User, CheckCircle, XCircle, Route } from 'lucide-react'
import { AssignVehicleModal } from '@vendor/components/shared/AssignVehicleModal'
import { ConfirmDialog } from '@vendor/components/shared/ConfirmDialog'

type BookingsTab = 'new' | 'accepted' | 'active' | 'pending-pod' | 'completed' | 'cancelled' | 'disrupted'

const BOOKING_TABS: BookingsTab[] = ['new', 'accepted', 'active', 'pending-pod', 'completed', 'cancelled', 'disrupted']

function getBookingsTab(pathname: string, search: string): BookingsTab {
  const pathTab = pathname.split('/')[2]
  if (BOOKING_TABS.includes(pathTab as BookingsTab)) return pathTab as BookingsTab

  const searchTab = new URLSearchParams(search).get('tab')
  return BOOKING_TABS.includes(searchTab as BookingsTab) ? (searchTab as BookingsTab) : 'new'
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

  const { indents, trips, declineIndent } = useAppStore()
  const [selectedIndentId, setSelectedIndentId] = useState<string | null>(null)
  const [declineConfirmId, setDeclineConfirmId] = useState<string | null>(null)

  const newBookings = indents.filter((indent) => indent.status === 'PENDING')
  const acceptedBookings = indents.filter((indent) => indent.status === 'ACCEPTED')
  const activeBookings = trips.filter((trip) => ['DISPATCHED', 'IN_TRANSIT', 'AT_DELIVERY'].includes(trip.status))
  const pendingPodBookings = trips.filter((trip) => trip.status === 'DELIVERED' && trip.podStatus === 'PENDING')
  const completedBookings = trips.filter((trip) => trip.status === 'DELIVERED' && trip.podStatus === 'CONFIRMED')
  const cancelledBookings = indents.filter((indent) => indent.status === 'DECLINED')
  const disruptedBookings = trips.filter((trip) => trip.status === 'EXCEPTION' || trip.status === 'DISRUPTED')

  const tabs: { key: BookingsTab; label: string; count: number }[] = [
    { key: 'new', label: 'New Trips', count: newBookings.length },
    { key: 'accepted', label: 'Accepted', count: acceptedBookings.length },
    { key: 'active', label: 'Active', count: activeBookings.length },
    { key: 'pending-pod', label: 'Pending POD', count: pendingPodBookings.length },
    { key: 'completed', label: 'Completed', count: completedBookings.length },
    { key: 'cancelled', label: 'Cancelled', count: cancelledBookings.length },
    { key: 'disrupted', label: 'Disrupted', count: disruptedBookings.length },
  ]

  return (
    <div>
      <HeroCard
        eyebrow="BOOKINGS"
        title="Bookings"
        subtitle="Manage booking requests, active bookings, delivery confirmation, and exceptions"
        icon={<Truck className="h-5 w-5 text-primary" />}
      />

      <div className="mt-6 mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
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

      {activeTab === 'new' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {newBookings.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Package className="h-12 w-12" />} title="No new trips" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Load</th>
                    <th className="px-5 py-3 font-bold">SLA</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {newBookings.map((indent) => (
                    <tr key={indent.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{indent.id}</div>
                        <StatusBadge status={indent.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-text">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {indent.laneDetails.origin.city} → {indent.laneDetails.destination.city}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">{formatDateTime(indent.reportingDateTime)}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{indent.loadDetails.commodity}, {indent.loadDetails.weightKg / 1000}T</td>
                      <td className="px-5 py-4"><SLACountdown deadline={indent.slaDeadline} /></td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button size="sm" variant="success" onClick={() => setSelectedIndentId(indent.id)}>
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

      {activeTab === 'accepted' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {acceptedBookings.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Truck className="h-12 w-12" />} title="No accepted bookings" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Vehicle</th>
                    <th className="px-5 py-3 font-bold">Driver</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {acceptedBookings.map((indent) => (
                    <tr key={indent.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{indent.id}</div>
                        <StatusBadge status={indent.status} />
                      </td>
                      <td className="px-5 py-4 text-sm text-text">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {indent.laneDetails.origin.city} → {indent.laneDetails.destination.city}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{indent.assignedVehicleId ?? 'Not assigned'}</td>
                      <td className="px-5 py-4 text-sm text-text">{indent.assignedDriverId ?? 'Not assigned'}</td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/accepted/${indent.id}`)}>
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

      {activeTab === 'active' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {activeBookings.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Truck className="h-12 w-12" />} title="No active bookings" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Vehicle</th>
                    <th className="px-5 py-3 font-bold">Driver</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeBookings.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{trip.id}</div>
                        <StatusBadge status={trip.status} />
                      </td>
                      <td className="px-5 py-4 text-sm text-text">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{trip.assignedVehicle.registrationNumber}</td>
                      <td className="px-5 py-4 text-sm text-text">{trip.assignedDriver.name}</td>
                      <td className="px-5 py-4">
                        {trip.podStatus === 'CONFIRMED' ? <StatusBadge status="CONFIRMED" label="POD ✓" /> : <StatusBadge status={trip.status} />}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/active/${trip.id}`)}>
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
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Delivered</th>
                    <th className="px-5 py-3 font-bold">Expenses</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingPodBookings.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{trip.id}</div>
                        <StatusBadge status="PENDING" label="Pending POD" />
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}</td>
                      <td className="px-5 py-4 text-sm text-text">{trip.deliveredDate ? formatDate(trip.deliveredDate) : '—'}</td>
                      <td className="px-5 py-4 text-sm text-text"><CurrencyDisplay amount={trip.expenseSummary.pending} /></td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/pending-pod/${trip.id}`)}>
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

      {activeTab === 'completed' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {completedBookings.length === 0 ? (
            <div className="p-8"><EmptyState icon={<CheckCircle className="h-12 w-12" />} title="No completed bookings" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Delivered</th>
                    <th className="px-5 py-3 font-bold">Freight</th>
                    <th className="px-5 py-3 font-bold">Approved Expenses</th>
                    <th className="px-5 py-3 font-bold">Invoice</th>
                    <th className="px-5 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {completedBookings.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{trip.id}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <StatusBadge status="DELIVERED" />
                          <StatusBadge status="CONFIRMED" label="POD ✓" />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}</td>
                      <td className="px-5 py-4 text-sm text-text">{trip.deliveredDate ? formatDate(trip.deliveredDate) : '—'}</td>
                      <td className="px-5 py-4 text-sm text-text"><CurrencyDisplay amount={trip.freightRate} /></td>
                      <td className="px-5 py-4 text-sm text-text"><CurrencyDisplay amount={trip.expenseSummary.approved} /></td>
                      <td className="px-5 py-4">
                        {trip.isInvoiced ? <StatusBadge status="INVOICED" /> : <StatusBadge status="PENDING" label="Uninvoiced" />}
                      </td>
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
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Reason</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cancelledBookings.map((indent) => (
                    <tr key={indent.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{indent.id}</div>
                        <StatusBadge status="CANCELLED" />
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{indent.laneDetails.origin.city} → {indent.laneDetails.destination.city}</td>
                      <td className="px-5 py-4 text-sm text-text">{indent.rejectionReason ?? 'Cancelled before dispatch'}</td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/cancelled/${indent.id}`)}>
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

      {activeTab === 'disrupted' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {disruptedBookings.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Route className="h-12 w-12" />} title="No disrupted bookings" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Booking</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Issue</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {disruptedBookings.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{trip.id}</div>
                        <StatusBadge status="EXCEPTION" label="Disrupted" />
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}</td>
                      <td className="px-5 py-4 text-sm text-text">{trip.timeline?.[0]?.description ?? 'Route disruption reported'}</td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/bookings/disrupted/${trip.id}`)}>
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

      {selectedIndentId && (
        <AssignVehicleModal
          isOpen={!!selectedIndentId}
          onClose={() => setSelectedIndentId(null)}
          indentId={selectedIndentId}
        />
      )}

      <ConfirmDialog
        isOpen={!!declineConfirmId}
        onClose={() => setDeclineConfirmId(null)}
        onConfirm={() => {
          if (declineConfirmId) declineIndent(declineConfirmId)
          setDeclineConfirmId(null)
          navigate('/vendor/bookings?tab=cancelled')
        }}
        title="Decline booking?"
        description="This will mark the booking as cancelled in the mock data."
        confirmLabel="Decline Booking"
        variant="destructive"
      />
    </div>
  )
}
