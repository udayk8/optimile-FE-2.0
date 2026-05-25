import { Link } from 'react-router-dom'
import { FileClock, Gavel, ScrollText } from 'lucide-react'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { KPICard } from '@auction/components/cards/KPICard'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Button } from '@auction/components/ui/button'
import { StatusBadge } from '@auction/components/shared/StatusBadge'
import { SLACountdown } from '@auction/components/shared/SLACountdown'
import { MOCK_DASHBOARD } from '@auction/lib/mock-data'
import { useAppStore } from '@auction/stores/app.store'
import { useAuctionPath } from '@auction/lib/auctionPath'

export default function DashboardPage() {
  const { auctions, contracts } = useAppStore()
  const ap = useAuctionPath()

  const liveAuctions = auctions.filter((item) => item.status === 'LIVE')
  const pendingAwards = auctions.filter((item) => item.status === 'COMPLETED')
  const expiringContracts = contracts.filter((item) => item.status === 'EXPIRING_SOON')

  return (
    <div>
      <HeroCard
        eyebrow="Auction Control Tower"
        title="Customer Procurement Dashboard"
        subtitle="Monitor live auctions, award deadlines, and contract outcomes from a single operational view."
        icon={<Gavel className="h-5 w-5 text-primary" />}
        action={
          <Button asChild variant="outline">
            <Link to={ap('/auctions')}>Review Auctions</Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KPICard
          title={MOCK_DASHBOARD.liveAuctions.label}
          value={liveAuctions.length}
          insight={MOCK_DASHBOARD.liveAuctions.insight}
          icon={<Gavel className="h-4 w-4 text-primary" />}
        />
        <KPICard
          title={MOCK_DASHBOARD.pendingAwards.label}
          value={pendingAwards.length}
          insight={MOCK_DASHBOARD.pendingAwards.insight}
          icon={<FileClock className="h-4 w-4 text-warning" />}
        />
        <KPICard
          title={MOCK_DASHBOARD.expiringContracts.label}
          value={expiringContracts.length}
          insight={MOCK_DASHBOARD.expiringContracts.insight}
          icon={<ScrollText className="h-4 w-4 text-primary" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Priority Auctions</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link to={ap('/auctions')}>View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {auctions.slice(0, 4).map((auction) => (
              <Link
                key={auction.id}
                to={ap(`/auctions/${auction.id}`)}
                className="flex items-start justify-between rounded-xl border border-[#E5E7EB] p-4 transition hover:bg-[#F8FAFC]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-[#0F172A]">{auction.id}</span>
                    <StatusBadge status={auction.status} />
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#0F172A]">{auction.title}</p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    {auction.type} · {auction.lanes.length} lane{auction.lanes.length > 1 ? 's' : ''} · Created by {auction.createdBy}
                  </p>
                </div>
                {(auction.status === 'LIVE' || auction.status === 'COMPLETED') && <SLACountdown deadline={auction.awardDeadline} />}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiring Contracts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiringContracts.length === 0 && <p className="text-sm text-[#64748B]">No contracts are currently expiring.</p>}
            {expiringContracts.map((contract) => (
              <Link
                key={contract.id}
                to={ap(`/contracts/${contract.id}`)}
                className="block rounded-xl border border-[#E5E7EB] p-4 transition hover:bg-[#F8FAFC]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold">{contract.id}</span>
                  <StatusBadge status={contract.status} />
                </div>
                <p className="mt-2 text-sm text-[#0F172A]">{contract.lane}</p>
                <p className="mt-1 text-xs text-[#64748B]">{contract.vendorName} · {contract.vehicleType}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
