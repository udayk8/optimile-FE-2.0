import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Card, CardContent } from '@shared-ui/card'
import { Button } from '@shared-ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate } from '@vendor/utils/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { FileText, ArrowRight, MapPin, PenLine } from 'lucide-react'
import type { ContractStatus } from '@vendor/types'

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
  
  const { contracts, signContract } = useAppStore()

  const filtered = contracts.filter((c) => {
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
        icon={<FileText className="h-5 w-5 text-[#2563EB]" />}
      />
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${statusFilter === f.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <input type="text" placeholder="Search by ID or customer..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-transparent text-sm w-60 focus:outline-none focus:ring-1 focus:ring-ring" />
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
                    <p className="text-base font-medium">{contract.customerName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {contract.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation()
                          signContract(contract.id)
                        }}
                      >
                        <PenLine className="h-3.5 w-3.5 mr-1" /> Sign Contract
                      </Button>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {contract.laneDetails.origin.city} → {contract.laneDetails.destination.city}
                  </div>
                  <div><span className="text-muted-foreground">Validity: </span>{formatDate(contract.validityFrom)} — {formatDate(contract.validityTo)}</div>
                  <div><span className="text-muted-foreground">Rate: </span><span className="font-mono">₹{contract.rateCard[0]?.rate?.toLocaleString('en-IN')}/{contract.rateCard[0]?.rateType === 'PER_TRIP' ? 'trip' : 'km'}</span></div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
