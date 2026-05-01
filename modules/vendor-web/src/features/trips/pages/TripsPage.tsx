import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Card, CardContent } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate, formatDateTime } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { Truck, ArrowRight, MapPin, Package, User, CheckCircle, XCircle } from 'lucide-react'
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

      <div className="mb-6 flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
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
        <div className="space-y-4">
          {pendingIndents.length === 0 ? (
            <EmptyState icon={<Package className="h-12 w-12" />} title="No pending indents" />
          ) : (
            pendingIndents.map((indent) => (
              <Card key={indent.id} className="border-l-4 border-l-warning cursor-pointer hover:border-primary/40" onClick={() => navigate(`/vendor/trips/indents/${indent.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold">{indent.id}</span>
                        <StatusBadge status={indent.status} />
                        <span className="text-xs text-muted-foreground">Contract: {indent.contractReference}</span>
                      </div>
                    </div>
                    <SLACountdown deadline={indent.slaDeadline} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {indent.laneDetails.origin.city} → {indent.laneDetails.destination.city}
                    </div>
                    <div><span className="text-muted-foreground">Load: </span>{indent.loadDetails.commodity}, {indent.loadDetails.weightKg / 1000}T</div>
                    <div><span className="text-muted-foreground">Vehicle: </span>{indent.vehicleTypeRequired}</div>
                    <div><span className="text-muted-foreground">Report by: </span>{formatDateTime(indent.reportingDateTime)}</div>
                  </div>
                  <div className="flex gap-3">
                    <Button size="sm" variant="success" onClick={(e) => { e.stopPropagation(); setSelectedIndentId(indent.id) }}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept & Assign
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDeclineConfirmId(indent.id) }}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                    </Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/vendor/trips/indents/${indent.id}`) }}>
                      View details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
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
        <div className="space-y-4">
          {activeTrips.length === 0 ? (
            <EmptyState icon={<Truck className="h-12 w-12" />} title="No active trips" />
          ) : (
            activeTrips.map((trip) => (
              <Card key={trip.id} className="cursor-pointer hover:border-primary/30" onClick={() => navigate(`/vendor/trips/active/${trip.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{trip.id}</span>
                      <StatusBadge status={trip.status} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}</div>
                    <div className="flex items-center gap-2"><Truck className="h-3.5 w-3.5 text-muted-foreground" />{trip.assignedVehicle.registrationNumber}</div>
                    <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" />{trip.assignedDriver.name}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Completed Trips */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {completedTrips.length === 0 ? (
            <EmptyState icon={<CheckCircle className="h-12 w-12" />} title="No completed trips" />
          ) : (
            completedTrips.map((trip) => (
              <Card key={trip.id} className="cursor-pointer hover:border-primary/30" onClick={() => navigate(`/vendor/trips/completed/${trip.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{trip.id}</span>
                      <StatusBadge status="DELIVERED" />
                      {trip.podStatus === 'CONFIRMED' && <StatusBadge status="CONFIRMED" label="POD ✓" />}
                      {trip.isInvoiced ? <StatusBadge status="INVOICED" /> : <StatusBadge status="PENDING" label="Uninvoiced" />}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{trip.laneDetails.origin.city} → {trip.laneDetails.destination.city}</div>
                    <div><span className="text-muted-foreground">Delivered: </span>{trip.deliveredDate ? formatDate(trip.deliveredDate) : '—'}</div>
                    <div><span className="text-muted-foreground">Freight: </span><CurrencyDisplay amount={trip.freightRate} /></div>
                    <div><span className="text-muted-foreground">Expenses: </span><CurrencyDisplay amount={trip.expenseSummary.approved} /></div>
                  </div>
                  {!trip.isInvoiced && trip.podStatus === 'CONFIRMED' && (
                    <div className="mt-3 pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedTripForExpense(trip.id) }}>
                        Add Expenses
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Penalties */}
      {activeTab === 'penalties' && (
        <div className="space-y-4">
          {declinedIndents.length === 0 ? (
            <EmptyState icon={<XCircle className="h-12 w-12" />} title="No Declined Trips or Penalties" description="You have no declined bookings or SLA penalties." />
          ) : (
            declinedIndents.map((indent) => (
              <Card key={indent.id} className="border-l-4 border-l-destructive">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold">{indent.id}</span>
                        <StatusBadge status="DECLINED" />
                        <span className="text-xs text-muted-foreground">Contract: {indent.contractReference}</span>
                      </div>
                      <p className="text-sm font-medium text-destructive mt-1">Declined Booking Penalty</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-destructive">
                        <CurrencyDisplay amount={5000} />
                      </div>
                      <span className="text-xs text-muted-foreground">Will be deducted from next invoice</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {indent.laneDetails.origin.city} → {indent.laneDetails.destination.city}
                    </div>
                    <div><span className="text-muted-foreground">Load: </span>{indent.loadDetails.commodity}</div>
                    <div><span className="text-muted-foreground">Vehicle: </span>{indent.vehicleTypeRequired}</div>
                    <div><span className="text-muted-foreground">Reported by: </span>{formatDateTime(indent.reportingDateTime)}</div>
                  </div>
                </CardContent>
              </Card>
            ))
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
