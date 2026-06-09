
import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@vendor/hooks/useModuleRoute'
import { Clock, Package, Gavel, Truck, AlertTriangle, Home, CalendarClock } from 'lucide-react'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { formatDateTime } from '@vendor/lib/date-utils'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { KPICard } from '@vendor/components/cards/KPICard'
import { useAppStore } from '@vendor/stores/app.store'
import { formatLaneDisplay } from '@shared-utils'
import { useVendorBookings } from '@vendor/integration/useVendorBookings'
import { useVendorInvoices, invoicedTripIds } from '@vendor/integration/useVendorInvoices'
import { useTenantBridge } from '@vendor/integration/tenant-data-bridge'

export default function DashboardPage() {
  const navigate = useNavigate()

  // Pending Indents + Active Bookings come from the cross-module bridge when
  // embedded (bookings assigned to this vendor); other KPIs keep their source.
  const { indents: vendorIndents, trips: vendorTrips } = useVendorBookings()
  const { invoices } = useVendorInvoices()
  const auctions = useAppStore(state => state.auctions)
  // Fleet for compliance comes from the cross-module bridge when embedded (the
  // vendor's real tenant fleet); standalone falls back to the local store.
  const bridge = useTenantBridge()
  const storeVehicles = useAppStore(state => state.vehicles)
  const storeDrivers = useAppStore(state => state.drivers)
  const vehicles = bridge?.vehicles ?? storeVehicles
  const drivers = bridge?.drivers ?? storeDrivers
  const pendingIndents = vendorIndents.filter(i => i.status === 'PENDING')
  const liveAuctions = auctions.filter(a => a.state === 'LIVE')
  const upcomingAuctions = auctions.filter(a => a.state === 'UPCOMING')

  const lockedTripIds = invoicedTripIds(invoices)
  const uninvoicedBookings = vendorTrips.filter(t => t.status === 'COMPLETED' && !lockedTripIds.has(t.id) && t.freightRate > 0)
  const totalBillableAmount = uninvoicedBookings.reduce((sum, booking) => sum + (booking.freightRate || 0), 0)

  const inTransitBookings = vendorTrips.filter(t => ['IN_TRANSIT', 'DESTINATION_REACHED'].includes(t.status) && !t.exceptionFlag)
  
  const nonCompliantVehicles = vehicles.filter(v => v.complianceStatus !== 'COMPLIANT')
  const nonCompliantDrivers = drivers.filter(d => d.complianceStatus !== 'COMPLIANT')
  const complianceAlerts = nonCompliantVehicles.length + nonCompliantDrivers.length

  return (
    <div>
      <HeroCard
        eyebrow="OPTIMILE VENDOR PORTAL"
        title="Dashboard"
        subtitle="Executive overview of your operations and key metrics"
        icon={<Home className="h-6 w-6 text-primary" />}
      />

      <div className="mt-6 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
        
        {/* Pending Indents */}
        <KPICard
          title="Pending Indents"
          value={pendingIndents.length}
          insight={pendingIndents.length > 0 ? "Requires action" : "All caught up"}
          icon={<Clock className="h-4 w-4 text-warning" />}
          onClick={() => navigate('/vendor/bookings?tab=indents')}
        >
           <div className="mt-3 space-y-2 px-1">
            {pendingIndents.slice(0, 2).map((indent) => (
              <div key={indent.id} className="text-xs text-gray-600">
                <div className="flex items-center justify-between gap-4">
                  <span className="min-w-0 flex-1 truncate font-medium text-text">{indent.laneDetails.origin.city} &rarr; {indent.laneDetails.destination.city}</span>
                  <SLACountdown deadline={indent.slaDeadline} showLabel={false} />
                </div>
                <div className="mt-1 flex items-center justify-between gap-4 text-[11px] text-gray-500">
                  <span className="truncate">{indent.loadDetails.commodity}</span>
                  <span className="truncate">{indent.id}</span>
                </div>
              </div>
            ))}
          </div>
        </KPICard>

        {/* Live Auctions */}
        <KPICard
          title="Live Auctions"
          value={liveAuctions.length}
          insight={liveAuctions.length > 0 ? 'Bidding open now' : 'No live events'}
          icon={<Gavel className="h-4 w-4 text-primary" />}
          onClick={() => navigate('/vendor/sourcing?tab=live')}
        >
          <div className="mt-3 space-y-2 px-1">
            {liveAuctions.slice(0, 2).map((auction) => (
              <div key={auction.id} className="text-xs text-gray-600">
                <div className="flex items-center justify-between gap-4">
                  <span className="min-w-0 flex-1 truncate font-medium text-text">{auction.customerName}</span>
                  <SLACountdown deadline={auction.endTime} showLabel={false} />
                </div>
                <div className="mt-1 flex items-center justify-between gap-4 text-[11px] text-gray-500">
                  <span className="truncate">{auction.lanes.length === 1 ? formatLaneDisplay(auction.lanes[0]?.laneDetails.origin.city ?? '', auction.lanes[0]?.laneDetails.destination.city ?? '') : `${auction.lanes.length} lanes`}</span>
                  <span className="truncate">Ends soon</span>
                </div>
              </div>
            ))}
            {liveAuctions.length === 0 && <p className="text-xs text-gray-500">No live auctions right now.</p>}
          </div>
        </KPICard>

        {/* Upcoming Auctions */}
        <KPICard
          title="Upcoming Auctions"
          value={upcomingAuctions.length}
          insight={upcomingAuctions.length > 0 ? 'Coming soon' : 'None scheduled'}
          icon={<CalendarClock className="h-4 w-4 text-accent" />}
          onClick={() => navigate('/vendor/sourcing?tab=upcoming')}
        >
          <div className="mt-3 space-y-2 px-1">
            {upcomingAuctions.slice(0, 2).map((auction) => (
              <div key={auction.id} className="text-xs text-gray-600">
                <div className="flex items-center justify-between gap-4">
                  <span className="min-w-0 flex-1 truncate font-medium text-text">{auction.customerName}</span>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent">Starts soon</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-4 text-[11px] text-gray-500">
                  <span className="truncate">{auction.lanes.length === 1 ? formatLaneDisplay(auction.lanes[0]?.laneDetails.origin.city ?? '', auction.lanes[0]?.laneDetails.destination.city ?? '') : `${auction.lanes.length} lanes`}</span>
                  <span className="truncate">{formatDateTime(auction.startTime)}</span>
                </div>
              </div>
            ))}
            {upcomingAuctions.length === 0 && <p className="text-xs text-gray-500">No upcoming auctions scheduled.</p>}
          </div>
        </KPICard>

        {/* Uninvoiced Bookings */}
        <KPICard
          title="Bookings to Invoice"
          value={uninvoicedBookings.length}
          insight="Ready to be billed"
          icon={<Package className="h-4 w-4 text-gray-500" />}
          onClick={() => navigate('/vendor/invoices/create')}
        >
           <div className="mt-3 flex items-center justify-between gap-4 border-t border-gray-200 pt-3 text-sm">
              <span className="text-gray-600">Total billable</span>
              <CurrencyDisplay amount={totalBillableAmount} className="font-semibold text-text" />
           </div>
        </KPICard>

        {/* In Transit Bookings */}
        <KPICard
          title="In Transit Bookings"
          value={inTransitBookings.length}
          insight="Currently in transit"
          icon={<Truck className="h-4 w-4 text-primary" />}
          onClick={() => navigate('/vendor/bookings?tab=in-transit')}
        >
           <div className="mt-3 space-y-2 px-1">
              {inTransitBookings.slice(0, 2).map((booking) => (
                <div key={booking.id} className="text-xs text-gray-600">
                  <div className="flex items-center justify-between gap-4">
                    <span className="min-w-0 flex-1 truncate font-medium text-text">{booking.laneDetails.origin.city} &rarr; {booking.laneDetails.destination.city}</span>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-4 text-[11px] text-gray-500">
                    <span className="truncate">{booking.assignedVehicle.registrationNumber}</span>
                    <span className="truncate">{booking.assignedDriver.name}</span>
                  </div>
                </div>
              ))}
            </div>
        </KPICard>

        {/* Fleet Compliance Alerts */}
        <KPICard
          title="Fleet Compliance"
          value={complianceAlerts}
          insight="Requires attention"
          icon={<AlertTriangle className="h-4 w-4 text-danger" />}
          onClick={() => navigate('/vendor/fleet')}
        >
           <div className="mt-3 space-y-2 px-1">
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-gray-600">Vehicles needing action</span>
                <span className="font-medium text-danger">{nonCompliantVehicles.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-gray-600">Drivers needing action</span>
                <span className="font-medium text-danger">{nonCompliantDrivers.length}</span>
              </div>
            </div>
        </KPICard>


      </div>
    </div>
  )
}
