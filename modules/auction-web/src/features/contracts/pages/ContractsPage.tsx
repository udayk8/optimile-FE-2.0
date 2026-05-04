import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Button } from '@auction/components/ui/button'
import { Input } from '@auction/components/ui/input'
import { CurrencyDisplay } from '@auction/components/shared/CurrencyDisplay'
import { StatusBadge } from '@auction/components/shared/StatusBadge'
import { formatDate } from '@auction/lib/date-utils'
import { useAppStore } from '@auction/stores/app.store'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'

const CONTRACT_TABS = ['ALL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED'] as const
const PAGE_SIZE = 6

function normalizeTab(tab: string | null) {
  const normalizedTab = tab?.toUpperCase() ?? null
  return CONTRACT_TABS.includes(normalizedTab as (typeof CONTRACT_TABS)[number]) ? (normalizedTab as (typeof CONTRACT_TABS)[number]) : 'ALL'
}

export default function ContractsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { contracts } = useAppStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const activeTab = normalizeTab(searchParams.get('tab'))

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return contracts.filter((contract) => {
      const matchesTab = activeTab === 'ALL' || contract.status === activeTab
      const matchesSearch =
        query.length === 0 ||
        contract.id.toLowerCase().includes(query) ||
        contract.vendorName.toLowerCase().includes(query) ||
        contract.lane.toLowerCase().includes(query) ||
        contract.vehicleType.toLowerCase().includes(query)
      return matchesTab && matchesSearch
    })
  }, [activeTab, contracts, search])

  const columns = useMemo<DataTableColumn<(typeof filteredContracts)[number]>[]>(
    () => [
      { key: 'contract', header: 'Contract', render: (contract) => <span className="font-medium text-[#0F172A]">{contract.id}</span> },
      { key: 'vendor', header: 'Vendor', render: (contract) => <span className="text-sm text-[#0F172A]">{contract.vendorName}</span> },
      { key: 'lane', header: 'Lane', render: (contract) => <span className="text-sm text-[#0F172A]">{contract.lane}</span> },
      { key: 'vehicleType', header: 'Vehicle Type', render: (contract) => <span className="text-sm text-[#0F172A]">{contract.vehicleType}</span> },
      { key: 'status', header: 'Status', render: (contract) => <StatusBadge status={contract.status} /> },
      { key: 'startDate', header: 'Start Date', render: (contract) => <span className="text-sm text-[#0F172A]">{formatDate(contract.startDate)}</span> },
      { key: 'endDate', header: 'End Date', render: (contract) => <span className="text-sm text-[#0F172A]">{formatDate(contract.endDate)}</span> },
      {
        key: 'rate',
        header: 'Rate',
        render: (contract) => (
          <span className="text-sm text-[#0F172A]">
            <CurrencyDisplay amount={contract.contractedRate} /> / {contract.rateUnit.replace('PER_', '').replace('_', ' ')}
          </span>
        ),
      },
      {
        key: 'allocation',
        header: 'Allocation',
        render: (contract) => (
          <span className="text-sm text-[#0F172A]">
            {contract.allocationRank} · {contract.volumeAllocationPercent}%
          </span>
        ),
      },
    ],
    []
  )

  return (
    <div>
      <HeroCard
        eyebrow="Contract Outputs"
        title="Contracts"
        subtitle="Contracts are created after auction awards. Use this tab to review allocations, rates, dates, and contract expiry."
      />

      <Card className="w-full">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Contract Registry</CardTitle>
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search by contract, vendor, lane, or vehicle type"
              className="w-full lg:w-[320px]"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
            {CONTRACT_TABS.map((tab) => (
              <Button
                key={tab}
                type="button"
                variant={activeTab === tab ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 whitespace-nowrap"
                onClick={() => {
                  setSearchParams({ tab })
                  setPage(1)
                }}
              >
                {tab}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={filteredContracts}
            columns={columns}
            getRowKey={(contract) => contract.id}
            page={page}
            onPageChange={setPage}
            pageSize={PAGE_SIZE}
            className="w-full"
            onRowClick={(contract) => navigate(`/auction/contracts/${contract.id}`)}
            emptyState={<div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">No contracts match the current filters.</div>}
          />
        </CardContent>
      </Card>
    </div>
  )
}
