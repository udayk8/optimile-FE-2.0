import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Gavel, PlusCircle } from 'lucide-react'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Input } from '@auction/components/ui/input'
import { StatusBadge } from '@auction/components/shared/StatusBadge'
import { formatDateTime } from '@auction/lib/date-utils'
import { useAppStore } from '@auction/stores/app.store'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'

const AUCTION_TABS = ['ALL', 'DRAFT', 'UPCOMING', 'LIVE', 'COMPLETED', 'AWARDED', 'NO_BIDS', 'CANCELLED'] as const
const PAGE_SIZE = 6

const TAB_LABELS: Record<(typeof AUCTION_TABS)[number], string> = {
  ALL: 'All',
  DRAFT: 'Draft',
  UPCOMING: 'Upcoming',
  LIVE: 'Live',
  COMPLETED: 'Completed',
  AWARDED: 'Awarded',
  NO_BIDS: 'No Bids',
  CANCELLED: 'Cancelled',
}

function normalizeTab(tab: string | null) {
  const normalizedTab = tab?.toUpperCase() ?? null
  return AUCTION_TABS.includes(normalizedTab as (typeof AUCTION_TABS)[number]) ? (normalizedTab as (typeof AUCTION_TABS)[number]) : 'ALL'
}

export default function AuctionsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { auctions } = useAppStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const activeTab = normalizeTab(searchParams.get('tab'))

  const filteredAuctions = useMemo(() => {
    const query = search.trim().toLowerCase()
    return auctions.filter((auction) => {
      const matchesTab = activeTab === 'ALL' || auction.status === activeTab
      const matchesSearch =
        query.length === 0 ||
        auction.id.toLowerCase().includes(query) ||
        auction.title.toLowerCase().includes(query) ||
        auction.type.toLowerCase().includes(query) ||
        auction.createdBy.toLowerCase().includes(query)
      return matchesTab && matchesSearch
    })
  }, [activeTab, auctions, search])

  const columns = useMemo<DataTableColumn<(typeof filteredAuctions)[number]>[]>(
    () => [
      { key: 'auction', header: 'Auction Name', render: (auction) => <span className="font-medium text-[#0F172A]">{auction.title}</span> },
      { key: 'type', header: 'Type', render: (auction) => <span className="text-sm text-[#0F172A]">{auction.type}</span> },
      { key: 'status', header: 'Status', render: (auction) => <StatusBadge status={auction.status} /> },
      { key: 'createdBy', header: 'Created By', render: (auction) => <span className="text-sm text-[#0F172A]">{auction.createdBy}</span> },
      { key: 'createdAt', header: 'Created At', render: (auction) => <span className="text-sm text-[#0F172A]">{formatDateTime(auction.createdAt)}</span> },
      { key: 'start', header: 'Auction Start Time', render: (auction) => <span className="text-sm text-[#0F172A]">{auction.startAt ? formatDateTime(auction.startAt) : '-'}</span> },
      { key: 'lanes', header: 'Lanes', align: 'right', render: (auction) => <span className="text-sm text-[#0F172A]">{auction.lanes.length}</span> },
      {
        key: 'action',
        header: 'Action',
        align: 'right',
        render: (auction) => (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                navigate(`/auction/auctions/${auction.id}`)
              }}
            >
              {auction.status === 'LIVE' ? 'Enter' : 'View'}
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  )

  return (
    <div>
      <HeroCard
        eyebrow="Auction Operations"
        title="Auctions"
        subtitle="Create Spot, Bulk, and Lot auctions, then move directly from monitoring into award decisions."
        icon={<Gavel className="h-5 w-5 text-primary" />}
        action={
          <Button asChild>
            <Link to="/auction/auctions/new"><PlusCircle className="h-4 w-4" /> New Auction</Link>
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Auction Queue</CardTitle>
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search by auction ID, title, or creator"
              className="w-full lg:w-[320px]"
            />
          </div>
          <div className="flex w-fit gap-1 overflow-x-auto border-b border-gray-200">
            {AUCTION_TABS.map((tab) => (
              <Button
                key={tab}
                type="button"
                variant="ghost"
                size="sm"
                className={`shrink-0 whitespace-nowrap px-4 py-3 text-sm font-bold transition-all ${
                  activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                }`}
                onClick={() => {
                  setSearchParams({ tab })
                  setPage(1)
                }}
              >
                {TAB_LABELS[tab]}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={filteredAuctions}
            columns={columns}
            getRowKey={(auction) => auction.id}
            page={page}
            onPageChange={setPage}
            pageSize={PAGE_SIZE}
            emptyState={<div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">No auctions match the current filters.</div>}
          />
        </CardContent>
      </Card>
    </div>
  )
}
