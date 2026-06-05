import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHero } from '@shared-ui/page-hero'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'
import { FilterBar } from '@shared-ui/filter-bar'
import { InfoGrid, InfoItem } from '@shared-ui/info-grid'
import { Input } from '@shared-ui/input'
import { CurrencyDisplay } from '@admin/components/shared/CurrencyDisplay'
import { EmptyState } from '@admin/components/shared/EmptyState'
import { StatusBadge } from '@admin/components/shared/StatusBadge'
import { useAppStore } from '@admin/stores/app.store'
import type { Contract } from '@admin/types'

export default function ContractsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contracts } = useAppStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const selectedContract = contracts.find((item) => item.id === id) ?? contracts[0]

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return contracts.filter((contract) => {
      if (!query) return true
      return (
        contract.id.toLowerCase().includes(query) ||
        contract.vendorName.toLowerCase().includes(query) ||
        contract.originCity.toLowerCase().includes(query) ||
        contract.destinationCity.toLowerCase().includes(query)
      )
    })
  }, [contracts, search])
  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  const columns: DataTableColumn<Contract>[] = [
    {
      key: 'contract',
      header: 'Contract',
      render: (contract) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-text">{contract.id}</span>
            <StatusBadge status={contract.status} />
          </div>
          <p className="mt-2 text-sm font-bold text-text">{contract.vendorName}</p>
          <p className="mt-1 text-xs text-gray-500">{contract.originCity} - {contract.destinationCity}</p>
        </div>
      ),
    },
    {
      key: 'allocation',
      header: 'Allocation',
      render: (contract) => (
        <div>
          <p className="font-semibold text-text">{contract.allocationRank}</p>
          <p className="mt-1 text-xs text-gray-500">{contract.volumeAllocationPercent}% volume</p>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (contract) => <span className="font-semibold text-text">{contract.vehicleType}</span>,
    },
    {
      key: 'rate',
      header: 'Rate',
      align: 'right',
      render: (contract) => <CurrencyDisplay amount={contract.contractedRate} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Contract Control"
        title="Contracts"
        subtitle="Contracts are created after auction awards. Use this tab to review them with consistent paging and clear column labels."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader className="gap-4">
            <CardTitle>Contract Registry</CardTitle>
            <FilterBar
              search={<Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by contract, vendor, or lane" className="w-full xl:w-72" />}
            />
          </CardHeader>
          <CardContent>
            <DataTable
              rows={filteredContracts}
              columns={columns}
              getRowKey={(contract) => contract.id}
              onRowClick={(contract) => navigate(`/auction/contracts/${contract.id}`)}
              emptyState={<EmptyState title="No contracts found" description="No contracts match the current search." />}
              page={currentPage}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>

        {selectedContract && (
          <Card>
            <CardHeader className="space-y-0">
              <div>
                <CardTitle>{selectedContract.id}</CardTitle>
                <p className="mt-1 text-sm text-gray-600">{selectedContract.vendorName} · {selectedContract.contractType}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <InfoGrid className="md:grid-cols-2">
                <InfoItem label="Lane">{selectedContract.originCity} - {selectedContract.destinationCity}</InfoItem>
                <InfoItem label="Vehicle Type">{selectedContract.vehicleType}</InfoItem>
                <InfoItem label="Contracted Rate">
                    <CurrencyDisplay amount={selectedContract.contractedRate} /> / {selectedContract.rateUnit.replace('PER_', '').replace('_', ' ')}
                </InfoItem>
                <InfoItem label="Allocation">{selectedContract.allocationRank} · {selectedContract.volumeAllocationPercent}%</InfoItem>
              </InfoGrid>

              {selectedContract.l1OverrideReason && (
                <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-warning">Winner override reason</p>
                  <p className="mt-2 text-sm text-warning">{selectedContract.l1OverrideReason}</p>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">TMS Sync</p>
                <p className="mt-2 text-sm text-gray-600">
                  {selectedContract.rateSyncedToTms ? 'Rates synced and available for downstream booking suggestion.' : 'Sync pending.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
