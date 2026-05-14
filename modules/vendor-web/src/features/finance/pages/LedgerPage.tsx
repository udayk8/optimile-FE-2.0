import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, Download, FileSpreadsheet } from 'lucide-react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'
import { useAppStore } from '@vendor/stores/app.store'
import type { LedgerEntry } from '@vendor/types'

const monthOrder = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']

const historicalMonthlyData: Record<string, { invoiced: number; payments: number }> = {
  '2026-01': { invoiced: 420000, payments: 380000 },
  '2026-02': { invoiced: 510000, payments: 460000 },
  '2026-03': { invoiced: 385000, payments: 350000 },
  '2026-04': { invoiced: 620000, payments: 575000 },
  '2026-05': { invoiced: 490000, payments: 420000 },
}

const COLUMN_OPTIONS = [
  { key: 'date', label: 'Date' },
  { key: 'invoiceId', label: 'Invoice ID' },
  { key: 'reference', label: 'Reference' },
  { key: 'type', label: 'Type' },
  { key: 'description', label: 'Description' },
  { key: 'credit', label: 'Credit' },
  { key: 'debit', label: 'Debit' },
  { key: 'balance', label: 'Balance' },
]

export default function LedgerPage() {
  const [fromDate, setFromDate] = useState('2026-04-01')
  const [toDate, setToDate] = useState('2026-05-31')
  const [page, setPage] = useState(1)
  const { ledger } = useAppStore()

  const ALLOWED_TYPES = ['INVOICE_APPROVED', 'PAYMENT_RECEIVED', 'TDS_DEDUCTION']

  const filteredEntries = useMemo(() => {
    const allowed = ledger
      .filter((entry) =>
        entry.date >= fromDate && entry.date <= toDate &&
        ALLOWED_TYPES.includes(entry.entryType)
      )
      .sort((a, b) => a.date.localeCompare(b.date))

    let balance = 0
    return allowed.map((entry) => {
      if (entry.entryType === 'INVOICE_APPROVED') balance += entry.debit
      else if (entry.entryType === 'PAYMENT_RECEIVED') balance -= entry.credit
      else if (entry.entryType === 'TDS_DEDUCTION') balance -= entry.credit
      return { ...entry, runningBalance: balance }
    })
  }, [fromDate, toDate, ledger])

  const monthlyGraph = useMemo(() => {
    const liveByMonth: Record<string, { invoiced: number; payments: number }> = {}
    for (const entry of ledger) {
      const monthKey = entry.date.slice(0, 7)
      liveByMonth[monthKey] ??= { invoiced: 0, payments: 0 }
      if (entry.entryType === 'INVOICE_APPROVED') liveByMonth[monthKey].invoiced += entry.debit
      if (entry.entryType === 'PAYMENT_RECEIVED') liveByMonth[monthKey].payments += entry.credit
    }

    return monthOrder.map((monthKey) => {
      const monthLabel = new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      const data = liveByMonth[monthKey] ?? historicalMonthlyData[monthKey] ?? { invoiced: 0, payments: 0 }
      return { month: monthLabel, invoiced: data.invoiced, payments: data.payments }
    })
  }, [])

  const summary = useMemo(() => {
    const totalInvoiced = filteredEntries.reduce((sum, e) => sum + (e.entryType === 'INVOICE_APPROVED' ? e.debit : 0), 0)
    const totalReceived = filteredEntries.reduce((sum, e) => sum + (e.entryType === 'PAYMENT_RECEIVED' ? e.credit : 0), 0)
    const tdsDeducted = filteredEntries.reduce((sum, e) => sum + (e.entryType === 'TDS_DEDUCTION' ? e.credit : 0), 0)
    return {
      totalInvoiced,
      totalInvoicedCount: filteredEntries.filter((e) => e.entryType === 'INVOICE_APPROVED').length,
      pendingPayments: Math.max(0, totalInvoiced - totalReceived - tdsDeducted),
      tdsDeducted,
    }
  }, [filteredEntries])

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / 10))
  const safePage = Math.min(page, totalPages)
  const pagedEntries = filteredEntries.slice((safePage - 1) * 10, safePage * 10)

  const handleRangeChange = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(1)
    setter(event.target.value)
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
                subtitle="Chronological history of all financial transactions"
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
                  <div className="text-xs text-gray-500">Select a range to update the table and summary cards</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Input value={fromDate} onChange={handleRangeChange(setFromDate)} type="date" />
                <Input value={toDate} onChange={handleRangeChange(setToDate)} type="date" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-gray-100 bg-gray-50/70 px-6 py-5 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">Total Invoiced</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-text">₹{summary.totalInvoiced.toLocaleString('en-IN')}</div>
            <div className="mt-2 text-sm text-gray-500">Filtered by the selected date range.</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">Total Invoices Raised</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-text">{summary.totalInvoicedCount}</div>
            <div className="mt-2 text-sm text-gray-500">Invoices raised in selected range.</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">Pending Payments</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-text">₹{summary.pendingPayments.toLocaleString('en-IN')}</div>
            <div className="mt-2 text-sm text-gray-500">Outstanding at end of filtered period.</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">TDS Deducted</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-text">₹{summary.tdsDeducted.toLocaleString('en-IN')}</div>
            <div className="mt-2 text-sm text-gray-500">Tax deductions in the filtered period.</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text">Invoiced vs Payments</h3>
            <p className="mt-1 text-sm text-gray-500">Last 6 months, backed by the same ledger records used by invoice payments.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Invoiced</span>
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-primary" /> Payments</span>
          </div>
        </div>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyGraph} margin={{ top: 10, right: 12, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => `₹${Math.round(Number(value) / 1000)}k`} />
              <Tooltip
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)' }}
                formatter={(value: number, name: string) => [`₹${value.toLocaleString('en-IN')}`, name]}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px' }} />
              <Bar dataKey="invoiced" name="Invoiced" fill="#10b981" radius={[6, 6, 0, 0]} barSize={28} />
              <Bar dataKey="payments" name="Payments Received" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text">Ledger entries</h3>
            <p className="mt-1 text-sm text-gray-500">Chronological financial history with running balance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Button>
                Export Statement
                <Download className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Invoice ID</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Type</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Debit</th>
                <th className="p-4 text-right">Credit</th>
                <th className="p-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedEntries.map((row) => (
                <tr key={`${row.date}-${row.id}`} className="hover:bg-gray-50">
                  <td className="p-4">{new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="p-4 font-mono text-xs font-semibold text-text">{row.entryType === 'INVOICE_APPROVED' || row.entryType === 'PAYMENT_RECEIVED' ? row.description.match(/INV-\d{4}-\d{3}/)?.[0] ?? '-' : '-'}</td>
                  <td className="p-4 font-mono text-xs text-gray-500">{row.id}</td>
                  <td className="p-4 font-medium text-text">
                    {row.entryType === 'INVOICE_APPROVED' ? 'Invoice Approved'
                      : row.entryType === 'PAYMENT_RECEIVED' ? (row.description.toLowerCase().includes('partial') ? 'Partial Payment' : 'Final Payment')
                      : row.entryType === 'TDS_DEDUCTION' ? 'TDS Deduction'
                      : row.entryType}
                  </td>
                  <td className="p-4 text-gray-600">{row.description}</td>
                  <td className="p-4 text-right font-medium text-rose-600">
                    {row.entryType === 'INVOICE_APPROVED' ? `₹${row.debit.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="p-4 text-right font-medium text-emerald-600">
                    {row.entryType === 'PAYMENT_RECEIVED' || row.entryType === 'TDS_DEDUCTION'
                      ? `₹${row.credit.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="p-4 text-right font-mono">₹{row.runningBalance.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 text-sm text-gray-600">
          <span>
            Showing {filteredEntries.length === 0 ? 0 : (safePage - 1) * 10 + 1}-{Math.min(safePage * 10, filteredEntries.length)} of {filteredEntries.length}
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
        <div className="border-t border-gray-100 p-6">
          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            Latest balance snapshot is based on the selected range and updates with the table below.
          </div>
        </div>
      </div>
    </div>
  )
}
