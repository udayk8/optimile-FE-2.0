import { useNavigate } from 'react-router-dom'
import { Clock, Package, CreditCard, Gavel, Truck, AlertTriangle, Home, Wallet, LifeBuoy, FilePlus } from 'lucide-react'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { PageHero } from '@shared-ui/page-hero'
import { KpiCard } from '@shared-ui/kpi-card'
import { Button } from '@vendor/components/ui/button'
import { useAppStore } from '@vendor/stores/app.store'

export default function DashboardPage() {
  const navigate = useNavigate()

  const indents = useAppStore(state => state.indents)
  const auctions = useAppStore(state => state.auctions)
  const trips = useAppStore(state => state.trips)
  const invoices = useAppStore(state => state.invoices)
  const vehicles = useAppStore(state => state.vehicles)
  const drivers = useAppStore(state => state.drivers)

  const pendingIndents = indents.filter(i => i.status === 'PENDING')
  const activeAuctions = auctions.filter(a => a.state === 'LIVE' || a.state === 'UPCOMING')

  const uninvoicedTrips = trips.filter(t => t.podStatus === 'CONFIRMED' && !t.isInvoiced && (t.freightRate > 0 || t.expenseSummary.approved > 0))
  const totalBillableAmount = uninvoicedTrips.reduce((sum, trip) => sum + (trip.freightRate || 0) + (trip.expenseSummary.approved || 0), 0)

  const invoicePaymentStatus = {
    submitted: invoices.filter(i => i.status === 'SUBMITTED').length,
    approved: invoices.filter(i => i.status === 'APPROVED').length,
    rejected: invoices.filter(i => i.status === 'REJECTED').length,
    paid: invoices.filter(i => i.status === 'PAID').length,
  }

  const activeTrips = trips.filter(t => ['DISPATCHED', 'IN_TRANSIT', 'AT_DELIVERY', 'EXCEPTION'].includes(t.status))
  
  const nonCompliantVehicles = vehicles.filter(v => v.complianceStatus !== 'COMPLIANT')
  const nonCompliantDrivers = drivers.filter(d => d.complianceStatus !== 'COMPLIANT')
  const complianceAlerts = nonCompliantVehicles.length + nonCompliantDrivers.length

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="OPTIMILE VENDOR PORTAL"
        title="Dashboard"
        subtitle="Executive overview of your operations and key metrics"
        icon={<Home className="h-6 w-6 text-primary" />}
      />

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        
        {/* Pending Indents */}
        <KpiCard
          title="Pending Indents"
          value={pendingIndents.length}
          insight={pendingIndents.length > 0 ? "Requires action" : "All caught up"}
          icon={<Clock className="h-4 w-4 text-warning" />}
          onClick={() => navigate('/vendor/trips?tab=indents')}
        >
           <div className="space-y-2 mt-2">
            {pendingIndents.slice(0, 2).map((indent) => (
              <div key={indent.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate max-w-[120px]">{indent.laneDetails.origin.city} &rarr; {indent.laneDetails.destination.city}</span>
                <SLACountdown deadline={indent.slaDeadline} showLabel={false} />
              </div>
            ))}
          </div>
        </KpiCard>

        {/* Active Auctions */}
        <KpiCard
          title="Active Auctions"
          value={activeAuctions.length}
          insight={activeAuctions.length > 0 ? "Bidding open" : "No live events"}
          icon={<Gavel className="h-4 w-4 text-primary" />}
          onClick={() => navigate('/vendor/sourcing?tab=auctions')}
        >
          <div className="space-y-2 mt-2">
            {activeAuctions.slice(0, 2).map((auction) => (
              <div key={auction.id} className="flex items-center justify-between text-xs">
                 <span className="font-medium text-text truncate max-w-[120px]">{auction.customerName}</span>
                 <SLACountdown deadline={auction.endTime} showLabel={false} />
              </div>
            ))}
          </div>
        </KpiCard>

        {/* Uninvoiced Bookings */}
        <KpiCard
          title="Uninvoiced Bookings"
          value={uninvoicedTrips.length}
          insight="Ready to be billed"
          icon={<Package className="h-4 w-4 text-gray-600" />}
          onClick={() => navigate('/vendor/invoices/create')}
        >
           <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-gray-200">
              <span className="text-gray-600">Total Billable</span>
              <CurrencyDisplay amount={totalBillableAmount} className="font-semibold text-text" />
           </div>
        </KpiCard>

        {/* Invoice Payment Status */}
        <KpiCard
          title="Invoice Status"
          value={invoicePaymentStatus.paid}
          unit="paid"
          insight="Current payment standing"
          icon={<CreditCard className="h-4 w-4 text-success" />}
          onClick={() => navigate('/vendor/invoices/list')}
        >
           <div className="flex flex-wrap gap-1.5 mt-2">
              <StatusBadge status="SUBMITTED" label={`${invoicePaymentStatus.submitted} Submitted`} />
              <StatusBadge status="APPROVED" label={`${invoicePaymentStatus.approved} Approved`} />
              <StatusBadge status="REJECTED" label={`${invoicePaymentStatus.rejected} Rejected`} />
              <StatusBadge status="PAID" label={`${invoicePaymentStatus.paid} Paid`} />
           </div>
        </KpiCard>

        <KpiCard
          title="Finance"
          value={invoices.length}
          unit="entries"
          insight="Ledger, payments, and bill discounting"
          icon={<Wallet className="h-4 w-4 text-primary" />}
          onClick={() => navigate('/vendor/ledger')}
        >
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate('/vendor/ledger') }}>Open Ledger</Button>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate('/vendor/ledger/payments') }}>Payment Status</Button>
          </div>
        </KpiCard>

        <KpiCard
          title="Resolutions"
          value={0}
          insight="Exceptions, disputes, and SLA tracking"
          icon={<LifeBuoy className="h-4 w-4 text-warning" />}
          onClick={() => navigate('/vendor/exceptions')}
        >
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate('/vendor/exceptions') }}>Open Exceptions</Button>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate('/vendor/report-exception') }}>Report Exception</Button>
          </div>
        </KpiCard>

        <KpiCard
          title="Create Invoice"
          value={uninvoicedTrips.length}
          unit="ready"
          insight="Generate invoices from delivered bookings"
          icon={<FilePlus className="h-4 w-4 text-primary" />}
          onClick={() => navigate('/vendor/nbfc')}
        >
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate('/vendor/nbfc') }}>Open Bill Discounting</Button>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate('/vendor/invoices/list') }}>Invoice List</Button>
          </div>
        </KpiCard>

        {/* Active Trips */}
        <KpiCard
          title="Active Trips"
          value={activeTrips.length}
          insight="Currently in execution"
          icon={<Truck className="h-4 w-4 text-primary" />}
          onClick={() => navigate('/vendor/trips?tab=active')}
        >
           <div className="space-y-2 mt-2">
              {activeTrips.slice(0, 2).map((trip) => (
                <div key={trip.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 truncate max-w-[120px]">{trip.laneDetails.origin.city} &rarr; {trip.laneDetails.destination.city}</span>
                  <StatusBadge status={trip.status} />
                </div>
              ))}
            </div>
        </KpiCard>

        {/* Fleet Compliance Alerts */}
        <KpiCard
          title="Fleet Compliance"
          value={complianceAlerts}
          insight="Requires attention"
          icon={<AlertTriangle className="h-4 w-4 text-danger" />}
          onClick={() => navigate('/vendor/fleet')}
        >
           <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Vehicle Alerts</span>
                <span className="font-medium text-danger">{nonCompliantVehicles.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Driver Alerts</span>
                <span className="font-medium text-danger">{nonCompliantDrivers.length}</span>
              </div>
            </div>
        </KpiCard>


      </div>
    </div>
  )
}
