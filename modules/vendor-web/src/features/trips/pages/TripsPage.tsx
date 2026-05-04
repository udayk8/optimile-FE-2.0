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
import { Truck, MapPin, Package, User, CheckCircle, XCircle } from 'lucide-react'
import { AssignVehicleModal } from '@vendor/components/shared/AssignVehicleModal'
import { AddExpenseModal } from '@vendor/components/shared/AddExpenseModal'
import { ConfirmDialog } from '@vendor/components/shared/ConfirmDialog'

type TripsTab = 'indents' | 'active' | 'completed' | 'penalties'

const TRIPS_TABS: TripsTab[] = ['indents', 'active', 'completed', 'penalties']

function getTripsTab(pathname: string, search: string): TripsTab {
  const pathTab = pathname.split('/')[2]
  if (TRIPS_TABS.includes(pathTab as TripsTab)) return pathTab as TripsTab

  const searchTab = new URLSearchParams(search).get('tab')
  return TRIPS_TABS.includes(searchTab as TripsTab) ? (searchTab as TripsTab) : 'indents'
}

export default function TripsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = getTripsTab(location.pathname, location.search)
  
  const { indents, trips, declineIndent } = useAppStore()
  
  const [selectedIndentId, setSelectedIndentId] = useState<string | null>(null)
  const [selectedTripForExpense, setSelectedTripForExpense] = useState<string | null>(null)
  const [declineConfirmId, setDeclineConfirmId] = useState<string | null>(null)

  const pendingIndents = indents.filter((i) => i.status === 'PENDING')
  const activeTrips = trips.filter((t) => t.status !== 'DELIVERED')
  const completedTrips = trips.filter((t) => t.status === 'DELIVERED')
  const declinedIndents = indents.filter((i) => i.status === 'DECLINED')

  const tabs: { key: TripsTab; label: string; count: number }[] = [
    { key: 'indents', label: 'Indent Requests', count: pendingIndents.length },
    { key: 'active', label: 'Active Trips', count: activeTrips.length },
    { key: 'completed', label: 'Completed', count: completedTrips.length },
    { key: 'penalties', label: 'Declined & Penalties', count: declinedIndents.length },
  ]

  return (
    <div>
      <HeroCard 
        eyebrow="TRIPS & INDENTS"
        title="Trips" 
        subtitle="Manage your operational indents, active trips, and completed journeys"
        icon={<Truck className="h-5 w-5 text-primary" />}
      />

      <div className="mt-6 mb-6 flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => navigate(`/vendor/trips?tab=${tab.key}`)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-white text-text shadow-sm' : 'text-gray-600 hover:text-primary'}`}>
            {tab.label}
            <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Indent Requests */}
      {activeTab === 'indents' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {pendingIndents.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Package className="h-12 w-12" />} title="No pending indents" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Indent</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Load</th>
                    <th className="px-5 py-3 font-bold">Vehicle</th>
                    <th className="px-5 py-3 font-bold">Contract</th>
                    <th className="px-5 py-3 font-bold">SLA</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingIndents.map((indent) => (
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
                      <td className="px-5 py-4 text-sm text-text">{indent.vehicleTypeRequired}</td>
                      <td className="px-5 py-4 text-sm text-text">{indent.contractReference}</td>
                      <td className="px-5 py-4">
                        <SLACountdown deadline={indent.slaDeadline} />
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Button size="sm" variant="success" onClick={() => setSelectedIndentId(indent.id)}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeclineConfirmId(indent.id)}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
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

      {selectedIndentId && (
        <AssignVehicleModal 
          isOpen={!!selectedIndentId} 
          onClose={() => setSelectedIndentId(null)} 
          indentId={selectedIndentId} 
        />
      )}

      {/* Active Trips */}
      {activeTab === 'active' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {activeTrips.length === 0 ? (
            <div className="p-8"><EmptyState icon={<Truck className="h-12 w-12" />} title="No active trips" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Trip</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Vehicle</th>
                    <th className="px-5 py-3 font-bold">Driver</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-mono text-sm font-semibold">{trip.id}</td>
                      <td className="px-5 py-4 text-sm text-text">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{trip.assignedVehicle.registrationNumber}</td>
                      <td className="px-5 py-4 text-sm text-text">{trip.assignedDriver.name}</td>
                      <td className="px-5 py-4"><StatusBadge status={trip.status} /></td>
                      <td className="px-5 py-4 text-right align-middle">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/trips/active/${trip.id}`)}>
                          Open
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

      {/* Completed Trips */}
      {activeTab === 'completed' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {completedTrips.length === 0 ? (
            <div className="p-8"><EmptyState icon={<CheckCircle className="h-12 w-12" />} title="No completed trips" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Trip</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Delivered</th>
                    <th className="px-5 py-3 font-bold">Freight</th>
                    <th className="px-5 py-3 font-bold">Expenses</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {completedTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{trip.id}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <StatusBadge status="DELIVERED" />
                          {trip.podStatus === 'CONFIRMED' && <StatusBadge status="CONFIRMED" label="POD ✓" />}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{trip.deliveredDate ? formatDate(trip.deliveredDate) : '—'}</td>
                      <td className="px-5 py-4 text-sm text-text"><CurrencyDisplay amount={trip.freightRate} /></td>
                      <td className="px-5 py-4 text-sm text-text"><CurrencyDisplay amount={trip.expenseSummary.approved} /></td>
                      <td className="px-5 py-4">
                        {trip.isInvoiced ? <StatusBadge status="INVOICED" /> : <StatusBadge status="PENDING" label="Uninvoiced" />}
                      </td>
                      <td className="px-5 py-4 text-right align-middle">
                        {!trip.isInvoiced && trip.podStatus === 'CONFIRMED' ? (
                          <Button size="sm" variant="outline" onClick={() => setSelectedTripForExpense(trip.id)}>
                            Add Expenses
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/trips/completed/${trip.id}`)}>
                            Open
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Penalties */}
      {activeTab === 'penalties' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {declinedIndents.length === 0 ? (
            <div className="p-8"><EmptyState icon={<XCircle className="h-12 w-12" />} title="No Declined Trips or Penalties" description="You have no declined bookings or SLA penalties." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Indent</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Load</th>
                    <th className="px-5 py-3 font-bold">Vehicle</th>
                    <th className="px-5 py-3 font-bold">Penalty</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {declinedIndents.map((indent) => (
                    <tr key={indent.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold">{indent.id}</div>
                        <div className="mt-1 text-xs text-gray-500">{indent.contractReference}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {indent.laneDetails.origin.city} → {indent.laneDetails.destination.city}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">{formatDateTime(indent.reportingDateTime)}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{indent.loadDetails.commodity}</td>
                      <td className="px-5 py-4 text-sm text-text">{indent.vehicleTypeRequired}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-destructive"><CurrencyDisplay amount={5000} /></td>
                      <td className="px-5 py-4"><StatusBadge status="DECLINED" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      <AddExpenseModal
        isOpen={!!selectedTripForExpense}
        onClose={() => setSelectedTripForExpense(null)}
        initialTripId={selectedTripForExpense ?? undefined}
      />

      <ConfirmDialog
        isOpen={!!declineConfirmId}
        onClose={() => setDeclineConfirmId(null)}
        onConfirm={() => {
          if (declineConfirmId) declineIndent(declineConfirmId)
        }}
        title="Decline Indent?"
        description="Are you sure you want to decline this indent? A penalty of ₹5,000 will be applied and deducted from your next invoice."
        confirmLabel="Decline Indent"
        variant="destructive"
      />
    </div>
  )
}
