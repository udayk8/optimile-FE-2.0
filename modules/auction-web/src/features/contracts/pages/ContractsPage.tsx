import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Button } from '@auction/components/ui/button'
import { Input } from '@auction/components/ui/input'
import { CurrencyDisplay } from '@auction/components/shared/CurrencyDisplay'
import { StatusBadge } from '@auction/components/shared/StatusBadge'
import { formatDate } from '@auction/lib/date-utils'
import { fetchContract, fetchContracts, terminateContract } from '@auction/lib/mock-services'
import type { Contract } from '@auction/types'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'

const CONTRACT_TABS = ['ALL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED'] as const
const PAGE_SIZE = 6

function normalizeTab(tab: string | null) {
  const normalizedTab = tab?.toUpperCase() ?? null
  return CONTRACT_TABS.includes(normalizedTab as (typeof CONTRACT_TABS)[number]) ? (normalizedTab as (typeof CONTRACT_TABS)[number]) : 'ALL'
}

export default function ContractsPage() {
  const navigate = useNavigate()
  const { id: selectedContractId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const activeTab = normalizeTab(searchParams.get('tab'))

  useEffect(() => {
    setLoading(true)
    fetchContracts({
      status: activeTab === 'ALL' ? undefined : activeTab,
      search: search || undefined,
    })
      .then(setContracts)
      .catch(() => setContracts([]))
      .finally(() => setLoading(false))
  }, [activeTab, search])

  useEffect(() => {
    if (!selectedContractId) {
      setSelectedContract(null)
      return
    }

    setDetailLoading(true)
    fetchContract(selectedContractId)
      .then(setSelectedContract)
      .catch(() => {
        setSelectedContract(null)
        toast.error('Contract not found.')
      })
      .finally(() => setDetailLoading(false))
  }, [selectedContractId])

  const handleTerminate = async () => {
    if (!selectedContract) return
    setSaving(true)
    try {
      const updated = await terminateContract(selectedContract.id)
      setSelectedContract(updated)
      setContracts((current) => current.map((contract) => contract.id === updated.id ? updated : contract))
      toast.success('Contract terminated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to terminate contract.')
    } finally {
      setSaving(false)
    }
  }

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

      {selectedContractId && (
        <Card className="mb-6">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Contract Detail</CardTitle>
            {selectedContract && (
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selectedContract.status} />
                {selectedContract.status !== 'TERMINATED' && (
                  <Button variant="destructive" disabled={saving} onClick={handleTerminate}>
                    {saving ? 'Terminating...' : 'Terminate'}
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate('/auction/contracts')}>Back to List</Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">Loading contract detail...</div>
            ) : selectedContract ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Contract</p>
                  <p className="mt-2 font-mono text-sm font-semibold text-[#0F172A]">{selectedContract.id}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Vendor</p>
                  <p className="mt-2 text-sm font-semibold text-[#0F172A]">{selectedContract.vendorName}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Lane</p>
                  <p className="mt-2 text-sm text-[#0F172A]">{selectedContract.lane}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{selectedContract.vehicleType}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Rate</p>
                  <p className="mt-2 text-sm font-semibold text-[#0F172A]">
                    <CurrencyDisplay amount={selectedContract.contractedRate} /> / {selectedContract.rateUnit.replace('PER_', '').replace('_', ' ')}
                  </p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Validity</p>
                  <p className="mt-2 text-sm text-[#0F172A]">{formatDate(selectedContract.startDate)} - {formatDate(selectedContract.endDate)}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Allocation</p>
                  <p className="mt-2 text-sm text-[#0F172A]">{selectedContract.allocationRank} - {selectedContract.volumeAllocationPercent}%</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Trips</p>
                  <p className="mt-2 text-sm text-[#0F172A]">{selectedContract.estimatedTrips}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#94A3B8]">Placement Failures</p>
                  <p className="mt-2 text-sm text-[#0F172A]">{selectedContract.placementFailures.length}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">Contract not found.</div>
            )}
          </CardContent>
        </Card>
      )}

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
          <div className="flex w-fit gap-1 overflow-x-auto border-b border-gray-200">
            {CONTRACT_TABS.map((tab) => (
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
                {tab}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">Loading contracts…</div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
