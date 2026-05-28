import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Settings2,
} from 'lucide-react'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { FeatureAccessNotice } from '../components/shared/FeatureAccessNotice'
import { useTrackTraceAccess } from '../hooks/useTrackTraceAccess'
import { getRoutePerformance } from '../services/analyticsApi'
import { AnalyticsPageSkeleton } from '../components/shared/AnalyticsPageSkeleton'
import type { AnalyticsFilters, RoutePerformance } from '../types/analytics.types'

const PAGE_SIZE = 4

type QuickSelect = 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Annual' | 'All Time'

function getQuickSelectDates(q: QuickSelect): { from: string; to: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

  if (q === 'Today') {
    const s = fmt(today)
    return { from: s, to: s }
  }
  if (q === 'Yesterday') {
    const y = new Date(today); y.setDate(y.getDate() - 1)
    const s = fmt(y); return { from: s, to: s }
  }
  if (q === 'This Week') {
    const day = today.getDay()
    const mon = new Date(today); mon.setDate(today.getDate() - ((day + 6) % 7))
    return { from: fmt(mon), to: fmt(today) }
  }
  if (q === 'This Month') {
    return { from: ymd(today.getFullYear(), today.getMonth() + 1, 1), to: fmt(today) }
  }
  if (q === 'Annual') {
    return { from: ymd(today.getFullYear(), 1, 1), to: ymd(today.getFullYear(), 12, 31) }
  }
  return { from: '', to: '' }
}

