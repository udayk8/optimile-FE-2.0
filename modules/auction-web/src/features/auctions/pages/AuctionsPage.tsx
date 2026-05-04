import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Gavel, PlusCircle } from 'lucide-react'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Input } from '@auction/components/ui/input'
import { StatusBadge } from '@auction/components/shared/StatusBadge'
import { formatDateTime } from '@auction/lib/date-utils'
import { useAppStore } from '@auction/stores/app.store'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'

const STATUS_FILTERS = ['ALL', 'DRAFT', 'UPCOMING', 'LIVE', 'COMPLETED', 'AWARDED', 'NO_BIDS', 'CANCELLED'] as const
const TYPE_FILTERS = ['ALL', 'SPOT', 'BULK', 'LOT'] as const
const PAGE_SIZE = 6

export default function AuctionsPage() {
  const navigate = useNavigate()
  const { auctions } = useAppStore()
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL')
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

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

  const columns = useMemo<DataTableColumn<(typeof filteredAuctions)[number]>[]>(
    () => [
      {
        key: 'auction',
        header: 'Auction Name',
        render: (auction) => (
          <div>
            <p className="text-sm font-medium text-[#0F172A]">{auction.title}</p>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (auction) => <span className="text-sm text-[#0F172A]">{auction.type}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (auction) => <StatusBadge status={auction.status} />,
      },
      {
        key: 'createdBy',
        header: 'Created By',
        render: (auction) => <span className="text-sm text-[#0F172A]">{auction.createdBy}</span>,
      },
      {
        key: 'createdAt',
        header: 'Created At',
        render: (auction) => <span className="text-sm text-[#0F172A]">{formatDateTime(auction.createdAt)}</span>,
      },
      {
        key: 'start',
        header: 'Auction Start Time',
        render: (auction) => (
          <div>
            <p className="text-sm text-[#0F172A]">{auction.startAt ? formatDateTime(auction.startAt) : '-'}</p>
          </div>
        ),
      },
      {
        key: 'lanes',
        header: 'Lanes',
        align: 'right',
        render: (auction) => <span className="text-sm text-[#0F172A]">{auction.lanes.length}</span>,
      },
      {
        key: 'action',
        header: 'Action',
        align: 'right',
        render: (auction) => {
          const label = auction.status === 'LIVE' ? 'Enter' : 'View'
          return (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation()
                  navigate(`/auction/auctions/${auction.id}`)
                }}
              >
                {label}
              </Button>
            </div>
          )
        },
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
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>Auction Queue</CardTitle>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search by auction ID, title, or type"
              className="w-full xl:w-[280px]"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#64748B]">Auction State</label>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as (typeof STATUS_FILTERS)[number])
                    setPage(1)
                  }}
                  className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                >
                  {STATUS_FILTERS.map((filter) => (
                    <option key={filter} value={filter}>
                      {filter === 'ALL'
                        ? 'All States'
                        : filter === 'COMPLETED'
                          ? 'Pending Award'
                          : filter.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#64748B]">Auction Type</label>
                <select
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value as (typeof TYPE_FILTERS)[number])
                    setPage(1)
                  }}
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
        <CardContent>
          <DataTable
            rows={filteredAuctions}
            columns={columns}
            getRowKey={(auction) => auction.id}
            page={page}
            onPageChange={setPage}
            pageSize={PAGE_SIZE}
            emptyState={
              <div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">
                No auctions match the current filters.
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
