import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  Package,
  ReceiptText,
  Route,
  TrendingUp,
  Users,
} from 'lucide-react'
import { type ComponentType, useEffect, useMemo, useState } from 'react'
import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import { CONSIGNEE_ANALYTICS, currency } from '../shared/customer-types'
import type { Booking } from '../shared/customer-types'

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  bookings:        Booking[]
  onGoToBookings?: (preset?: string) => void
  onViewFinance?:  (tab?: 'all' | 'pending' | 'overdue' | 'paid' | 'disputed') => void
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DatePreset   = 'this_month' | 'last_month' | 'last_quarter' | 'last_year' | 'custom'
type ExportFormat = 'PDF' | 'Excel' | 'CSV'

// ─── Period presets ───────────────────────────────────────────────────────────

const DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'this_month',   label: 'This Month'   },
  { id: 'last_month',   label: 'Last Month'   },
  { id: 'last_quarter', label: 'Last Quarter' },
  { id: 'last_year',    label: 'Last Year'    },
  { id: 'custom',       label: 'Custom'       },
]

// ─── Report definitions ───────────────────────────────────────────────────────

type ReportDef = {
  key:      string
  name:     string
  icon:     ComponentType<{ className?: string }>
  desc:     string
  formats:  ExportFormat[]
  lastRun:  string | null   // TODO: from reports service API
  drillTo:  { section: 'bookings' | 'finance'; preset?: string; financeTab?: 'all' | 'pending' | 'overdue' | 'paid' | 'disputed' }
}

const REPORT_DEFS: ReportDef[] = [
  {
    key:     'shipment-summary',
    name:    'Shipment Summary',
    icon:    Package,
    desc:    'Total trips, on-time delivery %, cancellation rate, and average TAT per period.',
    formats: ['PDF', 'Excel', 'CSV'],
    lastRun: null,
    drillTo: { section: 'bookings', preset: 'all' },
  },
  {
    key:     'lane-performance',
    name:    'Lane Performance',
    icon:    Route,
    desc:    'OTD % by lane, average freight, and delay frequency across active corridors.',
    formats: ['PDF', 'Excel', 'CSV'],
    lastRun: null,
    drillTo: { section: 'bookings', preset: 'active' },
  },
  {
    key:     'consignee-report',
    name:    'Consignee Report',
    icon:    Users,
    desc:    'Trips per consignee, on-time delivery %, and average delivery time breakdown.',
    formats: ['PDF', 'Excel', 'CSV'],
    lastRun: null,
    drillTo: { section: 'bookings', preset: 'completed' },
  },
  {
    key:     'freight-spend',
    name:    'Freight Spend',
    icon:    CircleDollarSign,
    desc:    'Total spend, average rate per MT, and lane-wise variance for the selected period.',
    formats: ['PDF', 'Excel', 'CSV'],
    lastRun: null,
    drillTo: { section: 'finance', financeTab: 'all' },
  },
  {
    key:     'exception-analysis',
    name:    'Shipment Alerts',
    icon:    AlertTriangle,
    desc:    'Delayed and flagged shipments, average resolution time, and on-time recovery rate.',
    formats: ['PDF', 'Excel', 'CSV'],
    lastRun: null,
    drillTo: { section: 'bookings', preset: 'exceptions' },
  },
  {
    key:     'invoice-aging',
    name:    'Invoice Aging',
    icon:    ReceiptText,
    desc:    'Open invoices by aging bucket, overdue amounts, and payment status summary.',
    formats: ['PDF', 'Excel'],
    lastRun: null,
    drillTo: { section: 'finance', financeTab: 'overdue' },
  },
]

// ─── Format chip icon ─────────────────────────────────────────────────────────

function FormatIcon({ format }: { format: ExportFormat }) {
  if (format === 'PDF')   return <FileText        className="h-3.5 w-3.5" />
  if (format === 'Excel') return <FileSpreadsheet className="h-3.5 w-3.5" />
  return                         <BarChart3       className="h-3.5 w-3.5" />
}

// ─── Derived preview metrics ──────────────────────────────────────────────────

