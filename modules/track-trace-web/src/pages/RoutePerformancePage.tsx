import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, DataTable, PageHero } from '@shared-ui'
import { MetricGrid } from '../components/analytics/MetricGrid'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { FeatureAccessNotice } from '../components/shared/FeatureAccessNotice'
import { trackTraceV2EyebrowClassName, trackTraceV2StickyPanelClassName } from '../components/shared/trackTraceV2Chrome'
import { useTrackTraceAccess } from '../hooks/useTrackTraceAccess'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { getRoutePerformance } from '../services/analyticsApi'
import type { AnalyticsFilters } from '../types/analytics.types'
import type { RoutePerformance } from '../types/analytics.types'
import { AnalyticsPageSkeleton } from '../components/shared/AnalyticsPageSkeleton'

export function RoutePerformancePage() {
  const { canUseFeature, hasPermission } = useTrackTraceAccess()
  const { scopedPath } = useTrackTraceRouting()
  const [view, setView] = useState<'Worst Delay' | 'Best Efficiency' | 'All'>('Worst Delay')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<RoutePerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const filters = useMemo<AnalyticsFilters>(() => ({
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  }), [fromDate, toDate])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void getRoutePerformance(filters)
      .then((items) => {
        if (active) setRows(items)
      })
      .catch(() => {
        if (active) setError('Route performance intelligence could not be prepared.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [filters])

  const rankedRows = useMemo(() => {
    const nextRows = [...rows]

    if (view === 'Worst Delay') {
      return nextRows.sort((a, b) => b.averageDelayMinutes - a.averageDelayMinutes)
    }

    if (view === 'Best Efficiency') {
      return nextRows.sort((a, b) => b.efficiencyScore - a.efficiencyScore)
    }

    return nextRows
  }, [rows, view])

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

  if (loading) {
    return <AnalyticsPageSkeleton />
  }

  if (error) {
    return <EmptyPlaceholder title="Route performance unavailable" description={error} />
  }

  const averageEfficiency = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.efficiencyScore, 0) / rows.length) : 0
  const highDelayCorridors = rows.filter((row) => row.averageDelayMinutes > 90).length

  return (
    <TrackTraceAccessBoundary page="route-performance">
      <div className="space-y-6">
        <PageHero
          eyebrow="Route Performance"
          title="Route performance insights"
          subtitle="Corridor performance workspace for delay pressure, route efficiency, and lane-level exception focus."
        />

        <Card className={trackTraceV2StickyPanelClassName}>
          <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <div>
              <p className={trackTraceV2EyebrowClassName}>Corridor comparison</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['Worst Delay', 'Best Efficiency', 'All'] as const).map((item) => (
                  <button
                    key={item}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${view === item ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                    onClick={() => setView(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <label className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">From</span>
                  <input className="mt-1 h-9 rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" onChange={(e) => setFromDate(e.target.value)} type="date" value={fromDate} />
                </label>
                <label className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">To</span>
                  <input className="mt-1 h-9 rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} type="date" value={toDate} />
                </label>
                {(fromDate || toDate) && (
                  <button className="self-end mb-0.5 text-sm font-medium text-primary hover:underline" onClick={() => { setFromDate(''); setToDate('') }} type="button">Clear</button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-primary/30 hover:bg-primary/5" to={scopedPath('/live-map')}>
                  <p className="text-sm font-bold text-text">Open live map</p>
                  <p className="mt-1 text-sm text-gray-600">Compare route pressure with live geography.</p>
                </Link>
                <Link className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-primary/30 hover:bg-primary/5" to={scopedPath('/trips')}>
                  <p className="text-sm font-bold text-text">Open active trips</p>
                  <p className="mt-1 text-sm text-gray-600">Move from corridor signals into trip execution.</p>
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Ranked corridor controls stay pinned above the table so operators can compare pressure patterns without losing the current sort context.
          </p>
        </Card>

        <MetricGrid
          items={[
            { label: 'Average Efficiency', value: `${averageEfficiency}%`, description: 'Mean efficiency across all reviewed corridors.' },
            { label: 'High-Delay Corridors', value: highDelayCorridors, description: 'Corridors averaging more than 90 minutes of delay.' },
            { label: 'Lanes Reviewed', value: rows.length },
            { label: 'Deviation Count', value: rows.reduce((sum, row) => sum + row.deviationCount, 0), description: 'Observed route deviations across all lanes in scope.' },
          ]}
        />

        <Card className="p-5">
          <h3 className="text-lg font-bold text-text">Lane performance table</h3>
          <p className="mt-1 text-sm text-gray-600">The table is ranked by the current comparison mode so teams can focus on the corridors that matter most.</p>
          <div className="mt-4">
            <DataTable
              rows={rankedRows}
              getRowKey={(row) => row.laneId}
              emptyState={(
                <EmptyPlaceholder
                  compact
                  title="No route performance rows in scope"
                  description="Lane rows will appear here once the selected date range contains route-performance history."
                />
              )}
              mobileCardRender={(row) => (
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-extrabold text-text">{row.laneId}</p>
                      <p className="mt-1 text-sm text-gray-600">{row.origin} to {row.destination}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {row.efficiencyScore}% efficiency
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-gray-50 px-3 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Distance</p>
                      <p className="mt-1 text-sm font-semibold text-text">{row.plannedDistanceKm} km planned</p>
                      <p className="text-xs text-gray-500">{row.actualDistanceKm} km actual</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-3 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Duration</p>
                      <p className="mt-1 text-sm font-semibold text-text">{row.plannedDurationMinutes} min planned</p>
                      <p className="text-xs text-gray-500">{row.actualDurationMinutes} min actual</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-warning/10 px-2.5 py-1 text-warning">{row.averageDelayMinutes} min avg delay</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">{row.deviationCount} deviations</span>
                  </div>
                </div>
              )}
              columns={[
                { key: 'laneId', header: 'Lane ID', render: (row) => row.laneId },
                { key: 'lane', header: 'Origin / Destination', render: (row) => `${row.origin} to ${row.destination}` },
                { key: 'plannedDistanceKm', header: 'Planned Distance', render: (row) => `${row.plannedDistanceKm} km` },
                { key: 'actualDistanceKm', header: 'Actual Distance', render: (row) => `${row.actualDistanceKm} km` },
                { key: 'plannedDurationMinutes', header: 'Planned Duration', render: (row) => `${row.plannedDurationMinutes} min` },
                { key: 'actualDurationMinutes', header: 'Actual Duration', render: (row) => `${row.actualDurationMinutes} min` },
                { key: 'averageDelayMinutes', header: 'Average Delay', render: (row) => `${row.averageDelayMinutes} min` },
                { key: 'efficiencyScore', header: 'Efficiency', render: (row) => `${row.efficiencyScore}%` },
              ]}
            />
          </div>
        </Card>
      </div>
    </TrackTraceAccessBoundary>
  )
}
