import { useMemo, useState } from 'react'
import { Banknote, Plus } from 'lucide-react'
import { PageHero } from '@shared-ui/page-hero'
import { Button } from '@shared-ui/button'
import { Input } from '@shared-ui/input'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@vendor/components/ui/dialog'
import { useAppStore } from '@vendor/stores/app.store'
import type { Invoice, PaymentKind, PaymentRecord } from '@vendor/types'

const PAGE_SIZE = 8

const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  PARTIAL_PAYMENT: 'Partial payment',
  FINAL_PAYMENT: 'Final payment',
  TDS_DEDUCTION: 'TDS deduction',
}

function getInvoicePendingAmount(invoice: Invoice | undefined, payments: PaymentRecord[]) {
  if (!invoice) return 0
  const paid = payments
    .filter((payment) => payment.invoiceId === invoice.id && payment.status === 'POSTED')
    .reduce((sum, payment) => sum + payment.cashAmount + payment.tdsAmount, 0)
  return Math.max(0, invoice.grandTotal - paid)
}

export default function PaymentsPage() {
  const { invoices, payments, recordInvoicePayment } = useAppStore()
  const [page, setPage] = useState(1)
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [form, setForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: '',
    paymentKind: 'PARTIAL_PAYMENT' as PaymentKind,
    referenceNumber: '',
    note: '',
  })
  const [formError, setFormError] = useState('')

  const invoiceById = useMemo(() => new Map(invoices.map((invoice) => [invoice.id, invoice])), [invoices])

  const rows = useMemo(() => {
    return payments
      .map((payment) => {
        const invoice = invoiceById.get(payment.invoiceId)
        return {
          payment,
          invoice,
          pendingAmount: getInvoicePendingAmount(invoice, payments),
        }
      })
      .sort((left, right) => right.payment.paymentDate.localeCompare(left.payment.paymentDate))
  }, [payments, invoiceById])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const selectedInvoice = invoiceById.get(selectedInvoiceId)
  const selectedPendingAmount = getInvoicePendingAmount(selectedInvoice, payments)
  const enteredAmount = Number(form.amount) || 0

  const openRecordModal = (invoiceId?: string) => {
    setSelectedInvoiceId(invoiceId ?? '')
    setForm({
      paymentDate: new Date().toISOString().slice(0, 10),
      amount: '',
      paymentKind: 'PARTIAL_PAYMENT',
      referenceNumber: '',
      note: '',
    })
    setFormError('')
    setRecordModalOpen(true)
  }

  const handleSubmit = () => {
    if (!selectedInvoiceId) {
      setFormError('Select an invoice.')
      return
    }
    if (enteredAmount <= 0) {
      setFormError('Enter an amount.')
      return
    }
    if (enteredAmount > selectedPendingAmount) {
      setFormError('Amount exceeds pending invoice balance.')
      return
    }

    recordInvoicePayment({
      invoiceId: selectedInvoiceId,
      paymentKind: form.paymentKind,
      paymentDate: form.paymentDate,
      cashAmount: form.paymentKind === 'TDS_DEDUCTION' ? 0 : enteredAmount,
      tdsAmount: form.paymentKind === 'TDS_DEDUCTION' ? enteredAmount : 0,
      referenceNumber: form.referenceNumber.trim() || undefined,
      note: form.note.trim() || undefined,
    })

    setRecordModalOpen(false)
  }

  const columns: DataTableColumn<(typeof pagedRows)[number]>[] = [
    {
      key: 'paymentId',
      header: 'Payment ID',
      render: (row) => (
        <div>
          <div className="font-mono text-sm font-semibold text-text">{row.payment.id}</div>
          <div className="text-xs text-gray-500">{row.payment.referenceNumber ?? 'No reference'}</div>
        </div>
      ),
    },
    {
      key: 'invoiceId',
      header: 'Invoice ID',
      render: (row) => <span className="font-mono text-sm text-gray-700">{row.payment.invoiceId}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => new Date(row.payment.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => PAYMENT_KIND_LABEL[row.payment.paymentKind],
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => `₹${row.payment.paymentKind === 'TDS_DEDUCTION' ? row.payment.tdsAmount.toLocaleString('en-IN') : row.payment.cashAmount.toLocaleString('en-IN')}`,
    },
    {
      key: 'pending',
      header: 'Pending After',
      align: 'right',
      render: (row) => `₹${row.pendingAmount.toLocaleString('en-IN')}`,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="FINANCE"
        title="Payments"
        subtitle="Record payments received outside the system. Each entry is linked to an invoice and reduces the pending amount immediately."
        icon={<Banknote className="h-6 w-6 text-primary" />}
        action={<Button variant="outline" onClick={() => openRecordModal()}><Plus className="h-4 w-4" />Record Payment</Button>}
      />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-text">Recorded payments</h3>
            <p className="mt-1 text-sm text-gray-500">Simple log of payment entries.</p>
          </div>
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

      <Dialog open={recordModalOpen} onOpenChange={setRecordModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Enter the amount received outside the system and link it to an invoice id.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-text">
              Invoice ID
              <select
                value={selectedInvoiceId}
                onChange={(event) => {
                  setFormError('')
                  setSelectedInvoiceId(event.target.value)
                }}
                className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="">Select invoice</option>
                {invoices
                  .filter((invoice) => invoice.status !== 'CANCELLED')
                  .map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber}
                    </option>
                  ))}
              </select>
            </label>

            {selectedInvoice && (
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Pending amount</span>
                  <span className="font-semibold text-text">₹{selectedPendingAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">Linked invoice: {selectedInvoice.invoiceNumber}</div>
              </div>
            )}

            <label className="block text-sm font-medium text-text">
              Payment Type
              <select
                value={form.paymentKind}
                onChange={(event) => setForm((current) => ({ ...current, paymentKind: event.target.value as PaymentKind }))}
                className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="PARTIAL_PAYMENT">Partial payment</option>
                <option value="FINAL_PAYMENT">Final payment</option>
                <option value="TDS_DEDUCTION">TDS deduction</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-text">
              Amount
              <Input type="number" min="0" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="mt-1" />
            </label>

            <label className="block text-sm font-medium text-text">
              Payment Date
              <Input type="date" value={form.paymentDate} onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))} className="mt-1" />
            </label>

            <label className="block text-sm font-medium text-text">
              Reference
              <Input value={form.referenceNumber} onChange={(event) => setForm((current) => ({ ...current, referenceNumber: event.target.value }))} className="mt-1" placeholder="UTR / voucher / cheque no." />
            </label>

            <label className="block text-sm font-medium text-text">
              Note
              <textarea
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                className="mt-1 min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                placeholder="Optional note"
              />
            </label>

            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Amount entered</span>
                <span className="font-semibold text-text">₹{enteredAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {formError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
