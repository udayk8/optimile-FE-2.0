import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  Clock3,
  TrendingUp,
  Truck,
} from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from '@shared-ui/badge'
import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import type { Booking, BookingStatus, CustomerSection } from '../shared/customer-types'
import {
  ACTIVE_STATUSES, PENDING_STATUSES, EXCEPTION_STATUSES, TRANSIT_ONLY_STATUSES,
  CONSIGNEE_ANALYTICS,
} from '../shared/customer-types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface OverviewSectionProps {
  bookings:             Booking[]
  setActiveSection:     (section: CustomerSection) => void
  setSelectedBookingId: (id: string) => void
  setQuery:             (q: string) => void
  setPresetFilter:      (preset: string) => void
  onViewFinance?:       (tab?: 'all' | 'pending' | 'overdue' | 'paid' | 'disputed') => void
  onGoToReports?:       () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Customer-visible status labels for the live feed — ops jargon stripped out
const FEED_STATUS_LABEL: Partial<Record<BookingStatus, string>> = {
  IN_TRANSIT_DELAYED: 'Delayed',
  IN_TRANSIT_EXCEPTION: 'Needs Attention',
  IN_TRANSIT: 'In Transit',
  DISPATCHED: 'Dispatched',
  READY_FOR_DISPATCH: 'Ready to Dispatch',
}

function use7DayTrend(bookings: Booking[]): { labels: string[]; heights: number[] } {
  return useMemo(() => {
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    const labels: string[] = []
    const counts: number[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      labels.push(DAYS[d.getDay()] ?? 'Day')
      counts.push(bookings.filter((b) => b.bookingDate.startsWith(dateStr)).length)
    }
    const maxCount = Math.max(...counts, 1)
    return { labels, heights: counts.map((c) => Math.round((c / maxCount) * 80 + 10)) }
  }, [bookings])
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OtdIndicator({ value }: { value: number }) {
  if (value >= 90) return <span className="font-extrabold text-success"><span aria-label="above target">▲</span> {value}%</span>
  if (value >= 80) return <span className="font-extrabold text-warning"><span aria-label="at target">→</span> {value}%</span>
  return <span className="font-extrabold text-danger"><span aria-label="below target">▼</span> {value}%</span>
}

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Truck className="mb-3 h-8 w-8 text-gray-300" />
      <p className="text-sm font-semibold text-gray-500">No active shipments right now</p>
      <p className="mt-1 text-xs text-gray-400">In-transit bookings will appear here.</p>
    </div>
  )
}

// ─── Derived data hook ────────────────────────────────────────────────────────

