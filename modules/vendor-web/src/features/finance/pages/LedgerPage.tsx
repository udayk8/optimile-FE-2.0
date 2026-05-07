import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, Download, FileSpreadsheet } from 'lucide-react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { Input } from '@vendor/components/ui/input'

type LedgerEntry = {
  date: string
  ref: string
  type: string
  description: string
  credit: number
  debit: number
  balance: number
}

const ledgerEntries: LedgerEntry[] = [
  { date: '2025-12-18', ref: 'INV-2412-014', type: 'Payment Received', description: 'Year-end settlement posted', credit: 86000, debit: 0, balance: 86000 },
  { date: '2026-01-10', ref: 'INV-2601-021', type: 'Invoice Approved', description: 'January invoice approved', credit: 124000, debit: 0, balance: 210000 },
  { date: '2026-01-22', ref: 'TDS-2026-01', type: 'TDS Deduction', description: 'January tax deduction posted', credit: 0, debit: 9800, balance: 200200 },
  { date: '2026-02-07', ref: 'TDS-2026-02', type: 'TDS Deduction', description: 'Monthly TDS deduction posted', credit: 0, debit: 12400, balance: 197600 },
  { date: '2026-02-11', ref: 'INV-2602-028', type: 'Invoice Approved', description: 'February freight invoice approved', credit: 94000, debit: 0, balance: 291600 },
  { date: '2026-02-18', ref: 'PAY-2602-016', type: 'Payment Received', description: 'Partial payment received for February cycle', credit: 76000, debit: 0, balance: 367600 },
  { date: '2026-02-24', ref: 'PEN-2602-004', type: 'Penalty Deduction', description: 'Delay penalty posted', credit: 0, debit: 6400, balance: 361200 },
  { date: '2026-03-14', ref: 'INV-2603-033', type: 'Payment Received', description: 'March settlement received', credit: 102000, debit: 0, balance: 299600 },
  { date: '2026-03-20', ref: 'INV-2603-041', type: 'Invoice Approved', description: 'March billing approved', credit: 118000, debit: 0, balance: 417600 },
  { date: '2026-03-27', ref: 'TDS-2026-03', type: 'TDS Deduction', description: 'March TDS adjustment posted', credit: 0, debit: 11200, balance: 406400 },
  { date: '2026-04-18', ref: 'ADV-0012', type: 'Advance Adjustment', description: 'Advance recovered against invoice', credit: 0, debit: 25000, balance: 1423500 },
  { date: '2026-04-22', ref: 'INV-2403-098', type: 'Payment Received', description: 'Invoice settled', credit: 98000, debit: 0, balance: 1521500 },
  { date: '2026-04-25', ref: 'PEN-4402', type: 'Penalty Deduction', description: 'SLA penalty adjusted', credit: 0, debit: 9500, balance: 1512000 },
  { date: '2026-04-29', ref: 'INV-2404-107', type: 'Invoice Approved', description: 'Invoice approved', credit: 208000, debit: 0, balance: 1720000 },
  { date: '2026-05-02', ref: 'TDS-2026-05', type: 'TDS Deduction', description: 'Quarterly tax deduction posted', credit: 0, debit: 18200, balance: 1700000 },
  { date: '2026-05-04', ref: 'INV-2408-018', type: 'Payment Received', description: 'Invoice settled', credit: 142000, debit: 0, balance: 1840000 },
  { date: '2026-05-08', ref: 'INV-2605-055', type: 'Invoice Approved', description: 'May load approved', credit: 166000, debit: 0, balance: 2006000 },
  { date: '2026-05-12', ref: 'PAY-2605-019', type: 'Payment Received', description: 'Mid-month payment posted', credit: 111000, debit: 0, balance: 2117000 },
  { date: '2026-05-19', ref: 'OTH-2605-003', type: 'Other Deduction', description: 'Operational adjustment deducted', credit: 0, debit: 4600, balance: 2112400 },
]

const monthOrder = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05']

export default function LedgerPage() {
  const [fromDate, setFromDate] = useState('2026-05-01')
  const [toDate, setToDate] = useState('2026-05-31')
  const [page, setPage] = useState(1)

  const filteredEntries = useMemo(
    () => ledgerEntries.filter((entry) => entry.date >= fromDate && entry.date <= toDate),
    [fromDate, toDate],
  )

  const monthlyGraph = useMemo(() => {
    const buckets = new Map<string, { month: string; invoiced: number; payments: number }>()

    for (const monthKey of monthOrder) {
      const monthLabel = new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      buckets.set(monthKey, { month: monthLabel, invoiced: 0, payments: 0 })
    }

    for (const entry of ledgerEntries) {
      const monthKey = entry.date.slice(0, 7)
      const bucket = buckets.get(monthKey)
      if (!bucket) continue
      if (entry.credit > 0) bucket.invoiced += entry.credit
      if (entry.type === 'Payment Received') bucket.payments += entry.credit
    }

    return monthOrder.map((monthKey) => {
      const bucket = buckets.get(monthKey)
      return {
        month: bucket?.month ?? monthKey,
        invoiced: bucket?.invoiced ?? 0,
        payments: bucket?.payments ?? 0,
      }
    })
  }, [])

  const summary = useMemo(
    () => ({
      totalInvoiced: filteredEntries.reduce((sum, entry) => sum + entry.credit, 0),
      totalInvoicedCount: filteredEntries.filter((entry) => entry.type === 'Invoice Approved').length,
      pendingPayments: filteredEntries.reduce((sum, entry) => sum + (entry.type === 'Payment Received' ? 0 : entry.credit === 0 ? entry.debit : 0), 0),
      tdsDeducted: filteredEntries.reduce((sum, entry) => sum + (entry.type === 'TDS Deduction' ? entry.debit : 0), 0),
    }),
    [filteredEntries],
  )

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / 4))
  const safePage = Math.min(page, totalPages)
  const pagedEntries = filteredEntries.slice((safePage - 1) * 4, safePage * 4)

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
            <div className="text-sm font-medium text-gray-500">Total Invoices Invoiced</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-text">{summary.totalInvoicedCount}</div>
            <div className="mt-2 text-sm text-gray-500">Invoices approved in selected range.</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">Pending Payments</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-text">₹{summary.pendingPayments.toLocaleString('en-IN')}</div>
            <div className="mt-2 text-sm text-gray-500">Open invoices in the filtered period.</div>
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
            <p className="mt-1 text-sm text-gray-500">Last 6 months, matching the legacy vendor ledger graph.</p>
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
            <Button>
              Export Statement
              <Download className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Type</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Credit</th>
                <th className="p-4 text-right">Debit</th>
                <th className="p-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedEntries.map((row) => (
                <tr key={`${row.date}-${row.ref}`} className="hover:bg-gray-50">
                  <td className="p-4">{new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="p-4 font-mono text-xs text-gray-500">{row.ref}</td>
                  <td className="p-4 font-medium text-text">{row.type}</td>
                  <td className="p-4 text-gray-600">{row.description}</td>
                  <td className="p-4 text-right font-medium text-emerald-600">{row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="p-4 text-right font-medium text-rose-600">{row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="p-4 text-right font-mono">₹{row.balance.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 text-sm text-gray-600">
          <span>
            Showing {filteredEntries.length === 0 ? 0 : (safePage - 1) * 4 + 1}-{Math.min(safePage * 4, filteredEntries.length)} of {filteredEntries.length}
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
