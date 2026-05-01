import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHero } from '@shared-ui/page-hero'
import { Button } from '@shared-ui/button'
import { DataTable } from '@shared-ui/data-table'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate } from '@vendor/utils/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { FileText, ArrowRight, MapPin } from 'lucide-react'
import type { Contract, ContractStatus } from '@vendor/types'

const STATUS_FILTERS: { value: ContractStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'TERMINATED', label: 'Terminated' },
]

export default function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { id: selectedContractId } = useParams()
  
  const { contracts } = useAppStore()

  const filtered = contracts.filter((c) => {
    if (selectedContractId && c.id !== selectedContractId) return false
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
    if (search && !c.id.toLowerCase().includes(search.toLowerCase()) && !c.customerName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const columns = [
    {
      key: 'contract',
      header: 'Contract',
      render: (contract: Contract) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-text">{contract.id}</span>
            <StatusBadge status={contract.status} />
          </div>
          <p className="font-bold text-text">{contract.customerName}</p>
        </div>
      ),
    },
    {
      key: 'lane',
      header: 'Lane',
      render: (contract: Contract) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-gray-500" />
          <span>
            {contract.laneDetails.origin.city} → {contract.laneDetails.destination.city}
          </span>
        </div>
      ),
    },
    {
      key: 'validity',
      header: 'Validity',
      render: (contract: Contract) => (
        <span>
          {formatDate(contract.validityFrom)} — {formatDate(contract.validityTo)}
        </span>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      render: (contract: Contract) => (
        <span className="font-mono font-semibold text-text">
          ₹{contract.rateCard[0]?.rate?.toLocaleString('en-IN')}/{contract.rateCard[0]?.rateType === 'PER_TRIP' ? 'trip' : 'km'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (_contract: Contract) => (
        <div className="flex items-center justify-end gap-2">
          <ArrowRight className="h-4 w-4 text-gray-500" />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHero 
        eyebrow="CONTRACTS"
        title="Contracts" 
        subtitle="Manage your active rate contracts and historical agreements"
        icon={<FileText className="h-5 w-5 text-primary" />}
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-2 text-sm font-bold whitespace-nowrap transition-all ${statusFilter === f.value ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <input type="text" placeholder="Search by ID or customer..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="h-9 px-3 rounded-lg border border-gray-300 bg-white text-sm w-60 focus:outline-none focus:ring-1 focus:ring-primary/20" />
      </div>
      <DataTable
        rows={filtered}
        columns={columns}
        getRowKey={(contract) => contract.id}
        onRowClick={(contract) => navigate(`/vendor/contracts/${contract.id}`)}
        emptyState={<EmptyState icon={<FileText className="h-12 w-12" />} title="No contracts found" />}
      />
    </div>
  )
}
