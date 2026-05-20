import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Card, CardContent } from '@vendor/components/ui/card'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { FileText, ArrowRight, MapPin } from 'lucide-react'
import type { ContractStatus } from '@vendor/types'

const STATUS_FILTERS: { value: ContractStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
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
    if (c.status === 'DRAFT') return false
    if (selectedContractId && c.id !== selectedContractId) return false
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
    if (search && !c.id.toLowerCase().includes(search.toLowerCase()) && !c.customerName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <HeroCard 
        eyebrow="CONTRACTS"
        title="Contracts" 
        subtitle="Manage your active rate contracts and historical agreements"
        icon={<FileText className="h-5 w-5 text-primary" />}
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${statusFilter === f.value ? 'bg-white text-text shadow-sm' : 'text-gray-600 hover:text-primary'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <input type="text" placeholder="Search by ID or customer..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-60 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4" />
      </div>
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <EmptyState icon={<FileText className="h-12 w-12" />} title="No contracts found" />
        ) : (
          filtered.map((contract) => (
            <Card key={contract.id} className="cursor-pointer hover:border-primary/30" onClick={() => navigate(`/vendor/contracts/${contract.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold">{contract.id}</span>
                      <StatusBadge status={contract.status} />
                    </div>
                      <p className="text-base font-bold text-text">{contract.customerName}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    {contract.laneDetails.origin.city} → {contract.laneDetails.destination.city}
                  </div>
                  <div><span className="text-gray-500">Validity: </span>{formatDate(contract.validityFrom)} — {formatDate(contract.validityTo)}</div>
                  <div><span className="text-gray-500">Rate: </span><span className="font-mono">₹{contract.rateCard[0]?.rate?.toLocaleString('en-IN')}/{contract.rateCard[0]?.rateType === 'PER_TRIP' ? 'trip' : 'km'}</span></div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
