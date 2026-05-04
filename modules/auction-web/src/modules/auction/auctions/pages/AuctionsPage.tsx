import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, Gavel, PlusCircle } from 'lucide-react'
import { PageHero } from '@shared-ui/page-hero'
import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'
import { FilterBar } from '@shared-ui/filter-bar'
import { Field, Select } from '@shared-ui/form-field'
import { Input } from '@shared-ui/input'
import { EmptyState } from '@admin/components/shared/EmptyState'
import { StatusBadge } from '@admin/components/shared/StatusBadge'
import { SLACountdown } from '@admin/components/shared/SLACountdown'
import { formatDateTime } from '@admin/utils/date-utils'
import { useAppStore } from '@admin/stores/app.store'
import type { Auction } from '@admin/types'

const STATUS_FILTERS = ['ALL', 'DRAFT', 'LIVE', 'COMPLETED', 'AWARDED', 'CANCELLED'] as const
const TYPE_FILTERS = ['ALL', 'SPOT', 'BULK', 'LOT'] as const

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
  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(filteredAuctions.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  const columns: DataTableColumn<Auction>[] = [
    {
      key: 'auction',
      header: 'Auction',
      render: (auction) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-text">{auction.id}</span>
            <StatusBadge status={auction.status} />
          </div>
          <p className="mt-2 text-sm font-bold text-text">{auction.title}</p>
          <p className="mt-1 text-xs text-gray-500">{auction.type} · {auction.lanes.length} lanes</p>
          {auction.status === 'COMPLETED' && (
            <p className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
              Pending Award: {auction.type === 'SPOT' ? 'confirm R1 winner' : 'select allocations, then Final Award'}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Created On',
      render: (auction) => (
        <div>
          <p className="font-semibold text-text">{formatDateTime(auction.createdAt)}</p>
          <p className="mt-1 text-xs text-gray-500">{auction.createdBy}</p>
        </div>
      ),
    },
    {
      key: 'window',
      header: 'Contract Window / Scope',
      render: (auction) => (
        <div>
          <p className="font-semibold text-text">{auction.contractStartDate ?? 'Spot'}</p>
          <p className="mt-1 text-xs text-gray-500">{auction.contractEndDate ?? 'Single booking'}</p>
        </div>
      ),
    },
    {
      key: 'sla',
      header: 'Award Deadline',
      render: (auction) =>
        auction.status === 'LIVE' || auction.status === 'COMPLETED' ? <SLACountdown deadline={auction.awardDeadline} /> : <span className="text-sm text-gray-600">Not active</span>,
    },
    {
      key: 'vendors',
      header: 'Vendors',
      align: 'right',
      render: (auction) => <span className="font-bold text-text">{auction.invitedVendorIds.length}</span>,
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: () => (
        <span className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-text">
          <Eye className="h-4 w-4" />
          Open
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Auction Operations"
        title="Auctions"
        subtitle="Create Spot, Bulk, and Lot auctions, then review them with consistent paging and clear state labels."
        icon={<Gavel className="h-5 w-5 text-primary" />}
        action={
          <Button asChild>
            <Link to="/auction/auctions/new"><PlusCircle className="h-4 w-4" /> New Auction</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="gap-4">
          <CardTitle>Auction Queue</CardTitle>
          <FilterBar
            search={
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by auction ID, title, or type"
              className="w-full xl:w-72"
            />
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Auction State">
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_FILTERS)[number])}
                >
                  {STATUS_FILTERS.map((filter) => (
                    <option key={filter} value={filter}>
                      {filter === 'ALL' ? 'All States' : filter.replace('_', ' ')}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Auction Type">
                <Select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as (typeof TYPE_FILTERS)[number])}
                >
                  {TYPE_FILTERS.map((filter) => (
                    <option key={filter} value={filter}>
                      {filter === 'ALL' ? 'All Types' : filter}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </FilterBar>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={filteredAuctions}
            columns={columns}
            getRowKey={(auction) => auction.id}
            onRowClick={(auction) => navigate(`/auction/auctions/${auction.id}`)}
            emptyState={<EmptyState title="No auctions found" description="No auctions match the current filters." />}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
