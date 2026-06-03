import { useMemo, useState } from 'react'
import { CalendarDays, Download, FileSpreadsheet } from 'lucide-react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { useAppStore } from '@vendor/stores/app.store'
import { rowShadeClass } from '@vendor/components/shared/DataSourceLegend'
import type { LedgerEntry, LedgerType } from '@vendor/types'

type LedgerTab = LedgerType

const ENTRY_TYPE_LABEL: Record<string, string> = {
  INVOICE_APPROVED: 'Invoice Approved',
  CUSTOMER_PAYMENT: 'Customer Payment',
  TDS_DEDUCTION: 'TDS Deduction',
  CUSTOMER_ADJUSTMENT: 'Customer Adjustment',
  NBFC_FINANCING_APPROVED: 'NBFC Financing Approved',
  NBFC_DISBURSEMENT: 'NBFC Advance Received',
  NBFC_CHARGE: 'NBFC Charge',
  NBFC_REPAYMENT: 'Repaid to NBFC',
  NBFC_ADJUSTMENT: 'NBFC Adjustment',
}

function formatBalance(balance: number, tab: LedgerTab) {
  if (balance === 0) return '₹0'
  return `₹${balance.toLocaleString('en-IN')} ${tab === 'CUSTOMER' ? 'Dr' : 'Cr'}`
}

