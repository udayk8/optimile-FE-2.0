import { useMemo, useState } from 'react'
import { Banknote, Plus } from 'lucide-react'
import { PageHero } from '@shared-ui/page-hero'
import { Button } from '@shared-ui/button'
import { Input } from '@shared-ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@vendor/components/ui/dialog'
import { useAppStore } from '@vendor/stores/app.store'
import type { Invoice, PaymentKind, PaymentRecord } from '@vendor/types'

const PAGE_SIZE = 8

const COLUMN_OPTIONS = [
  { key: 'paymentId', label: 'Payment ID' },
  { key: 'invoice', label: 'Invoice' },
  { key: 'date', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Amount' },
  { key: 'reference', label: 'Reference' },
]

const KIND_LABEL: Record<PaymentKind, string> = {
  PARTIAL_PAYMENT: 'Partial',
  FINAL_PAYMENT: 'Final',
  TDS_DEDUCTION: 'TDS',
}

const KIND_BADGE: Record<PaymentKind, string> = {
  PARTIAL_PAYMENT: 'bg-blue-50 text-blue-700',
  FINAL_PAYMENT: 'bg-emerald-50 text-emerald-700',
  TDS_DEDUCTION: 'bg-amber-50 text-amber-700',
}

function getPendingAmount(invoice: Invoice | undefined, payments: PaymentRecord[]) {
  if (!invoice) return 0
  const paid = payments
    .filter((p) => p.invoiceId === invoice.id && p.status === 'POSTED')
    .reduce((s, p) => s + p.cashAmount + p.tdsAmount, 0)
  return Math.max(0, invoice.grandTotal - paid)
}

export default function PaymentsPage() {
  const { invoices, payments, recordInvoicePayment } = useAppStore()
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentKind, setPaymentKind] = useState<PaymentKind>('PARTIAL_PAYMENT')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')

  const invoiceById = useMemo(() => new Map(invoices.map((inv) => [inv.id, inv])), [invoices])

  const rows = useMemo(() =>
    payments
      .map((p) => ({ payment: p, invoice: invoiceById.get(p.invoiceId) }))
      .sort((a, b) => b.payment.paymentDate.localeCompare(a.payment.paymentDate)),
    [payments, invoiceById]
  )

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const selectedInvoice = invoiceById.get(selectedInvoiceId)
  const pendingAmount = getPendingAmount(selectedInvoice, payments)
  const enteredAmount = Number(amount) || 0

  const openModal = () => {
    setSelectedInvoiceId('')
    setAmount('')
    setPaymentKind('PARTIAL_PAYMENT')
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setReference('')
    setError('')
    setOpen(true)
  }

  const handleSubmit = () => {
    if (!selectedInvoiceId) { setError('Select an invoice.'); return }
    if (enteredAmount <= 0) { setError('Enter a valid amount.'); return }
    if (paymentKind !== 'TDS_DEDUCTION' && enteredAmount > pendingAmount) {
      setError('Amount exceeds pending balance.')
      return
    }
    recordInvoicePayment({
      invoiceId: selectedInvoiceId,
      paymentKind,
      paymentDate,
      cashAmount: paymentKind === 'TDS_DEDUCTION' ? 0 : enteredAmount,
      tdsAmount: paymentKind === 'TDS_DEDUCTION' ? enteredAmount : 0,
      referenceNumber: reference.trim() || undefined,
    })
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="FINANCE"
        title="Payments"
        subtitle="Record payments received against invoices."
        icon={<Banknote className="h-6 w-6 text-primary" />}
        action={<Button variant="outline" onClick={openModal}><Plus className="h-4 w-4" />Record Payment</Button>}
      />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-base font-semibold text-text">Payment history</h3>
              <p className="mt-0.5 text-sm text-gray-500">{rows.length} payment{rows.length !== 1 ? 's' : ''} recorded</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Payment ID</th>
                <th className="px-5 py-3 font-semibold">Invoice</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                <th className="px-5 py-3 font-semibold">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedRows.length === 0 && (
                <tr><td colSpan={COLUMN_OPTIONS.length} className="px-5 py-8 text-center text-sm text-gray-500">No payments recorded yet.</td></tr>
              )}
              {pagedRows.map(({ payment }) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-sm font-semibold text-text">{payment.id}</td>
                  <td className="px-5 py-4 font-mono text-sm text-gray-700">{payment.invoiceId}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {new Date(payment.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${KIND_BADGE[payment.paymentKind]}`}>
                      {KIND_LABEL[payment.paymentKind]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-text">
                    ₹{(payment.paymentKind === 'TDS_DEDUCTION' ? payment.tdsAmount : payment.cashAmount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">{payment.referenceNumber ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm text-gray-600">
          <span>Showing {Math.min((safePage - 1) * PAGE_SIZE + 1, rows.length)}–{Math.min(safePage * PAGE_SIZE, rows.length)} of {rows.length}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="font-semibold text-text">{safePage} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Link a payment to an invoice. Balance updates immediately.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-text">
              Invoice
              <select
                value={selectedInvoiceId}
                onChange={(e) => { setError(''); setSelectedInvoiceId(e.target.value) }}
                className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="">Select invoice</option>
                {invoices
                  .filter((inv) => inv.status !== 'CANCELLED')
                  .map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNumber}</option>
                  ))}
              </select>
            </label>

            {selectedInvoice && (
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5 text-sm">
                <span className="text-gray-500">Pending balance</span>
                <span className="font-semibold text-text">₹{pendingAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <label className="block text-sm font-medium text-text">
              Payment Type
              <select
                value={paymentKind}
                onChange={(e) => setPaymentKind(e.target.value as PaymentKind)}
                className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="PARTIAL_PAYMENT">Partial Payment</option>
                <option value="FINAL_PAYMENT">Final Payment</option>
                <option value="TDS_DEDUCTION">TDS Deduction</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-text">
              Amount (₹)
              <Input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
                placeholder="Enter amount"
              />
            </label>

            <label className="block text-sm font-medium text-text">
              Payment Date
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="mt-1" />
            </label>

            <label className="block text-sm font-medium text-text">
              Reference <span className="font-normal text-gray-400">(UTR / voucher no.)</span>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1"
                placeholder="Optional"
              />
            </label>

            {error && <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
