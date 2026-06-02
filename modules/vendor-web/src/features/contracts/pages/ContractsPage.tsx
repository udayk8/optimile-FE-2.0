import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@vendor/hooks/useModuleRoute'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { useAuctionContractsBridge } from '@vendor/integration/auctionBridge'
import { FileText, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ContractStatus } from '@vendor/types'

const STATUS_FILTERS: { value: ContractStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
]

const COLUMN_OPTIONS = [
  { key: 'contract', label: 'Contract' },
  { key: 'customer', label: 'Customer' },
  { key: 'route', label: 'Route' },
  { key: 'status', label: 'Status' },
  { key: 'validity', label: 'Validity' },
  { key: 'rate', label: 'Rate' },
]

export default function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const { id: selectedContractId } = useParams()
  const { contracts: storeContracts } = useAppStore()
  // Cross-module: contracts awarded to this vendor via auction-web, surfaced
  // alongside the local demo contracts.
  const auctionContracts = useAuctionContractsBridge()
  const contracts = [...auctionContracts, ...storeContracts]

  const filtered = contracts.filter((c) => {
    if (c.status === 'DRAFT') return false
    if (selectedContractId && c.id !== selectedContractId) return false
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
    if (search && !c.id.toLowerCase().includes(search.toLowerCase()) && !c.customerName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const pageSize = 5
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedContracts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div>
      <HeroCard 
        eyebrow="CONTRACTS"
        title="Contracts" 
        subtitle="Manage your active rate contracts and historical agreements"
        icon={<FileText className="h-5 w-5 text-primary" />}
      />
      <div className="mt-6 mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${statusFilter === f.value ? 'bg-white text-text shadow-sm' : 'text-gray-600 hover:text-primary'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="text" placeholder="Search by ID or customer..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-60 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState icon={<FileText className="h-12 w-12" />} title="No contracts found" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Contract</th>
                  <th className="px-5 py-3 font-bold">Customer</th>
                  <th className="px-5 py-3 font-bold">Route</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Validity</th>
                  <th className="px-5 py-3 font-bold">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedContracts.map((contract) => (
                  <tr
                  key={contract.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/vendor/contracts/${contract.id}`)}
                >
                  <td className="px-5 py-4 font-mono text-sm font-semibold text-text">{contract.id}</td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-text">{contract.customerName}</div>
                    <div className="mt-1 text-xs text-gray-500">{contract.customerGSTIN}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-sm text-text">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {contract.laneDetails.origin.city} → {contract.laneDetails.destination.city}
                    </div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={contract.status} /></td>
                  <td className="px-5 py-4 text-sm text-text">{formatDate(contract.validityFrom)} — {formatDate(contract.validityTo)}</td>
                  <td className="px-5 py-4 text-sm text-text">
                    <span className="font-mono">
                      ₹{contract.rateCard[0]?.rate?.toLocaleString('en-IN')}/{contract.rateCard[0]?.rateType === 'PER_TRIP' ? 'trip' : 'km'}
                    </span>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          <span>Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-text disabled:opacity-50" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="mr-1 inline-block h-4 w-4" />Previous</button>
            <span className="rounded-lg bg-gray-50 px-3 py-1.5 font-semibold text-text">Page {currentPage} of {totalPages}</span>
            <button className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-text disabled:opacity-50" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next <ChevronRight className="ml-1 inline-block h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}
