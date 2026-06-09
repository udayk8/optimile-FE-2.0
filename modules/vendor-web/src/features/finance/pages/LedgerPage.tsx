import { useMemo, useState } from 'react'
import { CalendarDays, Download, FileSpreadsheet, Search } from 'lucide-react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { useAppStore } from '@vendor/stores/app.store'
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
  // Date filter is unapplied by default — the full ledger shows until a range is set.
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')
  const activeTab: LedgerTab = 'CUSTOMER'
  const [page, setPage] = useState(1)
  const { ledger } = useAppStore()

  const dateFilteredEntries = useMemo(() => {
    return ledger
      .filter((entry) => (!fromDate || entry.date >= fromDate) && (!toDate || entry.date <= toDate))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [fromDate, toDate, ledger])

  const tabEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    return dateFilteredEntries
      .filter((entry) => entry.ledgerType === activeTab)
      .filter((entry) => {
        if (!q) return true
        return [entry.invoiceId, entry.referenceNumber ?? '', entry.description, ENTRY_TYPE_LABEL[entry.entryType] ?? entry.entryType]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
  }, [activeTab, dateFilteredEntries, search])

  // All summary cards reflect the active date filter — computed from the
  // date-filtered entries, not the full ledger history.
  const summary = useMemo(() => {
    const latestByInvoiceLedger = new Map<string, LedgerEntry>()
    for (const entry of dateFilteredEntries) {
      latestByInvoiceLedger.set(`${entry.invoiceId}::${entry.ledgerType}`, entry)
    }

    let customerPending = 0
    let customerSettledInvoices = 0
    let customerPendingInvoices = 0
    let customerCollected = 0
    let tdsDeducted = 0
    let totalAmountPaid = 0

    for (const entry of latestByInvoiceLedger.values()) {
      if (entry.ledgerType === 'CUSTOMER') {
        customerPending += Math.max(0, entry.runningBalance)
        if (entry.runningBalance === 0) customerSettledInvoices += 1
        else if (entry.runningBalance > 0) customerPendingInvoices += 1
      }
    }

    for (const entry of dateFilteredEntries) {
      if (entry.ledgerType === 'CUSTOMER' && entry.entryType === 'CUSTOMER_PAYMENT') {
        customerCollected += entry.credit
        totalAmountPaid += entry.credit
      }
      if (entry.ledgerType === 'CUSTOMER' && entry.entryType === 'TDS_DEDUCTION') tdsDeducted += entry.credit
    }

    return { customerPending, customerSettledInvoices, customerPendingInvoices, customerCollected, tdsDeducted, totalAmountPaid }
  }, [dateFilteredEntries])

  // True running balance for the statement: accumulate Debit − Credit across
  // the date-ordered entries so the Balance column adds up across invoices,
  // rather than showing each entry's stored per-invoice balance.
  const balanceByEntryId = useMemo(() => {
    const ordered = [...tabEntries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    const map = new Map<string, number>()
    let balance = 0
    for (const entry of ordered) {
      balance += entry.debit - entry.credit
      map.set(entry.id, balance)
    }
    return map
  }, [tabEntries])

  const totalPages = Math.max(1, Math.ceil(tabEntries.length / 10))
  const safePage = Math.min(page, totalPages)
  const pagedEntries = tabEntries.slice((safePage - 1) * 10, safePage * 10)


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
      formatBalance(balanceByEntryId.get(row.id) ?? row.runningBalance, activeTab),
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
            <HeroCard
              eyebrow="FINANCE"
              title="Transaction Ledger"
              subtitle="Customer ledger tracks receivable (Dr) across invoices."
              icon={<FileSpreadsheet className="h-6 w-6 text-primary" />}
            />
            <div className="flex flex-wrap items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gray-400" />
              <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} className="h-10 w-[150px] rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-primary" />
              <span className="text-xs text-gray-400">to</span>
              <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} className="h-10 w-[150px] rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-primary" />
              {(fromDate || toDate) && (
                <Button variant="outline" size="sm" onClick={() => { setFromDate(''); setToDate(''); setPage(1) }}>Clear</Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-gray-100 bg-gray-50/70 px-6 py-5 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500">Invoices Pending Payment</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-text">{summary.customerPendingInvoices}</div>
            <div className="mt-2 text-xs text-gray-500">Invoices with an outstanding customer balance.</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500">Total Amount Paid</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-emerald-600">₹{summary.totalAmountPaid.toLocaleString('en-IN')}</div>
            <div className="mt-2 text-xs text-gray-500">Total customer payments collected across all invoices.</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500">Customer Pending</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-text">₹{summary.customerPending.toLocaleString('en-IN')} Dr</div>
            <div className="mt-2 text-xs text-gray-500">Amount customer still owes across invoices.</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500">TDS Deducted (Selected Range)</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-text">₹{summary.tdsDeducted.toLocaleString('en-IN')}</div>
            <div className="mt-2 text-xs text-gray-500">Total TDS posted in current date filter.</div>
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

          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search type, description, reference"
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
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
                <tr key={`${row.date}-${row.id}`} className="hover:bg-gray-50">
                  <td className="p-4">{new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="p-4 font-mono text-xs font-semibold text-text">{ENTRY_TYPE_LABEL[row.entryType] ?? row.entryType.replace(/_/g, ' ')}</td>
                  <td className="p-4 font-mono text-xs text-gray-500">{row.referenceNumber ?? row.id}</td>
                  <td className="p-4 font-medium text-text">{row.invoiceId}</td>
                  <td className="p-4 text-gray-600">{row.description}</td>
                  <td className="p-4 text-right font-medium text-rose-600">{row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="p-4 text-right font-medium text-emerald-600">{row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="p-4 text-right font-mono">{formatBalance(balanceByEntryId.get(row.id) ?? row.runningBalance, activeTab)}</td>
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