function useDerivedKpis(bookings: Booking[]) {
  return useMemo(() => {
    const total = bookings.length
    const delivered = bookings.filter((b) => b.status === 'DELIVERED')
    // OTD: delivered trips where no delay was recorded
    const deliveredOnTime = delivered.filter((b) => !b.delayedHours)
    const otdPct = delivered.length > 0 ? Math.round((deliveredOnTime.length / delivered.length) * 100) : 0

    const delayed   = bookings.filter((b) => b.status === 'IN_TRANSIT_DELAYED').length
    const exception = bookings.filter((b) => b.status === 'IN_TRANSIT_EXCEPTION').length
    const cancelled = bookings.filter((b) => b.status === 'CANCELLED').length
    const active    = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length
    // Pending POD = in-transit shipments that don't have a confirmed ePOD yet
    const pendingPod = bookings.filter(
      (b) => ACTIVE_STATUSES.includes(b.status) || (b.status === 'DELIVERED' && b.epod?.status !== 'Captured'),
    ).length
    const completed = delivered.length

    const cancellationRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0.0'

    // Exception banner
    const activeExceptions = bookings.filter((b) => EXCEPTION_STATUSES.includes(b.status))

    // Live feed: active trips only
    const liveBookings = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status))

    // Trip summary bar segments (counts, not percentages)
    const segments = [
      { label: 'Completed',       tab: 'completed',  count: completed,                                                                   color: 'bg-success'   },
      { label: 'In Transit',      tab: 'active',     count: bookings.filter((b) => TRANSIT_ONLY_STATUSES.includes(b.status)).length,    color: 'bg-primary'   },
      { label: 'Pending',         tab: 'pending',    count: bookings.filter((b) => PENDING_STATUSES.includes(b.status)).length,         color: 'bg-secondary' },
      { label: 'Needs Attention', tab: 'exceptions', count: delayed + exception,                                                        color: 'bg-warning'   },
      { label: 'Cancelled',       tab: 'cancelled',  count: cancelled,                                                                   color: 'bg-danger'    },
    ]
    const segmentTotal = segments.reduce((s, seg) => s + seg.count, 0) || 1

    return {
      total, otdPct, delayed, exception, cancelled, active,
      pendingPod, completed, cancellationRate,
      activeExceptions, liveBookings, segments, segmentTotal,
    }
  }, [bookings])
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OverviewSection({ bookings, setActiveSection, setSelectedBookingId, setQuery, setPresetFilter, onViewFinance, onGoToReports }: OverviewSectionProps) {
  const d = useDerivedKpis(bookings)
  const trend = use7DayTrend(bookings)
  const dayLabels = trend.labels

  function goToBookings(preset: string) {
    if (preset === '__finance__') { onViewFinance?.(); return }
    setPresetFilter(preset)
    // setPresetFilter callback in dashboard already calls setActiveSection('bookings')
  }

  function goToBooking(id: string) {
    setSelectedBookingId(id)
    setActiveSection('tracking')
  }

  function goToBookingsByConsignee(name: string) {
    setQuery(name)
    goToBookings('all')
  }

  // ── Pipeline stage counts ───────────────────────────────────────────────────

  const consigneeStats = useMemo(() => {
    const map = new Map<string, { trips: number; onTime: number }>()
    for (const b of bookings) {
      if (!b.consignee) continue
      const entry = map.get(b.consignee) ?? { trips: 0, onTime: 0 }
      entry.trips++
      if (b.status === 'DELIVERED' && !b.delayedHours) entry.onTime++
      map.set(b.consignee, entry)
    }
    return Array.from(map.entries())
      .map(([name, { trips, onTime }]) => ({
        name,
        trips,
        otd: trips > 0 ? Math.round((onTime / trips) * 100) : 100,
      }))
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 8)
  }, [bookings])

  const financeStats = useMemo(() => {
    const delivered = bookings.filter((b) => b.status === 'DELIVERED' && (b.freight ?? 0) > 0)
    const today = new Date().toISOString().slice(0, 10)
    const overdueInvoices = delivered.filter((b) => {
      const due = new Date(new Date(b.bookingDate.slice(0, 10)).getTime() + 15 * 86_400_000).toISOString().slice(0, 10)
      return !(b.lrNumber && b.lrNumber !== '-') && due < today
    })
    const pendingInvoices = delivered.filter((b) => {
      const due = new Date(new Date(b.bookingDate.slice(0, 10)).getTime() + 15 * 86_400_000).toISOString().slice(0, 10)
      return !(b.lrNumber && b.lrNumber !== '-') && due >= today
    })
    const overdueTotal   = overdueInvoices.reduce((s, b) => s + (b.freight ?? 0), 0)
    const pendingTotal   = pendingInvoices.reduce((s, b) => s + (b.freight ?? 0), 0)
    const totalYTD       = delivered.reduce((s, b) => s + (b.freight ?? 0), 0)
    const avgFreight     = delivered.length > 0 ? Math.round(totalYTD / delivered.length) : 0
    const fmt = (n: number) =>
      n >= 1_00_000
        ? `Rs ${(n / 1_00_000).toFixed(1)}L`
        : n >= 1_000
        ? `Rs ${Math.round(n / 1_000)}K`
        : `Rs ${n}`
    return {
      overdueTotal,
      tiles: [
        { label: 'Overdue Amount',     value: fmt(overdueTotal), detail: `${overdueInvoices.length} invoice${overdueInvoices.length !== 1 ? 's' : ''} past credit days`, icon: AlertCircle, isOverdue: overdueTotal > 0, financeTab: 'overdue'  as const },
        { label: 'Pending Invoices',   value: fmt(pendingTotal), detail: `${pendingInvoices.length} open invoice${pendingInvoices.length !== 1 ? 's' : ''}`,              icon: Clock3,      isOverdue: false,             financeTab: 'pending'  as const },
        { label: 'Avg Freight / Trip', value: fmt(avgFreight),   detail: 'Across delivered trips',                                                                        icon: TrendingUp,  isOverdue: false,             financeTab: 'all'      as const },
        { label: 'Total Freight YTD',  value: fmt(totalYTD),     detail: 'Booked freight visible to you',                                                                 icon: BarChart2,   isOverdue: false,             financeTab: 'all'      as const },
      ],
    }
  }, [bookings])

  const stageCounts = useMemo(() => ({
    erp:        bookings.filter((b) => b.createdBy === 'ERP').length,
    draft:      bookings.filter((b) => b.status === 'DRAFT').length,
    assignment: bookings.filter((b) => ['PENDING_RATE_APPROVAL','PENDING_AUCTION','PENDING_ASSIGNMENT'].includes(b.status)).length,
    transit:    bookings.filter((b) => ['DISPATCHED','READY_FOR_DISPATCH','IN_TRANSIT'].includes(b.status)).length,
    pod:        bookings.filter((b) => ['DISPATCHED','IN_TRANSIT'].includes(b.status) && b.epod?.status !== 'Captured').length,
    completed:  bookings.filter((b) => b.status === 'DELIVERED').length,
    invoiced:   bookings.filter((b) => b.status === 'DELIVERED').length,
    exception:  bookings.filter((b) => ['IN_TRANSIT_DELAYED','IN_TRANSIT_EXCEPTION'].includes(b.status)).length,
    cancelled:  bookings.filter((b) => b.status === 'CANCELLED').length,
  }), [bookings])

  interface PipelineNavStage {
    key:     string
    label:   string
    count:   number
    tab:     string
    accent:  string   // bg for count chip
    border:  string   // hover/active border
    dot:     string   // coloured left dot
    urgent?: boolean
  }

  const pipelineNav: PipelineNavStage[] = [
    { key: 'erp',        label: 'ERP Bookings', count: stageCounts.erp,        tab: 'all',        accent: 'bg-slate-100 text-slate-700',    border: 'hover:border-slate-400',   dot: 'bg-slate-400'   },
    { key: 'draft',      label: 'Draft',         count: stageCounts.draft,      tab: 'pending',    accent: 'bg-amber-100 text-amber-700',    border: 'hover:border-amber-400',   dot: 'bg-amber-400'   },
    { key: 'assignment', label: 'Assignment',    count: stageCounts.assignment, tab: 'pending',    accent: 'bg-orange-100 text-orange-700',  border: 'hover:border-orange-400',  dot: 'bg-orange-400'  },
    { key: 'transit',    label: 'In Transit',    count: stageCounts.transit,    tab: 'active',     accent: 'bg-indigo-100 text-indigo-700',  border: 'hover:border-indigo-400',  dot: 'bg-indigo-500'  },
    { key: 'pod',        label: 'POD Pending',   count: stageCounts.pod,        tab: 'active',     accent: 'bg-violet-100 text-violet-700',  border: 'hover:border-violet-400',  dot: 'bg-violet-500'  },
    { key: 'completed',  label: 'Completed',     count: stageCounts.completed,  tab: 'completed',  accent: 'bg-emerald-100 text-emerald-700',border: 'hover:border-emerald-400', dot: 'bg-emerald-500' },
    { key: 'invoiced',   label: 'Invoiced',      count: stageCounts.invoiced,   tab: '__finance__', accent: 'bg-teal-100 text-teal-700',     border: 'hover:border-teal-400',    dot: 'bg-teal-500'    },
    { key: 'exception',  label: 'Exception',     count: stageCounts.exception,  tab: 'exceptions', accent: 'bg-red-100 text-red-700',        border: 'hover:border-red-400',     dot: 'bg-red-500',    urgent: true },
    { key: 'cancelled',  label: 'Cancelled',     count: stageCounts.cancelled,  tab: 'cancelled',  accent: 'bg-zinc-100 text-zinc-600',      border: 'hover:border-zinc-400',    dot: 'bg-zinc-400'    },
  ]

  return (
    <>
      {/* ── Pipeline Navigation Strip ──────────────────────────────────────── */}
      <section aria-label="Booking pipeline stages">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {pipelineNav.map((stage) => (
            <button
              key={stage.key}
              type="button"
              onClick={() => goToBookings(stage.key)}
              className={`group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition
                ${stage.border} hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
            >
              {/* Label + dot */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`h-2 w-2 shrink-0 rounded-full ${stage.dot} ${stage.urgent && stage.count > 0 ? 'animate-pulse' : ''}`} />
                <span className="truncate text-[11px] font-semibold text-gray-500 transition group-hover:text-gray-800">{stage.label}</span>
              </div>

              {/* Count — hero number */}
              <p className="text-3xl font-extrabold leading-none text-gray-900">{stage.count}</p>

              {/* Bottom: chip + arrow */}
              <div className="flex items-center justify-between gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stage.accent}`}>
                  {stage.count === 0 ? 'None' : `${stage.count} trip${stage.count !== 1 ? 's' : ''}`}
                </span>
                <span className="text-[11px] font-bold text-gray-300 transition group-hover:text-gray-500">→</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Exception Banner — omitted entirely when count is 0 ───────────── */}
      {d.activeExceptions.length > 0 && (
        <section className="rounded-lg border border-danger/20 bg-danger/5 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div>
                <p className="font-extrabold text-text">
                  {d.activeExceptions.length} shipment{d.activeExceptions.length > 1 ? 's' : ''} need your attention
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {[
                    d.delayed   > 0 ? `${d.delayed} delayed`                  : '',
                    d.exception > 0 ? `${d.exception} with operational issues` : '',
                  ].filter(Boolean).join(' and ')}
                  {'. Review below or contact your account manager.'}
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              aria-label="View delayed shipments"
              onClick={() => goToBookings('exceptions')}
            >
              View Delayed Shipments
            </Button>
          </div>
        </section>
      )}

      {/* ── Trip Summary + 7-day Trend ────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Trip Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Stacked bar */}
            {bookings.length === 0 ? (
              <div className="flex h-7 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                No bookings yet
              </div>
            ) : (
              <div>
                <div className="flex h-7 overflow-hidden rounded-lg bg-gray-100">
                  {d.segments.filter((s) => s.count > 0).map((seg) => (
                    <div
                      key={seg.label}
                      role="button"
                      tabIndex={0}
                      onClick={() => goToBookings(seg.tab)}
                      onKeyDown={(e) => e.key === 'Enter' && goToBookings(seg.tab)}
                      className={`${seg.color} cursor-pointer transition-all hover:opacity-80`}
                      style={{ width: `${(seg.count / d.segmentTotal) * 100}%` }}
                      title={`${seg.label}: ${seg.count} shipment${seg.count !== 1 ? 's' : ''} — click to filter`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  {d.segments.filter((s) => s.count > 0).map((seg) => (
                    <button
                      key={seg.label}
                      type="button"
                      onClick={() => goToBookings(seg.tab)}
                      className="flex items-center gap-1.5 text-xs text-gray-600 transition hover:text-primary"
                    >
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${seg.color}`} />
                      <span className="font-semibold">{seg.label}</span>
                      <span className="text-gray-400">({seg.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 7-day booking trend */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-text">7-day booking trend</p>
                {/* TODO: Derive week-over-week % from actual daily booking counts */}
                <Badge variant="success">+12% week over week</Badge>
              </div>

              {/* Chart: relative position container so gridlines layer under bars */}
              <div className="relative h-44">
                {/* Y-axis gridlines at 25 / 50 / 75 */}
                {([75, 50, 25] as const).map((pct) => (
                  <div
                    key={pct}
                    className="pointer-events-none absolute left-0 right-0 flex items-center gap-2"
                    style={{ bottom: `calc(1.375rem + ${pct / 100} * (100% - 1.375rem))` }}
                  >
                    <span className="w-6 shrink-0 text-right text-[10px] leading-none text-gray-400">
                      {pct}
                    </span>
                    <div className="flex-1 border-t border-dashed border-gray-200" />
                  </div>
                ))}

                {/* Bar columns — pl-8 to clear y-axis labels, pb-5 for day labels */}
                <div className="absolute inset-0 grid grid-cols-7 items-end gap-2 pb-5 pl-8">
                  {trend.heights.map((height, i) => (
                    <div key={i} className="flex h-full flex-col justify-end gap-1">
                      <div
                        className="rounded-t-md bg-primary/75 transition-all hover:bg-primary"
                        style={{ height: `${height}%` }}
                        title={`${dayLabels[i]}: ${trend.heights[i]} bookings`}
                      />
                      <p className="text-center text-[10px] font-semibold text-gray-500">
                        {dayLabels[i]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Live Shipments Feed ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Live Shipments</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            {d.liveBookings.length === 0 ? (
              <EmptyFeed />
            ) : (
              <div className="max-h-[368px] space-y-3 overflow-y-auto">
                {d.liveBookings.map((booking) => {
                  const originCity = (booking.origin.split(',')[0] ?? '').trim().toLowerCase()
                  const destCity   = (booking.destination.split(',')[0] ?? '').trim().toLowerCase()
                  const sameLocation = originCity === destCity
                  const friendlyStatus = FEED_STATUS_LABEL[booking.status] ?? booking.status
                  const badgeVariant =
                    booking.status === 'IN_TRANSIT_DELAYED' || booking.status === 'IN_TRANSIT_EXCEPTION'
                      ? 'destructive'
                      : 'default'

                  return (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => goToBooking(booking.id)}
                      className="group w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-primary/40 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-text group-hover:text-primary transition">{booking.id}</p>
                          {sameLocation ? (
                            <p className="text-xs font-semibold text-warning">
                              ⚠ Same origin and delivery location
                            </p>
                          ) : (
                            <p className="truncate text-xs text-gray-500">
                              {booking.origin} → {booking.destination}
                            </p>
                          )}
                        </div>
                        <Badge variant={badgeVariant} className="shrink-0 text-[10px]">
                          {friendlyStatus}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>{booking.vehicle !== '-' ? booking.vehicle : 'Vehicle pending'}</span>
                        <span>ETA: {booking.eta}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          role="progressbar"
                          aria-valuenow={booking.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${booking.progress}%` }}
                        />
                      </div>
                      {booking.exceptionNote && (
                        <p className="mt-1.5 text-[11px] font-semibold text-danger">
                          {booking.exceptionNote}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => goToBookings('all')}
              className="mt-4 self-end text-xs font-semibold text-primary transition hover:underline"
            >
              View all shipments →
            </button>
          </CardContent>
        </Card>
      </section>

      {/* ── Consignee Analytics + Finance Snapshot ────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-2">

        {/* Consignee Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Consignee Analytics</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[380px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="border-b border-gray-200 pb-3 pt-1">Consignee</th>
                  <th className="border-b border-gray-200 pb-3 pt-1">Trips</th>
                  <th className="border-b border-gray-200 pb-3 pt-1">
                    <span className="flex items-center gap-1">
                      OTD %
                      <span
                        className="inline-flex h-4 w-4 cursor-default select-none items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500 transition hover:bg-gray-300"
                        title="On-Time Delivery: percentage of trips delivered by the originally promised ETA. ▲ ≥ 90%  → ≥ 80%  ▼ < 80%"
                      >
                        i
                      </span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(consigneeStats.length > 0 ? consigneeStats : CONSIGNEE_ANALYTICS).map((row) => (
                  <tr
                    key={row.name}
                    className="group cursor-pointer transition hover:bg-primary/5"
                    onClick={() => goToBookingsByConsignee(row.name)}
                  >
                    <td className="border-b border-gray-100 py-3 font-semibold text-text group-hover:text-primary transition">
                      {row.name}
                    </td>
                    <td className="border-b border-gray-100 py-3 text-gray-600">{row.trips}</td>
                    <td className="border-b border-gray-100 py-3">
                      <OtdIndicator value={row.otd} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Finance Snapshot */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Finance Snapshot</CardTitle>
              <button
                type="button"
                onClick={() => setActiveSection('finance')}
                className="text-xs font-semibold text-primary transition hover:underline"
              >
                View Finance details →
              </button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {financeStats.tiles.map((tile) => {
              const Icon  = tile.icon
              const urgent = tile.isOverdue && financeStats.overdueTotal > 0
              const clickable = !!onViewFinance && !!tile.financeTab
              return (
                <button
                  key={tile.label}
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onViewFinance?.(tile.financeTab)}
                  className={`group rounded-lg border p-4 text-left transition
                    ${urgent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}
                    ${clickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      {tile.label}
                    </p>
                    <Icon className={`h-4 w-4 shrink-0 ${urgent ? 'text-danger' : 'text-gray-400'}`} />
                  </div>
                  <p className={`mt-2 text-2xl font-extrabold ${urgent ? 'text-danger' : 'text-text'}`}>
                    {tile.value}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{tile.detail}</p>
                  {clickable && (
                    <p className="mt-1.5 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      View in Finance →
                    </p>
                  )}
                </button>
              )
            })}
          </CardContent>
        </Card>

        {onGoToReports && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onGoToReports}
              className="text-xs font-semibold text-primary transition hover:underline"
            >
              View Reports →
            </button>
          </div>
        )}
      </section>
    </>
  )
}
