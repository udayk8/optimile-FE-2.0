import { useNavigate } from 'react-router-dom'
import { Clock, Package, CreditCard, Gavel, Truck, AlertTriangle, Home } from 'lucide-react'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { KPICard } from '@vendor/components/cards/KPICard'
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
    <div>
      <HeroCard
        eyebrow="OPTIMILE VENDOR PORTAL"
        title="Dashboard"
        subtitle="Executive overview of your operations and key metrics"
        icon={<Home className="h-6 w-6 text-[#2563EB]" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Pending Indents */}
        <KPICard
          title="Pending Indents"
          value={pendingIndents.length}
          insight={pendingIndents.length > 0 ? "Requires action" : "All caught up"}
          icon={<Clock className="h-4 w-4 text-[#F59E0B]" />}
          onClick={() => navigate('/vendor/trips?tab=indents')}
        >
           <div className="space-y-2 mt-2">
            {pendingIndents.slice(0, 2).map((indent) => (
              <div key={indent.id} className="flex items-center justify-between text-xs">
                <span className="text-[#475569] truncate max-w-[120px]">{indent.laneDetails.origin.city} &rarr; {indent.laneDetails.destination.city}</span>
                <SLACountdown deadline={indent.slaDeadline} showLabel={false} />
              </div>
            ))}
          </div>
        </KPICard>

        {/* Active Auctions */}
        <KPICard
          title="Active Auctions"
          value={activeAuctions.length}
          insight={activeAuctions.length > 0 ? "Bidding open" : "No live events"}
          icon={<Gavel className="h-4 w-4 text-[#2563EB]" />}
          onClick={() => navigate('/vendor/sourcing?tab=auctions')}
        >
          <div className="space-y-2 mt-2">
            {activeAuctions.slice(0, 2).map((auction) => (
              <div key={auction.id} className="flex items-center justify-between text-xs">
                 <span className="font-medium text-[#0F172A] truncate max-w-[120px]">{auction.customerName}</span>
                 <SLACountdown deadline={auction.endTime} showLabel={false} />
              </div>
            ))}
          </div>
        </KPICard>

        {/* Uninvoiced Bookings */}
        <KPICard
          title="Uninvoiced Bookings"
          value={uninvoicedTrips.length}
          insight="Ready to be billed"
          icon={<Package className="h-4 w-4 text-[#64748B]" />}
          onClick={() => navigate('/vendor/invoices/create')}
        >
           <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-[#E5E7EB]">
              <span className="text-[#64748B]">Total Billable</span>
              <CurrencyDisplay amount={totalBillableAmount} className="font-semibold text-[#0F172A]" />
           </div>
        </KPICard>

        {/* Invoice Payment Status */}
        <KPICard
          title="Invoice Status"
          value={invoicePaymentStatus.paid}
          unit="paid"
          insight="Current payment standing"
          icon={<CreditCard className="h-4 w-4 text-[#16A34A]" />}
          onClick={() => navigate('/vendor/invoices/list')}
        >
           <div className="flex flex-wrap gap-1.5 mt-2">
              <StatusBadge status="SUBMITTED" label={`${invoicePaymentStatus.submitted} Submitted`} />
              <StatusBadge status="APPROVED" label={`${invoicePaymentStatus.approved} Approved`} />
              <StatusBadge status="REJECTED" label={`${invoicePaymentStatus.rejected} Rejected`} />
              <StatusBadge status="PAID" label={`${invoicePaymentStatus.paid} Paid`} />
           </div>
        </KPICard>

        {/* Active Trips */}
        <KPICard
          title="Active Trips"
          value={activeTrips.length}
          insight="Currently in execution"
          icon={<Truck className="h-4 w-4 text-[#2563EB]" />}
          onClick={() => navigate('/vendor/trips?tab=active')}
        >
           <div className="space-y-2 mt-2">
              {activeTrips.slice(0, 2).map((trip) => (
                <div key={trip.id} className="flex items-center justify-between text-xs">
                  <span className="text-[#475569] truncate max-w-[120px]">{trip.laneDetails.origin.city} &rarr; {trip.laneDetails.destination.city}</span>
                  <StatusBadge status={trip.status} />
                </div>
              ))}
            </div>
        </KPICard>

        {/* Fleet Compliance Alerts */}
        <KPICard
          title="Fleet Compliance"
          value={complianceAlerts}
          insight="Requires attention"
          icon={<AlertTriangle className="h-4 w-4 text-[#EF4444]" />}
          onClick={() => navigate('/vendor/fleet')}
        >
           <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Vehicle Alerts</span>
                <span className="font-medium text-[#EF4444]">{nonCompliantVehicles.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Driver Alerts</span>
                <span className="font-medium text-[#EF4444]">{nonCompliantDrivers.length}</span>
              </div>
            </div>
        </KPICard>


      </div>
    </div>
  )
}
