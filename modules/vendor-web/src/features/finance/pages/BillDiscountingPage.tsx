import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Banknote, Search } from 'lucide-react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { useAppStore } from '@vendor/stores/app.store'
import type { NBFCDiscountingStatus } from '@vendor/types'

type DiscountingStatus = 'ELIGIBLE' | Exclude<NBFCDiscountingStatus, 'ELIGIBLE'>

const STATUS_BADGE: Record<DiscountingStatus, string> = {
  ELIGIBLE: 'bg-emerald-50 text-emerald-700',
  SUBMITTED: 'bg-blue-50 text-blue-700',
  APPROVED: 'bg-violet-50 text-violet-700',
  DISBURSED: 'bg-violet-50 text-violet-700',
  REJECTED: 'bg-rose-50 text-rose-700',
}

const STATUS_LABEL: Record<DiscountingStatus, string> = {
  ELIGIBLE: 'Eligible',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  DISBURSED: 'Approved',
  REJECTED: 'Rejected',
}

export default function BillDiscountingPage() {
  const navigate = useNavigate()
  const { invoices, nbfcApplications } = useAppStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | DiscountingStatus>('ALL')

  const rows = useMemo(() => {
    return invoices
      .filter((inv) => ['APPROVED', 'PAID', 'SUBMITTED'].includes(inv.status) || inv.nbfcDiscountingStatus)
      .map((inv) => {
        const app = nbfcApplications.find((a) => a.invoiceId === inv.id)
        const status: DiscountingStatus = app?.status ?? (inv.nbfcDiscountingStatus as DiscountingStatus) ?? 'ELIGIBLE'
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.grandTotal,
          partner: app?.partnerName,
          status,
          requestedAmount: app?.requestedAmount ?? 0,
          approvedAmount: app?.approvedAmount ?? 0,
          expectedCharges: app?.charges ?? 0,
          approvedCharges: app?.approvedCharges ?? 0,
          netAmount: app?.netAmount ?? 0,
        }
      })
  }, [invoices, nbfcApplications])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter
      const matchSearch = !q || [r.invoiceNumber, r.partner ?? '', r.status].some((v) => v.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [rows, search, statusFilter])

  const summary = useMemo(() => {
    const eligibleAmount = rows.reduce((sum, r) => sum + r.amount, 0)
    const approvedAmount = rows
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + (r.approvedAmount || 0), 0)
    const approvedCount = rows.filter((r) => r.status === 'APPROVED').length
    return { eligibleAmount, approvedAmount, approvedCount }
  }, [rows])

  return (
    <div className="space-y-6">
      <HeroCard
        eyebrow="FINANCE"
        title="Bill Discounting"
        subtitle="Track invoice receivables and bill discounting applications."
        icon={<Banknote className="h-6 w-6 text-primary" />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Invoices Approved</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text">{summary.approvedCount}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Eligible Amount</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text">₹{summary.eligibleAmount.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Approved Amount</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-violet-700">₹{summary.approvedAmount.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-text">Bill Discounting Applications</h3>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice, partner or status"
              className="w-[260px] rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-white"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-5 py-3">
          {(['ALL', 'ELIGIBLE', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${statusFilter === status ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {status === 'ALL' ? 'All' : STATUS_LABEL[status]}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Invoice</th>
                <th className="px-5 py-3 font-semibold text-right">Invoice Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Partner</th>
                <th className="px-5 py-3 font-semibold text-right">Requested</th>
                <th className="px-5 py-3 font-semibold text-right">Approved</th>
                <th className="px-5 py-3 font-semibold text-right">Expected Charges</th>
                <th className="px-5 py-3 font-semibold text-right">Approved Charges</th>
                <th className="px-5 py-3 font-semibold text-right">Net</th>
                <th className="px-5 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-5 py-8 text-center text-sm text-gray-500">No invoices found.</td></tr>
              )}
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-sm font-semibold text-text">{row.invoiceNumber}</td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-text">₹{row.amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[row.status]}`}>
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{row.partner ?? '—'}</td>
                  <td className="px-5 py-4 text-right text-sm text-gray-700">{row.requestedAmount ? `₹${row.requestedAmount.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-violet-700">{(row.status === 'APPROVED' || row.status === 'DISBURSED') && row.approvedAmount ? `₹${row.approvedAmount.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-5 py-4 text-right text-sm text-gray-700">{row.expectedCharges ? `₹${row.expectedCharges.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-fuchsia-700">{(row.status === 'APPROVED' || row.status === 'DISBURSED') && row.approvedCharges ? `₹${row.approvedCharges.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-blue-600">{(row.status === 'APPROVED' || row.status === 'DISBURSED') && row.netAmount ? `₹${row.netAmount.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-5 py-4 text-right">
                    {row.status === 'ELIGIBLE' ? (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/nbfc/apply/${row.id}/select-partner`)}>
                        Submit <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    ) : row.status === 'SUBMITTED' ? (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/nbfc/apply/${row.id}/view`)}>
                        Action <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/vendor/nbfc/apply/${row.id}/view`)}>View</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
