import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@vendor/hooks/useModuleRoute'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate, formatDateTime } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { useAuctionContractsBridge } from '@vendor/integration/auctionBridge'
import { useManualContractsBridge } from '@vendor/integration/manualContractsBridge'
import { formatLaneDisplay, getContractSourceLabel, getRateTypeLabel } from '@shared-utils'
import { FileText, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Contract, ContractStatus } from '@vendor/types'

const STATUS_FILTERS: { value: ContractStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
]

function laneLabel(contract: Contract): string {
  const { origin, destination } = contract.laneDetails
  if (origin.city && destination.city) return formatLaneDisplay(origin.city, destination.city)
  return contract.laneCode ?? formatLaneDisplay(origin.city, destination.city)
}

export default function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const { id: selectedContractId } = useParams()
  const { contracts: storeContracts } = useAppStore()
  // Cross-module: auction-won contracts (auction-web awards) and manually
  // uploaded contracts (tenant admin CSV uploads), surfaced alongside the
  // local demo contracts.
  const auctionContracts = useAuctionContractsBridge()
  const manualContracts = useManualContractsBridge()
  const contracts = [...manualContracts, ...auctionContracts, ...storeContracts]

  const filtered = contracts.filter((c) => {
    if (c.status === 'DRAFT') return false
    if (selectedContractId && c.id !== selectedContractId) return false
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
    if (search && !c.id.toLowerCase().includes(search.toLowerCase()) && !laneLabel(c).toLowerCase().includes(search.toLowerCase())) return false
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
          <input type="text" placeholder="Search by ID or lane..." value={search} onChange={(e) => setSearch(e.target.value)}
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
            {/* Same outlined-grid look as Tenant Admin → View Contracts. */}
            <table className="w-full min-w-[1100px] text-left">
              <thead className="text-gray-500">
                <tr>
                  {['Contract', 'Source City', 'Destination City', 'Vehicle Type', 'Rate', 'Rate Type', 'Volume', 'Created On', 'Start Date', 'Valid Till', 'Type', 'Status'].map((header) => (
                    <th
                      key={header}
                      className="border-b border-r border-gray-200 bg-gray-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] last:border-r-0"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedContracts.map((contract, index) => (
                  <tr
                  key={contract.id}
                  className={`border-t border-gray-200 transition-colors hover:bg-blue-50/50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}
                >
                  <td className="border-r border-gray-200 px-4 py-3 font-mono text-sm font-semibold text-text">{contract.id}</td>
                  <td className="border-r border-gray-200 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-text">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span>{contract.laneDetails.origin.city || '—'}</span>
                    </div>
                  </td>
                  <td className="border-r border-gray-200 px-4 py-3 text-sm text-text">
                    {contract.laneDetails.destination.city || '—'}
                  </td>
                  <td className="border-r border-gray-200 px-4 py-3 text-sm text-text">{contract.rateCard[0]?.vehicleType ?? '—'}</td>
                  <td className="border-r border-gray-200 px-4 py-3 text-sm text-text">
                    <span className="font-mono">₹{contract.rateCard[0]?.rate?.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="border-r border-gray-200 px-4 py-3 text-sm text-text">{getRateTypeLabel(contract.rateCard[0]?.rateType ?? '')}</td>
                  <td className="border-r border-gray-200 px-4 py-3 text-sm text-text">
                    {contract.volumeAllocation.unit === '%'
                      ? `${contract.volumeAllocation.volume}%`
                      : `${contract.volumeAllocation.volume} ${contract.volumeAllocation.unit}`}
                  </td>
                  <td className="border-r border-gray-200 px-4 py-3 text-sm text-text">
                    {formatDateTime(contract.awardedOn ?? contract.createdAt)}
                  </td>
                  <td className="border-r border-gray-200 px-4 py-3 text-sm text-text">
                    {contract.contractKind === 'SPOT' ? '—' : formatDate(contract.validityFrom)}
                  </td>
                  <td className="border-r border-gray-200 px-4 py-3 text-sm text-text">{formatDate(contract.validityTo)}</td>
                  <td className="border-r border-gray-200 px-4 py-3">
                    {/* Type tells the whole story (Manual / Bulk / Lot / Spot) —
                        the old Source column was redundant with it. */}
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        contract.contractKind === 'SPOT'
                          ? 'bg-amber-50 text-amber-700'
                          : contract.source === 'AUCTION_WIN'
                            ? 'bg-violet-50 text-violet-700'
                            : 'bg-sky-50 text-sky-700'
                      }`}
                    >
                      {contract.contractKind === 'SPOT'
                        ? 'Spot · One-time'
                        : contract.contractKind === 'LOT'
                          ? 'Lot'
                          : contract.contractKind === 'BULK'
                            ? 'Bulk'
                            : 'Manual'}
                    </span>
                    {contract.consumedByBookingId && (
                      <div className="mt-1 text-[11px] text-gray-500">Used in {contract.consumedByBookingId}</div>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={contract.status} /></td>
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
