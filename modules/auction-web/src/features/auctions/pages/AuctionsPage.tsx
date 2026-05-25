import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, Gavel, PlusCircle } from 'lucide-react'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Input } from '@auction/components/ui/input'
import { StatusBadge } from '@auction/components/shared/StatusBadge'
import { SLACountdown } from '@auction/components/shared/SLACountdown'
import { formatDateTime } from '@auction/lib/date-utils'
import { useAppStore } from '@auction/stores/app.store'
import { useAuctionPath } from '@auction/lib/auctionPath'

const STATUS_FILTERS = ['ALL', 'DRAFT', 'LIVE', 'COMPLETED', 'AWARDED', 'NO_BIDS', 'CANCELLED'] as const
const TYPE_FILTERS = ['ALL', 'SPOT', 'BULK', 'LOT'] as const

export default function AuctionsPage() {
  const navigate = useNavigate()
  const ap = useAuctionPath()
  const { auctions } = useAppStore()
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL')
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('ALL')
  const [search, setSearch] = useState('')

  const filteredAuctions = useMemo(() => {
    return auctions.filter((auction) => {
      const matchesStatus = statusFilter === 'ALL' || auction.status === statusFilter
      const matchesType = typeFilter === 'ALL' || auction.type === typeFilter
      const query = search.trim().toLowerCase()
      const matchesSearch =
        query.length === 0 ||
        auction.id.toLowerCase().includes(query) ||
        auction.title.toLowerCase().includes(query) ||
        auction.type.toLowerCase().includes(query)

      return matchesStatus && matchesType && matchesSearch
    })
  }, [auctions, search, statusFilter, typeFilter])

  return (
    <div>
      <HeroCard
        eyebrow="Auction Operations"
        title="Auctions"
        subtitle="Create Spot, Bulk, and Lot auctions, then move directly from monitoring into award decisions."
        icon={<Gavel className="h-5 w-5 text-primary" />}
        action={
          <Button asChild>
            <Link to={ap('/auctions/new')}><PlusCircle className="h-4 w-4" /> New Auction</Link>
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>Auction Queue</CardTitle>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by auction ID, title, or type"
              className="w-full xl:w-[280px]"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#64748B]">Auction State</label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_FILTERS)[number])}
                  className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                >
                  {STATUS_FILTERS.map((filter) => (
                    <option key={filter} value={filter}>
                      {filter === 'ALL' ? 'All States' : filter.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#64748B]">Auction Type</label>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as (typeof TYPE_FILTERS)[number])}
                  className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                >
                  {TYPE_FILTERS.map((filter) => (
                    <option key={filter} value={filter}>
                      {filter === 'ALL' ? 'All Types' : filter}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredAuctions.map((auction) => (
            <button
              key={auction.id}
              onClick={() => navigate(ap(`/auctions/${auction.id}`))}
              className="grid w-full gap-3 rounded-xl border border-[#E5E7EB] p-4 text-left transition hover:bg-[#F8FAFC] lg:grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_0.6fr_auto]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-[#0F172A]">{auction.id}</span>
                  <StatusBadge status={auction.status} />
                </div>
                <p className="mt-2 text-sm font-medium text-[#0F172A]">{auction.title}</p>
                <p className="mt-1 text-xs text-[#64748B]">{auction.type} · {auction.lanes.length} lanes</p>
                {auction.status === 'COMPLETED' && (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                    Pending Award: {auction.type === 'SPOT' ? 'confirm R1 winner' : 'select allocations, then Final Award'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Created</p>
                <p className="mt-1 text-sm text-[#0F172A]">{formatDateTime(auction.createdAt)}</p>
                <p className="mt-1 text-xs text-[#64748B]">{auction.createdBy}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Contract Window</p>
                <p className="mt-1 text-sm text-[#0F172A]">{auction.contractStartDate ?? 'Spot'}</p>
                <p className="mt-1 text-xs text-[#64748B]">{auction.contractEndDate ?? 'Single booking'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Award SLA</p>
                <div className="mt-1">
                  {(auction.status === 'LIVE' || auction.status === 'COMPLETED') ? (
                    <SLACountdown deadline={auction.awardDeadline} />
                  ) : (
                    <span className="text-sm text-[#64748B]">Not active</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Vendors</p>
                <p className="mt-1 text-sm text-[#0F172A]">{auction.invitedVendorIds.length}</p>
              </div>
              <div className="flex items-center justify-end">
                <span className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-[#0F172A]">
                  <Eye className="h-4 w-4" />
                  Open
                </span>
              </div>
            </button>
          ))}
          {filteredAuctions.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">
              No auctions match the current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
