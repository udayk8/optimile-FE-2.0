import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Banknote, CheckCircle2, ChevronLeft, ChevronRight, Search, ShieldCheck } from 'lucide-react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { useAppStore } from '@vendor/stores/app.store'

type DiscountingStatus = 'ELIGIBLE' | 'SUBMITTED' | 'APPROVED' | 'DISBURSED'

const PAGE_SIZE = 4

export default function BillDiscountingPage() {
  const navigate = useNavigate()
  const { invoices, nbfcApplications } = useAppStore()
  const [statusFilter, setStatusFilter] = useState<'ALL' | DiscountingStatus>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const rows = useMemo(() => {
    return invoices
      .filter((invoice) => invoice.status === 'APPROVED' || invoice.status === 'PAID' || invoice.nbfcDiscountingStatus || invoice.status === 'SUBMITTED')
        .map((invoice) => {
        const application = nbfcApplications.find((item) => item.invoiceId === invoice.id)
        const status: DiscountingStatus = application?.status ?? (invoice.nbfcDiscountingStatus as DiscountingStatus) ?? 'ELIGIBLE'
        const amount = invoice.grandTotal
        const advance = application?.advanceAmount ?? Math.round(amount * 0.85)
        const fee = application ? `₹${application.charges.toLocaleString('en-IN')}` : '1.3%'

        return {
          id: invoice.id,
          customer: application?.customerName ?? invoice.invoiceNumber,
          amount,
          advance,
          charges: application ? `₹${application.charges.toLocaleString('en-IN')}` : '-',
          netDisbursement: application ? `₹${application.netDisbursement.toLocaleString('en-IN')}` : '-',
          status,
          irnVerified: true,
          partner: application?.partnerName,
          applicationRef: application?.referenceNumber,
          appliedAt: application?.appliedAt,
        }
      })
  }, [invoices, nbfcApplications])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'ALL' ? true : row.status === statusFilter
      const matchesSearch = query
        ? [row.id, row.customer, row.partner ?? '', row.applicationRef ?? ''].some((value) => value.toLowerCase().includes(query))
        : true
      return matchesStatus && matchesSearch
    })
  }, [rows, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const summary = useMemo(() => ({
    available: rows.filter((item) => item.status === 'ELIGIBLE').reduce((sum, item) => sum + item.amount, 0),
    submitted: rows.filter((item) => item.status === 'SUBMITTED').reduce((sum, item) => sum + item.advance, 0),
    approved: rows.filter((item) => item.status === 'APPROVED').reduce((sum, item) => sum + item.advance, 0),
    disbursed: rows.filter((item) => item.status === 'DISBURSED').reduce((sum, item) => sum + item.advance, 0),
  }), [rows])

  const badgeClass = (status: DiscountingStatus) => {
    switch (status) {
      case 'ELIGIBLE':
        return 'bg-emerald-50 text-emerald-700'
      case 'SUBMITTED':
        return 'bg-blue-50 text-blue-700'
      case 'APPROVED':
        return 'bg-amber-50 text-amber-700'
      case 'DISBURSED':
        return 'bg-violet-50 text-violet-700'
    }
  }

  return (
    <div className="space-y-6">
      <HeroCard
        eyebrow="FINANCE"
        title="Bill Discounting (NBFC)"
        subtitle="Track discounting against the full invoice value across eligible, submitted, approved, and disbursed states"
        icon={<Banknote className="h-6 w-6 text-primary" />}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Available</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text">₹{summary.available.toLocaleString('en-IN')}</div>
          <div className="mt-2 text-sm text-gray-500">Eligible invoices ready for partner selection.</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Submitted</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text">₹{summary.submitted.toLocaleString('en-IN')}</div>
          <div className="mt-2 text-sm text-gray-500">Applications waiting for NBFC review.</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Approved</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text">₹{summary.approved.toLocaleString('en-IN')}</div>
          <div className="mt-2 text-sm text-gray-500">Invoices approved for disbursement.</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Disbursed</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text">₹{summary.disbursed.toLocaleString('en-IN')}</div>
          <div className="mt-2 text-sm text-gray-500">Funds already credited to vendors.</div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text">Bill Discounting</h3>
            <p className="mt-1 text-sm text-gray-500">Eligible rows can launch partner selection. All other rows open the application details page.</p>
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
                placeholder="Search invoice, customer, partner"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-white sm:w-[280px]"
              />
            </div>
            <Button variant="outline" onClick={() => navigate('/vendor/invoices/list')}>
              Review invoices
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-6 py-4">
          {(['ALL', 'ELIGIBLE', 'SUBMITTED', 'APPROVED', 'DISBURSED'] as const).map((item) => (
            <button
              key={item}
              onClick={() => {
                setStatusFilter(item)
                setPage(1)
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                statusFilter === item ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-bold">Invoice</th>
                <th className="px-5 py-3 font-bold">Customer</th>
                <th className="px-5 py-3 font-bold">Invoice Amount</th>
                <th className="px-5 py-3 font-bold">Advance</th>
                <th className="px-5 py-3 font-bold">Charges</th>
                <th className="px-5 py-3 font-bold">Net Disbursement</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Partner</th>
                <th className="px-5 py-3 font-bold">Reference</th>
                <th className="px-5 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedRows.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="font-mono text-sm font-semibold text-text">{invoice.id}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">{invoice.irnVerified ? 'IRN verified' : 'IRN pending'}</div>
                  </td>
                  <td className="px-5 py-4 text-sm text-text">{invoice.customer}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-text">₹{invoice.amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-emerald-600">₹{invoice.advance.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-red-600">{invoice.charges}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-blue-600">{invoice.netDisbursement}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${badgeClass(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-text">{invoice.partner ?? '—'}</td>
                  <td className="px-5 py-4 text-sm text-text">{invoice.applicationRef ?? '—'}</td>
                  <td className="px-5 py-4 text-right">
                    {invoice.status === 'ELIGIBLE' ? (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/nbfc/apply/${invoice.id}/select-partner`)}>
                        Select Partner
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/vendor/nbfc/apply/${invoice.id}/view`)}>
                        View Details
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
          <span>
            Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="rounded-lg bg-gray-50 px-3 py-2 font-semibold text-text">
              Page {safePage} of {totalPages}
            </span>
            <Button variant="outline" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Eligibility</div>
          <div className="mt-1 text-sm font-semibold text-text">IRN verified and approved invoices only</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lifecycle</div>
          <div className="mt-1 text-sm font-semibold text-text">Eligible → Submitted → Approved → Disbursed</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Security</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-text">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Auto-attached documents
          </div>
        </div>
      </div>
    </div>
  )
}