export default function LedgerPage() {
  const [fromDate, setFromDate] = useState('2026-04-01')
  const [toDate, setToDate] = useState('2026-05-31')
  const [invoiceFilter, setInvoiceFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const activeTab: LedgerTab = 'CUSTOMER'
  const [page, setPage] = useState(1)
  const { ledger } = useAppStore()

  const dateFilteredEntries = useMemo(() => {
    return ledger
      .filter((entry) => entry.date >= fromDate && entry.date <= toDate)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [fromDate, toDate, ledger])

  const invoiceOptions = useMemo(() => {
    return Array.from(new Set(dateFilteredEntries.map((entry) => entry.invoiceId))).sort()
  }, [dateFilteredEntries])

  const tabEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    return dateFilteredEntries
      .filter((entry) => entry.ledgerType === activeTab)
      .filter((entry) => invoiceFilter === 'ALL' || entry.invoiceId === invoiceFilter)
      .filter((entry) => {
        if (!q) return true
        return [entry.invoiceId, entry.referenceNumber ?? '', entry.description, ENTRY_TYPE_LABEL[entry.entryType] ?? entry.entryType]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
  }, [activeTab, dateFilteredEntries, invoiceFilter, search])

  const summary = useMemo(() => {
    const latestByInvoiceLedger = new Map<string, LedgerEntry>()
    const sorted = [...ledger].sort((a, b) => a.date.localeCompare(b.date))
    for (const entry of sorted) {
      latestByInvoiceLedger.set(`${entry.invoiceId}::${entry.ledgerType}`, entry)
    }

    let customerPending = 0
    let customerSettledInvoices = 0
    let customerCollected = 0
    let tdsDeducted = 0

    for (const entry of latestByInvoiceLedger.values()) {
      if (entry.ledgerType === 'CUSTOMER') {
        customerPending += Math.max(0, entry.runningBalance)
        if (entry.runningBalance === 0) customerSettledInvoices += 1
      }
    }

    for (const entry of dateFilteredEntries) {
      if (entry.ledgerType === 'CUSTOMER' && entry.entryType === 'CUSTOMER_PAYMENT') customerCollected += entry.credit
      if (entry.ledgerType === 'CUSTOMER' && entry.entryType === 'TDS_DEDUCTION') tdsDeducted += entry.credit
    }

    return { customerPending, customerSettledInvoices, customerCollected, tdsDeducted }
  }, [ledger, dateFilteredEntries])

  const totalPages = Math.max(1, Math.ceil(tabEntries.length / 10))
  const safePage = Math.min(page, totalPages)
  const pagedEntries = tabEntries.slice((safePage - 1) * 10, safePage * 10)

  const handleRangeChange = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(1)
    setter(event.target.value)
  }

  const handleExport = () => {
    const fileName = `${activeTab === 'CUSTOMER' ? 'customer' : 'nbfc'}-ledger_${fromDate}_${toDate}.csv`
    const header = ['Date', 'Invoice ID', 'Reference', 'Type', 'Description', 'Debit', 'Credit', 'Balance']
    const rows = tabEntries.map((row) => [
      row.date,
      row.invoiceId,
      row.referenceNumber ?? row.id,
      ENTRY_TYPE_LABEL[row.entryType] ?? row.entryType,
      row.description,
      row.debit > 0 ? String(row.debit) : '',
      row.credit > 0 ? String(row.credit) : '',
      formatBalance(row.runningBalance, activeTab),
    ])
    const csv = [header, ...rows].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-stretch xl:justify-between">
            <div className="flex min-h-[176px] flex-1 items-center rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
              <HeroCard
                eyebrow="FINANCE"
                title="Transaction Ledger"
                subtitle="Customer ledger tracks receivable (Dr) across invoices."
                icon={<FileSpreadsheet className="h-6 w-6 text-primary" />}
              />
            </div>

            <div className="flex min-h-[176px] w-full flex-col justify-between rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm xl:max-w-[380px]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text">Date Filter</div>
                  <div className="text-xs text-gray-500">Select range for table and export</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Input value={fromDate} onChange={handleRangeChange(setFromDate)} type="date" />
                <Input value={toDate} onChange={handleRangeChange(setToDate)} type="date" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-gray-100 bg-gray-50/70 px-6 py-5 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">Customer Pending</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-text">₹{summary.customerPending.toLocaleString('en-IN')} Dr</div>
            <div className="mt-2 text-xs text-gray-500">Amount customer still owes across invoices.</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">TDS Deducted (Selected Range)</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-text">₹{summary.tdsDeducted.toLocaleString('en-IN')}</div>
            <div className="mt-2 text-xs text-gray-500">Total TDS posted in current date filter.</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">Customer Settled Invoices</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-text">{summary.customerSettledInvoices}</div>
            <div className="mt-2 text-xs text-gray-500">Invoices with zero customer pending balance.</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text">Ledger entries</h3>
              <p className="mt-1 text-sm text-gray-500">Clean statement view by ledger type.</p>
            </div>
            <Button onClick={handleExport}>
              Export Customer Statement
              <Download className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={invoiceFilter}
              onChange={(e) => { setInvoiceFilter(e.target.value); setPage(1) }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
            >
              <option value="ALL">All Invoices</option>
              {invoiceOptions.map((invoiceId) => (
                <option key={invoiceId} value={invoiceId}>{invoiceId}</option>
              ))}
            </select>

            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search type, description, reference"
              className="max-w-[320px]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Particular</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Type</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Debit</th>
                <th className="p-4 text-right">Credit</th>
                <th className="p-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedEntries.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-gray-500">
                    No {activeTab === 'CUSTOMER' ? 'customer' : 'NBFC'} ledger entries for selected filters.
                  </td>
                </tr>
              )}
              {pagedEntries.map((row) => (
                <tr key={`${row.date}-${row.id}`} className={`hover:bg-gray-50 ${rowShadeClass('MOCK')}`}>
                  <td className="p-4">{new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="p-4 font-mono text-xs font-semibold text-text">{ENTRY_TYPE_LABEL[row.entryType] ?? row.entryType.replace(/_/g, ' ')}</td>
                  <td className="p-4 font-mono text-xs text-gray-500">{row.referenceNumber ?? row.id}</td>
                  <td className="p-4 font-medium text-text">{row.invoiceId}</td>
                  <td className="p-4 text-gray-600">{row.description}</td>
                  <td className="p-4 text-right font-medium text-rose-600">{row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="p-4 text-right font-medium text-emerald-600">{row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="p-4 text-right font-mono">{formatBalance(row.runningBalance, activeTab)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 text-sm text-gray-600">
          <span>
            Showing {tabEntries.length === 0 ? 0 : (safePage - 1) * 10 + 1}-{Math.min(safePage * 10, tabEntries.length)} of {tabEntries.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-text disabled:opacity-50"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <span className="rounded-lg bg-gray-50 px-3 py-1.5 font-semibold text-text">
              Page {safePage} of {totalPages}
            </span>
            <button
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-text disabled:opacity-50"
              disabled={safePage === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
