import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileClock, Gavel, ScrollText } from 'lucide-react'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { KPICard } from '@auction/components/cards/KPICard'
import { Button } from '@auction/components/ui/button'
import { LoadingSkeleton } from '@auction/components/shared/LoadingSkeleton'
import { ErrorState } from '@auction/components/shared/ErrorState'
import { fetchAuctions, fetchContracts } from '@auction/lib/mock-services'
import type { Auction, Contract } from '@auction/types'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([fetchAuctions(), fetchContracts()])
      .then(([auctionData, contractData]) => {
        setAuctions(auctionData)
        setContracts(contractData)
      })
      .catch((e) => setError(e.message ?? 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const liveAuctions = useMemo(() => auctions.filter((item) => item.status === 'LIVE'), [auctions])
  const pendingAwards = useMemo(() => auctions.filter((item) => item.status === 'COMPLETED'), [auctions])
  const expiringContracts = useMemo(() => contracts.filter((item) => item.status === 'EXPIRING_SOON'), [contracts])

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton lines={2} className="h-24 rounded-xl border bg-white p-6" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <LoadingSkeleton key={i} lines={3} className="rounded-xl border bg-white p-5" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />
  }

  return (
    <div className="space-y-6">
      <HeroCard
        eyebrow="Auction Control Tower"
        title="Procurement Control Dashboard"
        subtitle="Monitor live auctions, award deadlines, and contract outcomes from a single operational view."
        icon={<Gavel className="h-5 w-5 text-primary" />}
        action={
          <Button asChild variant="outline">
            <Link to="/auction/auctions">Review Auctions</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KPICard
          title="Live Auctions"
          value={liveAuctions.length}
          insight="Auctions currently accepting bids."
          icon={<Gavel className="h-4 w-4 text-primary" />}
          onClick={() => navigate('/auction/auctions?tab=LIVE')}
        />
        <KPICard
          title="Pending Awards"
          value={pendingAwards.length}
          insight="Completed auctions waiting for award decision."
          icon={<FileClock className="h-4 w-4 text-warning" />}
          onClick={() => navigate('/auction/auctions?tab=COMPLETED')}
        />
        <KPICard
          title="Expiring Contracts"
          value={expiringContracts.length}
          insight="Contracts entering expiry warning window."
          icon={<ScrollText className="h-4 w-4 text-primary" />}
          onClick={() => navigate('/auction/contracts?tab=expiring_soon')}
        />
      </div>

    </div>
  )
}
