import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Button } from '@auction/components/ui/button'
import { Input } from '@auction/components/ui/input'
import { CurrencyDisplay } from '@auction/components/shared/CurrencyDisplay'
import { StatusBadge } from '@auction/components/shared/StatusBadge'
import { formatDate } from '@auction/lib/date-utils'
import { useAppStore } from '@auction/stores/app.store'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'

const PAGE_SIZE = 6

export default function ContractsPage() {
  const navigate = useNavigate()
  const { contracts } = useAppStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return contracts.filter((contract) => {
      if (!query) return true
      return (
        contract.id.toLowerCase().includes(query) ||
        contract.lane.toLowerCase().includes(query) ||
        contract.vendorName.toLowerCase().includes(query)
      )
    })
  }, [contracts, search])

  const columns = useMemo<DataTableColumn<(typeof filteredContracts)[number]>[]>(
    () => [
      {
        key: 'contract',
        header: 'Contract',
        render: (contract) => (
          <div>
            <span className="font-mono text-sm font-semibold text-[#0F172A]">{contract.id}</span>
            <p className="mt-1 text-xs text-[#64748B]">
              {contract.rateUnit.replace('PER_', '').replace('_', ' ')}
            </p>
          </div>
        ),
      },
      {
        key: 'vendor',
        header: 'Vendor',
        render: (contract) => <span className="text-sm text-[#0F172A]">{contract.vendorName}</span>,
      },
      {
        key: 'lane',
        header: 'Lane',
        render: (contract) => <span className="text-sm text-[#0F172A]">{contract.lane}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (contract) => <StatusBadge status={contract.status} />,
      },
      {
        key: 'startDate',
        header: 'Start Date',
        render: (contract) => <span className="text-sm text-[#0F172A]">{formatDate(contract.startDate)}</span>,
      },
      {
        key: 'endDate',
        header: 'End Date',
        render: (contract) => <span className="text-sm text-[#0F172A]">{formatDate(contract.endDate)}</span>,
      },
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
      {
        key: 'action',
        header: 'Action',
        align: 'right',
        render: (contract) => (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                navigate(`/auction/contracts/${contract.id}`)
              }}
            >
              View
            </Button>
          </div>
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
        subtitle="Contracts are created after auction awards. Use this tab to review R1/R2/R3 allocations, override reasons, rate units, and expiry."
      />

      <Card className="w-full">
        <CardHeader className="gap-4">
          <CardTitle>Contract Registry</CardTitle>
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search by contract, vendor, or lane"
          />
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
            emptyState={
              <div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">
                No contracts match the current search.
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
