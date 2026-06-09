import { useMemo, useState } from 'react'
import { Banknote, Plus } from 'lucide-react'
import { PageHero } from '@shared-ui/page-hero'
import { Button } from '@shared-ui/button'
import { Input } from '@shared-ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@vendor/components/ui/dialog'
import { useAppStore } from '@vendor/stores/app.store'
import { formatDateTime } from '@vendor/lib/date-utils'
import type { CustomerLedgerEntryType, PaymentKind } from '@vendor/types'

const PAGE_SIZE = 8

type LedgerEntryInputType = CustomerLedgerEntryType

const KIND_LABEL: Record<PaymentKind, string> = {
  CUSTOMER_PAYMENT: 'Customer Payment',
  TDS_DEDUCTION: 'TDS Deduction',
  NBFC_DISBURSEMENT: 'NBFC Advance',
  NBFC_REPAYMENT: 'NBFC Repayment',
  NBFC_CHARGE: 'NBFC Charges',
}

const ENTRY_SIDE_LABEL: Record<LedgerEntryInputType, 'Debit' | 'Credit'> = {
  INVOICE_APPROVED: 'Debit',
  CUSTOMER_PAYMENT: 'Credit',
  TDS_DEDUCTION: 'Credit',
  CUSTOMER_ADJUSTMENT: 'Credit',
}


function getPendingAmount(invoiceId: string, ledger: { invoiceId: string; ledgerType: 'CUSTOMER' | 'NBFC'; runningBalance: number; date: string }[]) {
  const entries = ledger
    .filter((e) => e.invoiceId === invoiceId && e.ledgerType === 'CUSTOMER')
    .sort((a, b) => a.date.localeCompare(b.date))
  if (entries.length === 0) return 0
  return entries[entries.length - 1].runningBalance
}

export default function PaymentsPage() {
  const {
    invoices,
    payments,
    ledger,
    postCustomerLedgerEntry,
  } = useAppStore()

  const [page, setPage] = useState(1)
  // Date filter unapplied by default (filters the recorded-payments list).
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchText, setSearchText] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [entryType, setEntryType] = useState<LedgerEntryInputType>('CUSTOMER_PAYMENT')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const rows = useMemo(() =>
    payments
      .map((p) => ({ payment: p, invoice: invoices.find((inv) => inv.id === p.invoiceId) }))
      .filter(({ payment, invoice }) => {
        const d = (payment.paymentDate ?? '').slice(0, 10)
        if (fromDate && d < fromDate) return false
        if (toDate && d > toDate) return false
        const q = searchText.trim().toLowerCase()
        if (q && ![payment.invoiceId, invoice?.invoiceNumber].some((v) => (v ?? '').toLowerCase().includes(q))) return false
        return true
      })
      .sort((a, b) => b.payment.paymentDate.localeCompare(a.payment.paymentDate)),
    [payments, invoices, fromDate, toDate, searchText]
  )

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const enteredAmount = Number(amount) || 0
  const pendingAmount = selectedInvoiceId ? getPendingAmount(selectedInvoiceId, ledger) : 0

  const openModal = () => {
    setSelectedInvoiceId('')
    setEntryType('CUSTOMER_PAYMENT')
    setAmount('')
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setDescription('')
    setError('')
    setOpen(true)
  }

  const handleSubmit = () => {
    if (!selectedInvoiceId) { setError('Select an invoice.'); return }
    if (enteredAmount <= 0) { setError('Enter a valid amount.'); return }
    if (enteredAmount > pendingAmount) {
      setError('Amount exceeds pending balance.')
      return
    }
    if (!description.trim()) {
      setError('Description is required.')
      return
    }

    postCustomerLedgerEntry({
      invoiceId: selectedInvoiceId,
      entryType,
      amount: enteredAmount,
      date: paymentDate,
      description: description.trim(),
      mode: 'BANK',
    })

    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="FINANCE"
        title="Record Payments"
        subtitle="Add paid transaction entries."
        icon={<Banknote className="h-6 w-6 text-primary" />}
        action={<Button variant="outline" onClick={openModal}><Plus className="h-4 w-4" />Record Payment</Button>}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <Input value={searchText} onChange={(e) => { setSearchText(e.target.value); setPage(1) }} placeholder="Search invoice no…" className="w-[220px]" />
        <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} className="w-[160px]" />
        <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} className="w-[160px]" />
        {(fromDate || toDate || searchText) && (
          <Button variant="outline" size="sm" onClick={() => { setFromDate(''); setToDate(''); setSearchText(''); setPage(1) }}>Clear</Button>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-text">Payment history</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Payment ID</th>
                <th className="px-5 py-3 font-semibold">Invoice</th>
                <th className="px-5 py-3 font-semibold">Party</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Recorded At</th>
                <th className="px-5 py-3 font-semibold">Transaction Type</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedRows.map(({ payment }) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-sm font-semibold text-text">{payment.id}</td>
                  <td className="px-5 py-4 font-mono text-sm text-gray-700">{payment.invoiceId}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{payment.paymentKind === 'NBFC_REPAYMENT' || payment.paymentKind === 'NBFC_CHARGE' || payment.paymentKind === 'NBFC_DISBURSEMENT' ? 'NBFC' : 'Customer'}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{payment.paymentDate}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{formatDateTime(payment.recordedAt ?? payment.createdAt)}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{KIND_LABEL[payment.paymentKind]}</td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-text">₹{(payment.cashAmount + payment.tdsAmount).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm text-gray-600">
          <span>Showing {Math.min((safePage - 1) * PAGE_SIZE + 1, rows.length)}-{Math.min(safePage * PAGE_SIZE, rows.length)} of {rows.length}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="font-semibold text-text">{safePage} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Add whether payment is done or pending, and to whom.</DialogDescription>
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
                {invoices.map((inv) => (<option key={inv.id} value={inv.id}>{inv.invoiceNumber}</option>))}
              </select>
            </label>

            <label className="block text-sm font-medium text-text">
              Transaction Type
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as LedgerEntryInputType)}
                className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="CUSTOMER_PAYMENT">Customer Payment</option>
                <option value="TDS_DEDUCTION">TDS Deduction</option>
              </select>
              <div className="mt-1 text-xs text-gray-500">
                Posting side: <span className="font-semibold text-text">{ENTRY_SIDE_LABEL[entryType]}</span>
              </div>
            </label>

            <label className="block text-sm font-medium text-text">
              Amount (₹)
              <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
            </label>

            <label className="block text-sm font-medium text-text">
              Date
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="mt-1" />
            </label>

            <label className="block text-sm font-medium text-text">Description
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" placeholder="Short note" />
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
