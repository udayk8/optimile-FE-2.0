import { useMemo, useState } from 'react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDate } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { ArrowRight, ChevronLeft, ChevronRight, Filter, MessageSquareWarning, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type DisputeStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'

const DISPUTE_STATUS_MOCK: Record<string, DisputeStatus> = {}

const STATUS_FILTERS: Array<'ALL' | DisputeStatus> = ['ALL', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED']

const REJECTION_REASONS: Record<string, string> = {
  default: 'Invoice rejected by shipper',
}

const PAGE_SIZE = 6

const statusLabel = (s: DisputeStatus) => s.replace('_', ' ')

function getDisputeStatus(invoiceId: string): DisputeStatus {
  return DISPUTE_STATUS_MOCK[invoiceId] ?? 'OPEN'
}

export default function DisputesHubPage() {
  const navigate = useNavigate()
  const invoices = useAppStore((state) => state.invoices)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | DisputeStatus>('ALL')
  const [page, setPage] = useState(1)

  const rejectedInvoices = useMemo(() => invoices.filter((inv) => inv.status === 'REJECTED'), [invoices])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rejectedInvoices.filter((inv) => {
      const disputeStatus = getDisputeStatus(inv.id)
      const matchesStatus = statusFilter === 'ALL' || disputeStatus === statusFilter
      const matchesSearch = query
        ? [inv.id, inv.invoiceNumber, inv.vendorGstin, inv.customerGstin].some((v) =>
            v?.toLowerCase().includes(query),
          )
        : true
      return matchesStatus && matchesSearch
    })
  }, [rejectedInvoices, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const openCount = rejectedInvoices.filter((inv) => getDisputeStatus(inv.id) === 'OPEN').length
  const inReviewCount = rejectedInvoices.filter((inv) => getDisputeStatus(inv.id) === 'IN_REVIEW').length
  const resolvedCount = rejectedInvoices.filter((inv) => ['RESOLVED', 'CLOSED'].includes(getDisputeStatus(inv.id))).length
  const totalDisputedAmount = rejectedInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0)

  return (
    <div className="space-y-6">
      <HeroCard
        eyebrow="SUPPORT"
        title="Disputes"
        subtitle="Contest rejected invoices, track dispute threads, and communicate with the shipper to resolve deductions"
        icon={<MessageSquareWarning className="h-6 w-6 text-primary" />}
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Open', value: openCount, note: 'Newly raised, awaiting shipper acknowledgement.' },
          { label: 'In Review', value: inReviewCount, note: 'Shipper is reviewing the dispute.' },
          { label: 'Resolved', value: resolvedCount, note: 'Closed or settled disputes.' },
          { label: 'Disputed Amount', value: <CurrencyDisplay amount={totalDisputedAmount} className="text-3xl font-semibold tracking-tight text-text" />, note: 'Total value of all rejected invoices.' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">{item.label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-text">{item.value}</div>
            <div className="mt-2 text-sm text-gray-500">{item.note}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text">Dispute Workspace</h3>
            <p className="mt-1 text-sm text-gray-500">All rejected invoices. Raise a dispute to contest rejections with the shipper.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search invoice, GSTIN"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-white sm:w-[280px]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-6 py-4">
          <div className="mr-2 inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Filter className="h-4 w-4" />
            Status
          </div>
          {STATUS_FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => {
                setStatusFilter(item)
                setPage(1)
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                statusFilter === item ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item === 'ALL' ? 'All' : statusLabel(item as DisputeStatus)}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {pageItems.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={<MessageSquareWarning className="h-12 w-12" />}
                title="No disputes found"
                description="Rejected invoices will appear here. Raise a dispute to contest a rejection."
              />
            </div>
          ) : (
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Invoice</th>
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold">Due Date</th>
                  <th className="px-5 py-3 font-bold">Bookings</th>
                  <th className="px-5 py-3 font-bold">Dispute Status</th>
                  <th className="px-5 py-3 font-bold">Rejection Reason</th>
                  <th className="px-5 py-3 text-right font-bold">Amount</th>
                  <th className="px-5 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageItems.map((inv) => {
                  const disputeStatus = getDisputeStatus(inv.id)
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <MessageSquareWarning className="h-4 w-4 text-rose-500" />
                          <span className="font-mono text-sm font-semibold text-text">{inv.invoiceNumber || inv.id}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          <StatusBadge status={inv.status} />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-text">{formatDate(inv.invoiceDate)}</td>
                      <td className="px-5 py-4 text-sm text-text">{formatDate(inv.paymentDueDate)}</td>
                      <td className="px-5 py-4 text-sm text-text">{inv.lineItems?.length || 0}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-text">{statusLabel(disputeStatus)}</td>
                      <td className="px-5 py-4 max-w-[220px] text-sm text-gray-600">
                        {REJECTION_REASONS[inv.id] ?? REJECTION_REASONS.default}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-text">
                        <CurrencyDisplay amount={inv.grandTotal} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/disputes/${inv.id}`)}>
                            View Thread
                          </Button>
                          {disputeStatus === 'OPEN' && (
                            <Button size="sm" onClick={() => navigate(`/vendor/disputes/${inv.id}`)}>
                              Raise Dispute
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
            <span>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="rounded-lg bg-gray-50 px-3 py-2 font-semibold text-text">
                Page {safePage} of {totalPages}
              </span>
              <Button variant="outline" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