// ── Corridor map placeholder ──────────────────────────────────────────────────
function CorridorMapPlaceholder({ rows }: { rows: RoutePerformance[] }) {
  // Simple SVG node-and-line diagram built from actual corridor data
  const nodes: Record<string, { x: number; y: number }> = {
    Delhi: { x: 200, y: 80 },
    Mumbai: { x: 100, y: 220 },
    Bengaluru: { x: 200, y: 320 },
    Chennai: { x: 240, y: 290 },
    Kolkata: { x: 310, y: 110 },
    Pune: { x: 120, y: 240 },
    Hyderabad: { x: 210, y: 210 },
    Surat: { x: 110, y: 180 },
    Nagpur: { x: 210, y: 165 },
    Jaipur: { x: 155, y: 100 },
  }

  const colours = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4']

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <svg viewBox="0 0 380 360" className="w-full max-h-[260px]" xmlns="http://www.w3.org/2000/svg">
        {/* Background blob */}
        <ellipse cx="200" cy="190" rx="155" ry="145" fill="#EFF4FF" opacity="0.8" />

        {/* Corridor lines */}
        {rows.slice(0, 6).map((row, i) => {
          const a = nodes[row.origin]
          const b = nodes[row.destination]
          if (!a || !b) return null
          const isHighDelay = row.averageDelayMinutes > 90
          return (
            <line
              key={row.laneId}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isHighDelay ? '#EF4444' : colours[i % colours.length]}
              strokeWidth="2"
              strokeDasharray={isHighDelay ? '5,3' : undefined}
              opacity="0.7"
            />
          )
        })}

        {/* City dots */}
        {Object.entries(nodes).map(([city, pos]) => (
          <g key={city}>
            <circle cx={pos.x} cy={pos.y} r="5" fill="#1E3A5F" opacity="0.85" />
            <text x={pos.x + 7} y={pos.y + 4} fontSize="9" fill="#43474e" fontFamily="Inter">{city}</text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 px-2">
        {rows.slice(0, 4).map((row, i) => (
          <span key={row.laneId} className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-600 min-w-0">
            <span className="h-2.5 w-5 shrink-0 rounded-full" style={{ background: colours[i % colours.length] }} />
            <span className="truncate">{row.origin}–{row.destination}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function RoutePerformancePage() {
  const { canUseFeature, hasPermission } = useTrackTraceAccess()
  const [view, setView] = useState<'Worst Delay' | 'Best Efficiency' | 'All Corridors'>('All Corridors')
  const [quickSelect, setQuickSelect] = useState<QuickSelect | null>('This Month')
  const [fromDate, setFromDate] = useState(() => getQuickSelectDates('This Month').from)
  const [toDate, setToDate] = useState(() => getQuickSelectDates('This Month').to)
  const [rows, setRows] = useState<RoutePerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const filters = useMemo<AnalyticsFilters>(() => ({
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  }), [fromDate, toDate])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void getRoutePerformance(filters)
      .then((items) => { if (active) setRows(items) })
      .catch(() => { if (active) setError('Route performance intelligence could not be prepared.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters])

  function applyQuickSelect(q: QuickSelect) {
    setQuickSelect(q)
    const { from, to } = getQuickSelectDates(q)
    setFromDate(from)
    setToDate(to)
  }

  const rankedRows = useMemo(() => {
    const next = [...rows]
    if (view === 'Worst Delay') return next.sort((a, b) => b.averageDelayMinutes - a.averageDelayMinutes)
    if (view === 'Best Efficiency') return next.sort((a, b) => b.efficiencyScore - a.efficiencyScore)
    return next
  }, [rows, view])

  const totalPages = Math.max(1, Math.ceil(rankedRows.length / PAGE_SIZE))
  const pagedRows = rankedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const averageEfficiency = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.efficiencyScore, 0) / rows.length)
    : 0
  const highDelayCorridors = rows.filter((r) => r.averageDelayMinutes > 90).length
  const deviationCount = rows.reduce((s, r) => s + r.deviationCount, 0)

  if (!hasPermission('track_trace:analytics:view') || !canUseFeature('tracking.routePerformance')) {
    return (
      <TrackTraceAccessBoundary page="route-performance">
        <FeatureAccessNotice
          title="Route performance insights are gated"
          description="Lane efficiency, corridor delay patterns, and route analytics are prepared for enterprise profiles."
        />
      </TrackTraceAccessBoundary>
    )
  }

  if (loading) return <AnalyticsPageSkeleton />
  if (error) return <EmptyPlaceholder title="Route performance unavailable" description={error} />

  return (
    <TrackTraceAccessBoundary page="route-performance">
      <div className="space-y-3">

        {/* ── KPI cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Average Efficiency', value: `${averageEfficiency}%` },
            { label: 'High-Delay Corridors', value: highDelayCorridors },
            { label: 'Lanes Reviewed', value: rows.length },
            { label: 'Deviation Count', value: deviationCount },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">{kpi.label}</p>
              <p className="mt-0.5 text-xl font-extrabold text-gray-900">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* ── Corridor comparison + map ──────────────────────────── */}
        <div className="grid gap-3 lg:grid-cols-[1fr,360px]">

          {/* Left: controls */}
          <div className="self-start overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            {/* Title + view toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <h3 className="text-[14px] font-semibold text-text">Corridor Comparison</h3>
              </div>
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                {(['Worst Delay', 'Best Efficiency', 'All Corridors'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setView(v); setPage(1) }}
                    className={`rounded-md px-3 py-1 text-[12px] font-semibold transition ${
                      view === v ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick select + date pickers in one row */}
            <div className="mt-3 flex flex-wrap items-end gap-4">
              {/* Quick select pills */}
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Quick Select</p>
                <div className="flex flex-wrap gap-1">
                  {(['Today', 'Yesterday', 'This Week', 'This Month', 'Annual', 'All Time'] as QuickSelect[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => applyQuickSelect(q)}
                      className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                        quickSelect === q
                          ? 'bg-primary text-white shadow-sm'
                          : 'border border-gray-200 text-gray-600 hover:border-primary/40 hover:text-primary'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date pickers */}
              {quickSelect !== 'All Time' && (
                <div className="flex shrink-0 items-end gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Starting Period</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => { setFromDate(e.target.value); setQuickSelect(null) }}
                      className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-[12px] text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Ending Period</span>
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={(e) => { setToDate(e.target.value); setQuickSelect(null) }}
                      className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-[12px] text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Info / All Time notice */}
            <div className="mt-2.5 rounded-r-lg border-l-4 border-primary bg-blue-50/60 px-3 py-2">
              <p className="text-[12px] text-gray-600">
                {quickSelect === 'All Time'
                  ? 'All corridors included — no date restriction applied.'
                  : 'Select a quick range or enter custom dates. Use the view toggle to rank by delay or efficiency.'}
              </p>
            </div>
          </div>

          {/* Right: corridor map */}
          <div className="self-start rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Corridor Map</p>
            <CorridorMapPlaceholder rows={rankedRows} />
          </div>
        </div>

        {/* ── Lane performance table ─────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-white px-4 py-3">
            <div>
              <h3 className="text-[14px] font-semibold text-text">Lane performance table</h3>
              <p className="text-[12px] text-gray-500">The table is ranked by the current comparison mode.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-600 transition hover:bg-gray-50">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
              <button type="button" className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-600 transition hover:bg-gray-50">
                <Settings2 className="h-3.5 w-3.5" /> Table Config
              </button>
            </div>
          </div>

          {rankedRows.length === 0 ? (
            <div className="p-8">
              <EmptyPlaceholder compact title="No route performance rows in scope" description="Lane rows will appear once the selected date range contains route-performance history." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b-2 border-gray-100 bg-gray-50">
                    <tr>
                      {[
                        { label: 'Lane ID', align: '' },
                        { label: 'Origin / Destination', align: '' },
                        { label: 'Planned Dist.', align: 'text-right' },
                        { label: 'Actual Dist.', align: 'text-right' },
                        { label: 'Planned Dur.', align: 'text-right' },
                        { label: 'Actual Dur.', align: 'text-right' },
                        { label: 'Avg. Delay', align: 'text-right' },
                        { label: 'Efficiency', align: 'text-center' },
                      ].map((col) => (
                        <th key={col.label} className={`px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500 ${col.align}`}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedRows.map((row, idx) => {
                      const delayHigh = row.averageDelayMinutes > 90
                      const delayLow = row.averageDelayMinutes <= 20
                      const eff = row.efficiencyScore
                      const effColor = eff >= 110 ? 'bg-blue-50 text-primary' : eff >= 95 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'

                      return (
                        <tr key={row.laneId} className={`transition hover:bg-gray-50/80 ${idx % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                          <td className="px-4 py-2 font-mono text-[12px] font-semibold text-primary">{row.laneId}</td>
                          <td className="px-4 py-2">
                            <span className="flex items-center gap-1.5 text-[13px] font-medium text-text">
                              {row.origin}
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                              {row.destination}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-[13px] font-semibold text-text">{row.plannedDistanceKm} km</td>
                          <td className="px-4 py-2 text-right text-[13px] text-gray-500">{row.actualDistanceKm} km</td>
                          <td className="px-4 py-2 text-right text-[13px] text-gray-500">{row.plannedDurationMinutes} min</td>
                          <td className="px-4 py-2 text-right text-[13px] text-gray-500">{row.actualDurationMinutes} min</td>
                          <td className={`px-4 py-2 text-right text-[13px] font-bold ${delayHigh ? 'text-red-500' : delayLow ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {row.averageDelayMinutes} min
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-block rounded-md px-2.5 py-0.5 text-[12px] font-bold ${effColor}`}>{eff}%</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-2.5">
                <p className="text-[12px] text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, rankedRows.length)} of {rankedRows.length} corridors
                </p>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} type="button" onClick={() => setPage(p)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${
                        p === page ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {p}
                    </button>
                  ))}
                  <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </TrackTraceAccessBoundary>
  )
}
