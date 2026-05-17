import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileClock, Gavel, ScrollText } from 'lucide-react'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { KPICard } from '@auction/components/cards/KPICard'
import { Button } from '@auction/components/ui/button'
import { LoadingSkeleton } from '@auction/components/shared/LoadingSkeleton'
import { ErrorState } from '@auction/components/shared/ErrorState'
import { fetchDashboard, type DashboardResponse } from '@auction/services/dashboard.service'
import { formatDateTime } from '@auction/lib/date-utils'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    fetchDashboard()
      .then(setData)
      .catch((e) => setError(e.message ?? 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

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

  if (error || !data) {
    return (
      <ErrorState
        message={error ?? 'Failed to load dashboard'}
        onRetry={load}
      />
    )
  }

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
        <KPICard
          title="Live Auctions"
          value={data.liveAuctions.value}
          insight={data.liveAuctions.insight}
          icon={<Gavel className="h-4 w-4 text-primary" />}
          onClick={() => navigate('/auction/auctions?tab=live')}
        />
        <KPICard
          title="Pending Awards"
          value={data.pendingAwards.value}
          insight={data.pendingAwards.insight}
          icon={<FileClock className="h-4 w-4 text-warning" />}
          onClick={() => navigate('/auction/auctions?tab=completed')}
        />
        <KPICard
          title="Expiring Contracts"
          value={data.expiringContracts.value}
          insight={data.expiringContracts.insight}
          icon={<ScrollText className="h-4 w-4 text-primary" />}
          onClick={() => navigate('/auction/contracts?tab=expiring_soon')}
        />
      </div>

      {data.priorityAuctions.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#94A3B8]">Priority Auctions</h2>
          <div className="space-y-3">
            {data.priorityAuctions.map((auction) => (
              <div
                key={auction.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-[#E5E7EB] bg-white p-4 transition-shadow hover:shadow-sm"
                onClick={() => navigate(`/auction/auctions/${auction.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[#0F172A]">{auction.title}</p>
                  <p className="mt-0.5 text-xs text-[#64748B]">
                    {auction.type} &middot; <span className="capitalize">{auction.status.toLowerCase()}</span>
                  </p>
                </div>
                <div className="ml-4 shrink-0 text-right">
                  <p className="text-xs text-[#94A3B8]">Award deadline</p>
                  <p className="text-xs font-medium text-[#0F172A]">{formatDateTime(auction.awardDeadline)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.expiringContractsList.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#94A3B8]">Expiring Contracts</h2>
          <div className="space-y-3">
            {data.expiringContractsList.map((contract) => (
              <div
                key={contract.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-[#E5E7EB] bg-white p-4 transition-shadow hover:shadow-sm"
                onClick={() => navigate(`/auction/contracts/${contract.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[#0F172A]">{contract.vendorName}</p>
                  <p className="mt-0.5 text-xs text-[#64748B]">{contract.lane}</p>
                </div>
                <div className="ml-4 shrink-0 text-right">
                  <p className="text-xs text-[#94A3B8]">Expires</p>
                  <p className="text-xs font-medium text-[#0F172A]">{formatDateTime(contract.endDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
