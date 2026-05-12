import { useMemo, useState } from 'react'
import { Banknote, Plus } from 'lucide-react'
import { PageHero } from '@shared-ui/page-hero'
import { Button } from '@shared-ui/button'
import { Input } from '@shared-ui/input'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@vendor/components/ui/dialog'
import { useAppStore } from '@vendor/stores/app.store'
import type { Invoice, PaymentRecord } from '@vendor/types'

const PAGE_SIZE = 8

function getInvoicePendingAmount(invoice: Invoice | undefined, payments: PaymentRecord[]) {
  if (!invoice) return 0
  const paid = payments
    .filter((p) => p.invoiceId === invoice.id && p.status === 'POSTED')
    .reduce((sum, p) => sum + p.cashAmount + p.tdsAmount, 0)
  return Math.max(0, invoice.grandTotal - paid)
}

export default function PaymentsPage() {
  const { invoices, payments, recordInvoicePayment } = useAppStore()
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
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
  const pendingAmount = getInvoicePendingAmount(selectedInvoice, payments)
  const enteredAmount = Number(amount) || 0

  const openModal = () => {
    setSelectedInvoiceId('')
    setAmount('')
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setReference('')
    setError('')
    setOpen(true)
  }

  const handleSubmit = () => {
    if (!selectedInvoiceId) { setError('Select an invoice.'); return }
    if (enteredAmount <= 0) { setError('Enter a valid amount.'); return }
    if (enteredAmount > pendingAmount) { setError('Amount exceeds pending balance.'); return }

    recordInvoicePayment({
      invoiceId: selectedInvoiceId,
      paymentKind: 'PARTIAL_PAYMENT',
      paymentDate,
      cashAmount: enteredAmount,
      tdsAmount: 0,
      referenceNumber: reference.trim() || undefined,
    })
    setOpen(false)
  }

  const columns: DataTableColumn<(typeof pagedRows)[number]>[] = [
    {
      key: 'id',
      header: 'Payment ID',
      render: (row) => (
        <div>
          <div className="font-mono text-sm font-semibold text-text">{row.payment.id}</div>
          <div className="text-xs text-gray-500">{row.payment.referenceNumber ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'invoice',
      header: 'Invoice',
      render: (row) => <span className="font-mono text-sm text-gray-700">{row.payment.invoiceId}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => new Date(row.payment.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => `₹${row.payment.cashAmount.toLocaleString('en-IN')}`,
    },
  ]

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
          <h3 className="text-lg font-semibold text-text">Payment history</h3>
          <p className="mt-1 text-sm text-gray-500">{rows.length} payment{rows.length !== 1 ? 's' : ''} recorded</p>
        </div>

        <DataTable
          rows={pagedRows}
          columns={columns}
          getRowKey={(row) => row.payment.id}
          emptyState={<div className="p-8 text-sm text-gray-500">No payments recorded yet.</div>}
          pageSize={PAGE_SIZE}
          page={safePage}
          onPageChange={setPage}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Link a payment to an invoice. The balance is reduced immediately.</DialogDescription>
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
                <span className="text-gray-500">Pending</span>
                <span className="font-semibold text-text">₹{pendingAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

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