function usePreviews(bookings: Booking[]) {
  return useMemo(() => {
    const total     = bookings.length
    const delivered = bookings.filter((b) => b.status === 'DELIVERED')
    const otdPct    = delivered.length > 0
      ? Math.round(delivered.filter((b) => !b.delayedHours).length / delivered.length * 100)
      : 0
    const cancelled  = bookings.filter((b) => b.status === 'CANCELLED').length
    const exceptions = bookings.filter((b) => b.status === 'IN_TRANSIT_EXCEPTION').length
    const delayed    = bookings.filter((b) => b.status === 'IN_TRANSIT_DELAYED').length
    const totalFrt   = bookings.reduce((s, b) => s + b.freight, 0)
    const avgFrt     = total > 0 ? Math.round(totalFrt / total) : 0
    const maxFrt     = bookings.reduce((mx, b) => Math.max(mx, b.freight), 0)

    const laneCounts: Record<string, number> = {}
    bookings.forEach((b) => {
      const k = `${(b.origin.split(',')[0] ?? '').trim()} → ${(b.destination.split(',')[0] ?? '').trim()}`
      laneCounts[k] = (laneCounts[k] ?? 0) + 1
    })
    const topLaneEntry = Object.entries(laneCounts).sort(([, a], [, b]) => b - a)[0]
    const topLaneOrigin = topLaneEntry ? (topLaneEntry[0].split('→')[0]?.trim() ?? '—') : '—'
    const laneCount    = Object.keys(laneCounts).length

    const consigneeMap = new Map<string, number>()
    bookings.forEach((b) => { if (b.consignee) consigneeMap.set(b.consignee, (consigneeMap.get(b.consignee) ?? 0) + 1) })
    const bestConsigneeEntry = [...consigneeMap.entries()].sort(([, a], [, b]) => b - a)[0]
    const bestConsignee = bestConsigneeEntry
      ? { name: bestConsigneeEntry[0], trips: bestConsigneeEntry[1], otd: 100 }
      : CONSIGNEE_ANALYTICS[0] ?? { name: '—', trips: 0, otd: 0 }

    const today = new Date().toISOString().slice(0, 10)
    const overdueInvoices = delivered.filter((b) => {
      const due = new Date(new Date(b.bookingDate.slice(0, 10)).getTime() + 15 * 86_400_000).toISOString().slice(0, 10)
      return !(b.lrNumber && b.lrNumber !== '-') && due < today
    })
    const pendingInvoices = delivered.filter((b) => {
      const due = new Date(new Date(b.bookingDate.slice(0, 10)).getTime() + 15 * 86_400_000).toISOString().slice(0, 10)
      return !(b.lrNumber && b.lrNumber !== '-') && due >= today
    })

    return {
      total, otdPct, cancelled, exceptions, delayed,
      totalFrt, avgFrt, maxFrt,
      topLaneOrigin, laneCount,
      bestConsignee,
      deliveredCount: delivered.length,
      overdueCount: overdueInvoices.length,
      overdueTotal: overdueInvoices.reduce((s, b) => s + b.freight, 0),
      openInvoiceCount: overdueInvoices.length + pendingInvoices.length,
    }
  }, [bookings])
}

// ─── Report card ──────────────────────────────────────────────────────────────

type PreviewTile = { label: string; value: string; accent?: string }

