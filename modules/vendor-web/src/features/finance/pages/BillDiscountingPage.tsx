import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Banknote, ChevronLeft, ChevronRight, Mail, Paperclip, Search } from 'lucide-react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@vendor/components/ui/dialog'
import { useAppStore } from '@vendor/stores/app.store'
import type { NBFCDiscountingStatus } from '@vendor/types'

type DiscountingStatus = 'ELIGIBLE' | 'SUBMITTED' | 'DISBURSED' | 'CANCELLED'

const PAGE_SIZE = 6

const STATUS_BADGE: Record<DiscountingStatus, string> = {
  ELIGIBLE: 'bg-emerald-50 text-emerald-700',
  SUBMITTED: 'bg-blue-50 text-blue-700',
  DISBURSED: 'bg-violet-50 text-violet-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}


export default function BillDiscountingPage() {
  const navigate = useNavigate()
  const { invoices, nbfcApplications, markNbfcApplicationStatus } = useAppStore()

  const [statusFilter, setStatusFilter] = useState<'ALL' | DiscountingStatus>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [detailModalInvoiceId, setDetailModalInvoiceId] = useState<string | null>(null)
  const [statusChange, setStatusChange] = useState<NBFCDiscountingStatus | ''>('')

  const rows = useMemo(() => {
    return invoices
      .filter((inv) => ['APPROVED', 'PAID', 'SUBMITTED'].includes(inv.status) || inv.nbfcDiscountingStatus)
      .map((inv) => {
        const app = nbfcApplications.find((a) => a.invoiceId === inv.id)
        const rawStatus = app?.status ?? (inv.nbfcDiscountingStatus as DiscountingStatus) ?? 'ELIGIBLE'
        const status: DiscountingStatus = (['ELIGIBLE', 'SUBMITTED', 'DISBURSED', 'CANCELLED'] as DiscountingStatus[]).includes(rawStatus as DiscountingStatus)
          ? (rawStatus as DiscountingStatus)
          : 'ELIGIBLE'
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.grandTotal,
          status,
          partner: app?.partnerName,
          partnerAdvance: app?.advanceAmount ?? 0,
          netDisbursement: app?.netDisbursement ?? 0,
        }
      })
  }, [invoices, nbfcApplications])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      const matchStatus = statusFilter === 'ALL' || row.status === statusFilter
      const matchSearch = !q || [row.id, row.partner ?? ''].some((v) => v.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [rows, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const summary = useMemo(() => ({
    eligible: rows.filter((r) => r.status === 'ELIGIBLE').reduce((s, r) => s + r.amount, 0),
    submitted: rows.filter((r) => r.status === 'SUBMITTED').length,
    disbursed: rows.filter((r) => r.status === 'DISBURSED').reduce((s, r) => s + r.netDisbursement, 0),
    cancelled: rows.filter((r) => r.status === 'CANCELLED').length,
  }), [rows])

  const detailRow = rows.find((r) => r.id === detailModalInvoiceId)
  const detailApp = nbfcApplications.find((a) => a.invoiceId === detailModalInvoiceId)

  const openDetail = (invoiceId: string) => {
    setDetailModalInvoiceId(invoiceId)
    setStatusChange('')
  }

  const closeDetail = () => {
    setDetailModalInvoiceId(null)
    setStatusChange('')
  }

  const handleStatusUpdate = () => {
    if (!detailModalInvoiceId || !statusChange) return
    markNbfcApplicationStatus(detailModalInvoiceId, statusChange as Exclude<NBFCDiscountingStatus, 'ELIGIBLE'>)
    closeDetail()
  }

  return (
    <div className="space-y-6">
      <HeroCard
        eyebrow="FINANCE"
        title="Bill Discounting"
        subtitle="Get early payments against approved invoices via NBFC partners."
        icon={<Banknote className="h-6 w-6 text-primary" />}
      />

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Eligible</p>
          <p className="mt-2 text-2xl font-semibold text-text">₹{summary.eligible.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Submitted</p>
          <p className="mt-2 text-2xl font-semibold text-text">{summary.submitted}</p>
          <p className="mt-1 text-xs text-gray-500">pending disbursement</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Disbursed</p>
          <p className="mt-2 text-2xl font-semibold text-text">₹{summary.disbursed.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Cancelled</p>
          <p className="mt-2 text-2xl font-semibold text-text">{summary.cancelled}</p>
          <p className="mt-1 text-xs text-gray-500">applications</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-text">Invoices</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search invoice or partner"
                className="rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-white w-[220px]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-5 py-3">
          {(['ALL', 'ELIGIBLE', 'SUBMITTED', 'DISBURSED', 'CANCELLED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Invoice</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Partner</th>
                <th className="px-5 py-3 font-semibold text-right">Net Disbursement</th>
                <th className="px-5 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">No invoices found.</td></tr>
              )}
              {paged.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-sm font-semibold text-text">{row.id}</td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-text">₹{row.amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{row.partner ?? '—'}</td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-blue-600">
                    {row.netDisbursement > 0 ? `₹${row.netDisbursement.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {row.status === 'ELIGIBLE' ? (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/nbfc/apply/${row.id}/select-partner`)}>
                        Apply <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    ) : row.status !== 'CANCELLED' ? (
                      <Button size="sm" variant="ghost" onClick={() => openDetail(row.id)}>View</Button>
                    ) : (
                      <span className="text-xs text-gray-400">Cancelled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm text-gray-600">
          <span>Showing {Math.min((safePage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-text">{safePage} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      <Dialog open={Boolean(detailModalInvoiceId)} onOpenChange={(open) => { if (!open) closeDetail() }}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              {detailRow?.id} · {detailRow?.partner ?? '—'}
            </DialogDescription>
          </DialogHeader>

          {detailRow && (
            <div className="space-y-5">
              {/* Financial summary */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Financial summary</p>
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-gray-50">
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">Invoice amount</span>
                    <span className="font-semibold text-text">₹{detailRow.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">Advance ({detailApp ? Math.round((detailRow.partnerAdvance / detailRow.amount) * 100) : '—'}%)</span>
                    <span className="font-semibold text-emerald-600">₹{detailRow.partnerAdvance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">Charges</span>
                    <span className="font-semibold text-red-500">
                      {detailApp ? `₹${detailApp.charges.toLocaleString('en-IN')}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm font-semibold">
                    <span className="text-gray-700">Net disbursement</span>
                    <span className="text-blue-600">₹{detailRow.netDisbursement.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Application meta */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Application info</p>
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-gray-50">
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">Reference</span>
                    <span className="font-mono font-semibold text-text">{detailApp?.referenceNumber ?? '—'}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">Applied on</span>
                    <span className="font-semibold text-text">
                      {detailApp?.appliedAt ? new Date(detailApp.appliedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE[detailRow.status]}`}>
                      {detailRow.status}
                    </span>
                  </div>
                  {detailApp?.disbursedAt && (
                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-gray-500">Disbursed on</span>
                      <span className="font-semibold text-text">
                        {new Date(detailApp.disbursedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Attached invoice */}
              {detailApp?.invoiceFileName && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Attached invoice</p>
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <Paperclip className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">{detailApp.invoiceFileName}</span>
                  </div>
                </div>
              )}

              {/* Email sent */}
              {(detailApp?.emailTitle || detailApp?.recipientEmail || detailApp?.emailDescription) && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Email sent</p>
                  <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start gap-2">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 space-y-1.5 text-sm">
                        {detailApp.emailTitle && (
                          <div>
                            <span className="text-xs text-gray-400">Subject</span>
                            <p className="font-semibold text-text">{detailApp.emailTitle}</p>
                          </div>
                        )}
                        {detailApp.recipientEmail && (
                          <div>
                            <span className="text-xs text-gray-400">To</span>
                            <p className="font-semibold text-primary">{detailApp.recipientEmail}</p>
                          </div>
                        )}
                        {detailApp.emailDescription && (
                          <div>
                            <span className="text-xs text-gray-400">Message</span>
                            <p className="mt-0.5 whitespace-pre-wrap text-gray-600">{detailApp.emailDescription}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status change */}
              {detailRow.status !== 'DISBURSED' && detailRow.status !== 'CANCELLED' && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Update status</p>
                  <div className="flex items-center gap-3">
                    <select
                      value={statusChange}
                      onChange={(e) => setStatusChange(e.target.value as NBFCDiscountingStatus | '')}
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:bg-white"
                    >
                      <option value="">— Select new status —</option>
                      {detailRow.status === 'SUBMITTED' && <option value="DISBURSED">DISBURSED</option>}
                      {detailRow.status === 'SUBMITTED' && <option value="CANCELLED">CANCELLED</option>}
                    </select>
                    <Button
                      disabled={!statusChange}
                      onClick={handleStatusUpdate}
                      variant={statusChange === 'CANCELLED' ? 'destructive' : 'default'}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDetail}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
