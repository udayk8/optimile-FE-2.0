import { useMemo, useState } from 'react'
import { ArrowRight, Banknote, CheckCircle2, ChevronLeft, ChevronRight, Search, Star } from 'lucide-react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@vendor/components/ui/dialog'
import { useAppStore } from '@vendor/stores/app.store'

type DiscountingStatus = 'ELIGIBLE' | 'SUBMITTED' | 'APPROVED' | 'DISBURSED'

const PAGE_SIZE = 6

const PARTNERS = [
  { id: 'nbfc-1', name: 'FinEdge Capital', advancePercentage: 85, interestRate: 12.5, processingTime: '24h', rating: 4.9 },
  { id: 'nbfc-2', name: 'Prime Credit', advancePercentage: 82, interestRate: 13.2, processingTime: '36h', rating: 4.8 },
  { id: 'nbfc-3', name: 'Axis Finance', advancePercentage: 80, interestRate: 11.9, processingTime: '48h', rating: 4.7 },
  { id: 'nbfc-4', name: 'Tata Capital', advancePercentage: 83, interestRate: 12.1, processingTime: '30h', rating: 4.6 },
]

const STATUS_BADGE: Record<DiscountingStatus, string> = {
  ELIGIBLE: 'bg-emerald-50 text-emerald-700',
  SUBMITTED: 'bg-blue-50 text-blue-700',
  APPROVED: 'bg-amber-50 text-amber-700',
  DISBURSED: 'bg-violet-50 text-violet-700',
}

const STATUS_STEPS: DiscountingStatus[] = ['ELIGIBLE', 'SUBMITTED', 'APPROVED', 'DISBURSED']