function ReportCard({
  report,
  previews,
  selectedFormat,
  onSelectFormat,
  onExport,
  onDrillThrough,
}: {
  report:          ReportDef
  previews:        PreviewTile[]
  selectedFormat:  ExportFormat
  onSelectFormat:  (f: ExportFormat) => void
  onExport:        () => void
  onDrillThrough?: () => void
}) {
  const Icon = report.icon

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/8">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-text">{report.name}</p>
            {report.lastRun ? (
              <p className="flex items-center gap-1 text-[11px] text-gray-400">
                <Clock3 className="h-3 w-3" /> Last run: {report.lastRun}
              </p>
            ) : (
              <p className="text-[11px] italic text-gray-400">Never generated</p>
            )}
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-500">{report.desc}</p>

        {/* Inline preview metrics */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {previews.map((tile) => (
            <div key={tile.label} className="rounded-lg bg-gray-50 p-2.5 text-center">
              <p className={`text-sm font-extrabold ${tile.accent ?? 'text-text'}`}>{tile.value}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{tile.label}</p>
            </div>
          ))}
        </div>

        {/* Format + export */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-400">Format</span>
            {report.formats.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => onSelectFormat(fmt)}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
                  selectedFormat === fmt
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary'
                }`}
              >
                <FormatIcon format={fmt} />
                {fmt}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {onDrillThrough && (
              <button
                type="button"
                onClick={onDrillThrough}
                className="text-xs font-semibold text-primary transition hover:underline"
              >
                View live data →
              </button>
            )}
            {/* TODO: generate and download report from reports service API */}
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4" />
              Export {selectedFormat}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function ReportsSection({ bookings, onGoToBookings, onViewFinance }: Props) {
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [scheduleEmail,     setScheduleEmail]     = useState('')
  const [scheduleSubmitted, setScheduleSubmitted] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const [formats, setFormats] = useState<Record<string, ExportFormat>>(
    () => Object.fromEntries(REPORT_DEFS.map((r) => [r.key, 'PDF' as ExportFormat])),
  )

  const filteredBookings = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    let from = ''
    let to   = ''
    if (datePreset === 'this_month') {
      from = new Date(y, m, 1).toISOString().slice(0, 10)
      to   = new Date(y, m + 1, 0).toISOString().slice(0, 10)
    } else if (datePreset === 'last_month') {
      from = new Date(y, m - 1, 1).toISOString().slice(0, 10)
      to   = new Date(y, m, 0).toISOString().slice(0, 10)
    } else if (datePreset === 'last_quarter') {
      const qStart = Math.floor(m / 3) * 3 - 3
      from = new Date(y, qStart < 0 ? qStart + 12 : qStart, 1).toISOString().slice(0, 10)
      to   = new Date(y, qStart < 0 ? qStart + 15 : qStart + 3, 0).toISOString().slice(0, 10)
    } else if (datePreset === 'last_year') {
      from = `${y - 1}-01-01`
      to   = `${y - 1}-12-31`
    } else if (datePreset === 'custom') {
      from = customFrom
      to   = customTo
    }
    if (!from || !to) return bookings
    return bookings.filter((b) => {
      const d = b.bookingDate.slice(0, 10)
      return d >= from && d <= to
    })
  }, [bookings, datePreset, customFrom, customTo])

  const p           = usePreviews(filteredBookings)
  const periodLabel = DATE_PRESETS.find((d) => d.id === datePreset)?.label ?? 'Custom'

  const QUICK_STATS: Array<{
    label:   string
    value:   string
    icon:    typeof Package
    accent:  string
    onClick?: () => void
  }> = [
    { label: 'Total Trips',      value: String(p.total),       icon: Package,          accent: 'text-primary',  onClick: onGoToBookings ? () => onGoToBookings('all')        : undefined },
    { label: 'On-Time Delivery', value: `${p.otdPct}%`,        icon: TrendingUp,       accent: p.otdPct >= 90 ? 'text-success' : p.otdPct >= 80 ? 'text-warning' : 'text-danger', onClick: onGoToBookings ? () => onGoToBookings('completed')  : undefined },
    { label: 'Shipment Alerts',  value: String(p.exceptions),  icon: AlertTriangle,    accent: p.exceptions > 0 ? 'text-danger' : 'text-success', onClick: onGoToBookings ? () => onGoToBookings('exceptions') : undefined },
    { label: 'Total Freight',    value: currency(p.totalFrt),  icon: CircleDollarSign, accent: 'text-text',     onClick: onViewFinance  ? () => onViewFinance('all')         : undefined },
  ]

  const PREVIEWS: Record<string, PreviewTile[]> = {
    'shipment-summary': [
      { label: 'Trips',      value: String(p.total) },
      { label: 'On-Time',    value: `${p.otdPct}%`, accent: p.otdPct >= 80 ? 'text-success' : 'text-warning' },
      { label: 'Cancelled',  value: String(p.cancelled) },
    ],
    'lane-performance': [
      { label: 'Lanes',      value: String(p.laneCount) },
      { label: 'Top Origin', value: p.topLaneOrigin },
      { label: 'Delayed',    value: String(p.delayed), accent: p.delayed > 0 ? 'text-warning' : undefined },
    ],
    'consignee-report': [
      { label: 'Consignees', value: String(CONSIGNEE_ANALYTICS.length) },
      { label: 'Best OTD',   value: p.bestConsignee ? `${p.bestConsignee.otd}%` : '—', accent: 'text-success' },
      { label: 'Delivered',  value: String(p.deliveredCount) },
    ],
    'freight-spend': [
      { label: 'Total',      value: currency(p.totalFrt) },
      { label: 'Avg / Trip', value: currency(p.avgFrt) },
      { label: 'Highest',    value: currency(p.maxFrt) },
    ],
    'exception-analysis': [
      { label: 'Alerts',   value: String(p.exceptions), accent: p.exceptions > 0 ? 'text-danger' : undefined },
      { label: 'Delays',   value: String(p.delayed),    accent: p.delayed > 0 ? 'text-warning' : undefined },
      { label: 'Resolved', value: String(p.deliveredCount) },
    ],
    'invoice-aging': [
      { label: 'Open',       value: String(p.openInvoiceCount) },
      { label: 'Overdue',    value: String(p.overdueCount), accent: p.overdueCount > 0 ? 'text-danger' : undefined },
      { label: 'Amt Due',    value: currency(p.overdueTotal), accent: 'text-danger' },
    ],
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-text">Reports &amp; Analytics</h2>
          <p className="mt-1 text-sm text-gray-500">
            Downloadable operational and financial reports. Select a period and export format per report.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setToast('Bulk export coming soon — use individual Export buttons for now')}>
          <Download className="h-4 w-4" />
          Export All
        </Button>
      </div>

      {/* Period selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="text-xs font-bold text-gray-500">Period</span>
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDatePreset(preset.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                  datePreset === preset.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {preset.label}
              </button>
            ))}

            {datePreset === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  aria-label="From date"
                  className="h-8 rounded-lg border border-gray-300 px-3 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  aria-label="To date"
                  className="h-8 rounded-lg border border-gray-300 px-3 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
                />
                <Button size="sm" disabled={!customFrom || !customTo} onClick={() => setDatePreset('custom')}>Apply</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick stats for selected period */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_STATS.map((stat) => {
          const Icon = stat.icon
          const inner = (
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Icon className="h-5 w-5 text-gray-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xl font-extrabold ${stat.accent}`}>{stat.value}</p>
                <p className="truncate text-xs text-gray-500">{stat.label} · {periodLabel}</p>
                {stat.onClick && (
                  <p className="mt-0.5 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    View →
                  </p>
                )}
              </div>
            </CardContent>
          )
          return stat.onClick ? (
            <button key={stat.label} type="button" onClick={stat.onClick} className="group text-left transition hover:shadow-md">
              <Card className="h-full">{inner}</Card>
            </button>
          ) : (
            <Card key={stat.label}>{inner}</Card>
          )
        })}
      </div>

      {/* Report cards */}
      <div className="grid gap-4 xl:grid-cols-2">
        {REPORT_DEFS.map((report) => {
          const drill = report.drillTo
          const onDrillThrough = drill.section === 'finance'
            ? (onViewFinance  ? () => onViewFinance(drill.financeTab)   : undefined)
            : (onGoToBookings ? () => onGoToBookings(drill.preset)      : undefined)
          return (
            <ReportCard
              key={report.key}
              report={report}
              previews={PREVIEWS[report.key] ?? []}
              selectedFormat={formats[report.key] ?? 'PDF'}
              onSelectFormat={(fmt) => setFormats((prev) => ({ ...prev, [report.key]: fmt }))}
              onExport={() => setToast(`${report.name} · ${periodLabel} · ${filteredBookings.length} trips — ${formats[report.key] ?? 'PDF'} export queued`)}
              onDrillThrough={onDrillThrough}
            />
          )
        })}
      </div>

      {/* Scheduled delivery */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Scheduled Report Delivery</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {scheduleSubmitted ? (
            <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
              <TrendingUp className="h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-bold text-success">Scheduled successfully</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Reports will be delivered to <span className="font-semibold">{scheduleEmail}</span> every Monday at 8 AM.
                  {/* TODO: persist subscription via notification scheduler service */}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Receive a weekly PDF summary of all reports in your inbox every Monday morning.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="schedule-email" className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Email address
                  </label>
                  <input
                    id="schedule-email"
                    type="email"
                    value={scheduleEmail}
                    onChange={(e) => setScheduleEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (scheduleEmail.trim()) setScheduleSubmitted(true)
                    // TODO: POST subscription to notification scheduler API
                  }}
                >
                  <Mail className="h-4 w-4" />
                  Schedule Weekly
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                You can unsubscribe at any time. Reports cover the previous week's data.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg"
        >
          <div className="h-2 w-2 rounded-full bg-success" />
          <p className="text-sm font-semibold text-text">{toast}</p>
        </div>
      )}
    </section>
  )
}
