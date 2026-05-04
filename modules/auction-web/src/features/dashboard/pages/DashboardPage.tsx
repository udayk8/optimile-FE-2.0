import { Link, useNavigate } from 'react-router-dom'
import { FileClock, Gavel, ScrollText } from 'lucide-react'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { KPICard } from '@auction/components/cards/KPICard'
import { Button } from '@auction/components/ui/button'
import { MOCK_DASHBOARD } from '@auction/lib/mock-data'
import { useAppStore } from '@auction/stores/app.store'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { auctions, contracts } = useAppStore()

  const liveAuctions = auctions.filter((item) => item.status === 'LIVE')
  const pendingAwards = auctions.filter((item) => item.status === 'COMPLETED')
  const upcomingAuctions = auctions.filter((item) => item.status === 'UPCOMING')
  const activeContracts = contracts.filter((item) => item.status === 'ACTIVE')
  const expiringContracts = contracts.filter((item) => item.status === 'EXPIRING_SOON')
  const expiredContracts = contracts.filter((item) => item.status === 'EXPIRED')

  return (
    <div>
      <HeroCard
        eyebrow="Auction Control Tower"
        title="Customer Procurement Dashboard"
        subtitle="Monitor live auctions, award deadlines, and contract outcomes from a single operational view."
        icon={<Gavel className="h-5 w-5 text-primary" />}
        action={
          <Button asChild variant="outline">
            <Link to="/auction/auctions">Review Auctions</Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KPICard title={MOCK_DASHBOARD.liveAuctions.label} value={liveAuctions.length} insight={MOCK_DASHBOARD.liveAuctions.insight} icon={<Gavel className="h-4 w-4 text-primary" />} onClick={() => navigate('/auction/auctions?tab=live')} />
        <KPICard title={MOCK_DASHBOARD.pendingAwards.label} value={pendingAwards.length} insight={MOCK_DASHBOARD.pendingAwards.insight} icon={<FileClock className="h-4 w-4 text-warning" />} onClick={() => navigate('/auction/auctions?tab=completed')} />
        <KPICard title="Upcoming Auctions" value={upcomingAuctions.length} insight="Open upcoming auctions before they go live." icon={<Gavel className="h-4 w-4 text-primary" />} onClick={() => navigate('/auction/auctions?tab=upcoming')} />
        <KPICard title="Active Contracts" value={activeContracts.length} insight="Review contracts currently in force." icon={<ScrollText className="h-4 w-4 text-primary" />} onClick={() => navigate('/auction/contracts?tab=active')} />
        <KPICard title={MOCK_DASHBOARD.expiringContracts.label} value={expiringContracts.length} insight={MOCK_DASHBOARD.expiringContracts.insight} icon={<ScrollText className="h-4 w-4 text-primary" />} onClick={() => navigate('/auction/contracts?tab=expiring_soon')} />
        <KPICard title="Expired Contracts" value={expiredContracts.length} insight="Review completed contract history." icon={<ScrollText className="h-4 w-4 text-primary" />} onClick={() => navigate('/auction/contracts?tab=expired')} />
      </div>
    </div>
  )
}