export default function BillDiscountingPage() {
  const { invoices, nbfcApplications, submitNbfcApplication, markNbfcApplicationStatus } = useAppStore()

  const [statusFilter, setStatusFilter] = useState<'ALL' | DiscountingStatus>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Partner select modal
  const [partnerModalInvoiceId, setPartnerModalInvoiceId] = useState<string | null>(null)
  // Apply confirmation modal
  const [applyModal, setApplyModal] = useState<{ invoiceId: string; partnerId: string } | null>(null)
  const [agreed, setAgreed] = useState(false)
  // Detail / advance modal
  const [detailModalInvoiceId, setDetailModalInvoiceId] = useState<string | null>(null)

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
          status,
          partner: app?.partnerName,
          partnerAdvance: app ? app.advanceAmount : 0,
          netDisbursement: app ? app.netDisbursement : 0,
          appRef: app?.referenceNumber,
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
    approved: rows.filter((r) => r.status === 'APPROVED').length,
    disbursed: rows.filter((r) => r.status === 'DISBURSED').reduce((s, r) => s + r.netDisbursement, 0),
  }), [rows])

  // Derive state for apply modal
  const applyInvoice = invoices.find((inv) => inv.id === applyModal?.invoiceId)
  const applyPartner = PARTNERS.find((p) => p.id === applyModal?.partnerId)
  const applyAmount = applyInvoice?.grandTotal ?? 0
  const applyAdvance = applyPartner ? Math.round((applyAmount * applyPartner.advancePercentage) / 100) : 0
  const applyCharges = applyPartner ? Math.round((applyAdvance * applyPartner.interestRate) / 1200) : 0
  const applyNet = applyAdvance - applyCharges

  // Detail modal state
  const detailRow = rows.find((r) => r.id === detailModalInvoiceId)
  const detailApp = nbfcApplications.find((a) => a.invoiceId === detailModalInvoiceId)

  const handleApply = () => {
    if (!applyModal || !applyInvoice || !applyPartner) return
    submitNbfcApplication({
      invoiceId: applyInvoice.id,
      invoiceNumber: applyInvoice.invoiceNumber ?? applyInvoice.id,
      customerName: applyInvoice.invoiceNumber ?? applyInvoice.id,
      partnerId: applyPartner.id,
      partnerName: applyPartner.name,
      advanceAmount: applyAdvance,
      charges: applyCharges,
      netDisbursement: applyNet,
    })
    setApplyModal(null)
    setAgreed(false)
  }

  const handleAdvance = () => {
    if (!detailModalInvoiceId || !detailRow) return
    if (detailRow.status === 'SUBMITTED') markNbfcApplicationStatus(detailModalInvoiceId, 'APPROVED')
    else if (detailRow.status === 'APPROVED') markNbfcApplicationStatus(detailModalInvoiceId, 'DISBURSED')
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
          <p className="text-sm font-medium text-gray-500">In Progress</p>
          <p className="mt-2 text-2xl font-semibold text-text">{summary.submitted + summary.approved}</p>
          <p className="mt-1 text-xs text-gray-500">applications</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Approved</p>
          <p className="mt-2 text-2xl font-semibold text-text">{summary.approved}</p>
          <p className="mt-1 text-xs text-gray-500">pending disbursement</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Disbursed</p>
          <p className="mt-2 text-2xl font-semibold text-text">₹{summary.disbursed.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-text">Invoices</h3>
          <div className="flex flex-wrap items-center gap-3">
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

        {/* Status filter */}
        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-5 py-3">
          {(['ALL', 'ELIGIBLE', 'SUBMITTED', 'APPROVED', 'DISBURSED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-bold">Invoice</th>
                <th className="px-5 py-3 font-bold">Amount</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Partner</th>
                <th className="px-5 py-3 font-bold">Net Disbursement</th>
                <th className="px-5 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">No invoices found.</td>
                </tr>
              )}
              {paged.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="font-mono text-sm font-semibold text-text">{row.id}</div>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-text">₹{row.amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{row.partner ?? '—'}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-blue-600">
                    {row.netDisbursement > 0 ? `₹${row.netDisbursement.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {row.status === 'ELIGIBLE' ? (
                      <Button size="sm" variant="outline" onClick={() => setPartnerModalInvoiceId(row.id)}>
                        Apply
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setDetailModalInvoiceId(row.id)}>
                        View
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

      {/* Partner selection modal */}
      <Dialog open={Boolean(partnerModalInvoiceId)} onOpenChange={(open) => !open && setPartnerModalInvoiceId(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Select NBFC Partner</DialogTitle>
            <DialogDescription>Choose a financing partner for invoice {partnerModalInvoiceId}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {PARTNERS.map((partner) => (
              <div key={partner.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text">{partner.name}</span>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-3 w-3 fill-current" />
                      <span className="text-xs font-semibold text-gray-700">{partner.rating}</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Up to {partner.advancePercentage}% advance · {partner.interestRate}% p.a. · {partner.processingTime}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setApplyModal({ invoiceId: partnerModalInvoiceId!, partnerId: partner.id })
                    setPartnerModalInvoiceId(null)
                    setAgreed(false)
                  }}
                >
                  Select
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply confirmation modal */}
      <Dialog open={Boolean(applyModal)} onOpenChange={(open) => { if (!open) { setApplyModal(null); setAgreed(false) } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Confirm Application</DialogTitle>
            <DialogDescription>{applyPartner?.name} · Invoice {applyModal?.invoiceId}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-xl bg-gray-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice amount</span>
              <span className="font-semibold text-text">₹{applyAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Advance ({applyPartner?.advancePercentage}%)</span>
              <span className="font-semibold text-emerald-600">₹{applyAdvance.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Charges ({applyPartner?.interestRate}% p.a.)</span>
              <span className="font-semibold text-red-500">₹{applyCharges.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-3">
              <span className="font-semibold text-gray-700">Net disbursement</span>
              <span className="font-bold text-blue-600">₹{applyNet.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <label className="flex items-start gap-3 text-sm text-gray-600">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
            I authorise {applyPartner?.name} to recover the invoice amount from the client.
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApplyModal(null); setAgreed(false) }}>Cancel</Button>
            <Button disabled={!agreed} onClick={handleApply}>Submit Application</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / status modal */}
      <Dialog open={Boolean(detailModalInvoiceId)} onOpenChange={(open) => !open && setDetailModalInvoiceId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>{detailRow?.id} · {detailRow?.partner}</DialogDescription>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-4">
              <div className="space-y-2.5 rounded-xl bg-gray-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice amount</span>
                  <span className="font-semibold text-text">₹{detailRow.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Advance</span>
                  <span className="font-semibold text-emerald-600">₹{detailRow.partnerAdvance.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Net disbursement</span>
                  <span className="font-semibold text-blue-600">₹{detailRow.netDisbursement.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Status steps */}
              <div className="flex items-center gap-1">
                {STATUS_STEPS.map((step, i) => {
                  const stepIndex = STATUS_STEPS.indexOf(detailRow.status)
                  const done = i <= stepIndex
                  return (
                    <div key={step} className="flex flex-1 flex-col items-center gap-1">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{step}</span>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className="absolute" />
                      )}
                    </div>
                  )
                })}
              </div>

              {detailApp?.appliedAt && (
                <p className="text-xs text-gray-500">Applied: {new Date(detailApp.appliedAt).toLocaleDateString('en-GB')}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalInvoiceId(null)}>Close</Button>
            {detailRow && detailRow.status !== 'DISBURSED' && detailRow.status !== 'ELIGIBLE' && (
              <Button onClick={() => { handleAdvance(); setDetailModalInvoiceId(null) }}>
                {detailRow.status === 'SUBMITTED' ? 'Mark Approved' : 'Mark Disbursed'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
