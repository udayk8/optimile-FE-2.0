import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, DataTable, PageHero } from '@shared-ui'
import { MetricGrid } from '../components/analytics/MetricGrid'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { FeatureAccessNotice } from '../components/shared/FeatureAccessNotice'
import { trackTraceV2EyebrowClassName, trackTraceV2StickyPanelClassName, trackTraceV2SummaryCardClassName } from '../components/shared/trackTraceV2Chrome'
import { useTrackTraceAccess } from '../hooks/useTrackTraceAccess'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { getDriverBehaviorScores } from '../services/analyticsApi'
import type { AnalyticsFilters, DriverBehaviorScore } from '../types/analytics.types'
import { AnalyticsPageSkeleton } from '../components/shared/AnalyticsPageSkeleton'

export function DriverBehaviorPage() {
  const { canUseFeature, hasPermission } = useTrackTraceAccess()
  const { scopedPath } = useTrackTraceRouting()
  const [focus, setFocus] = useState<'Low Score' | 'Overspeed' | 'Idle' | 'All'>('Low Score')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<DriverBehaviorScore[]>([])
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
    void getDriverBehaviorScores(filters)
      .then((items) => {
        if (active) setRows(items)
      })
      .catch(() => {
        if (active) setError('Driver behavior insights could not be prepared.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [filters])

  const focusedRows = useMemo(() => {
    const nextRows = [...rows]

    if (focus === 'Low Score') {
      return nextRows.sort((a, b) => a.score - b.score)
    }

    if (focus === 'Overspeed') {
      return nextRows.sort((a, b) => b.overspeedCount - a.overspeedCount)
    }

    if (focus === 'Idle') {
      return nextRows.sort((a, b) => b.idleMinutes - a.idleMinutes)
    }

    return nextRows
  }, [focus, rows])

  if (!hasPermission('track_trace:analytics:view') || !canUseFeature('tracking.driverBehavior')) {
    return (
      <TrackTraceAccessBoundary page="driver-behavior">
        <FeatureAccessNotice
          title="Driver behavior insights are not available"
          description="This page is wired for driver scoring, overspeed, idle, GPS compliance, and SOS trend review, but the current plan does not expose it."
        />
      </TrackTraceAccessBoundary>
    )
  }

  if (loading) {
    return <AnalyticsPageSkeleton />
  }

  if (error) {
    return <EmptyPlaceholder title="Driver behavior unavailable" description={error} />
  }

  const bestScore = rows.length ? Math.max(...rows.map((row) => row.score)) : 0
  const averageScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0
  const lowScoreDrivers = rows.filter((row) => row.score < averageScore).length
  const atRiskDrivers = rows.filter(
    (row) => row.score < averageScore || row.overspeedCount > 3 || row.gpsCompliancePercentage < 80,
  )

  return (
    <TrackTraceAccessBoundary page="driver-behavior">
      <div className="space-y-6">
        <PageHero
          eyebrow="Driver Behavior"
          title="Driver behavior insights"
          subtitle="Coaching priorities and risk signals so supervisors can spot issues faster and move into action."
        />

        <Card className={trackTraceV2StickyPanelClassName}>
          <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <div>
              <p className={trackTraceV2EyebrowClassName}>Coaching focus</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['Low Score', 'Overspeed', 'Idle', 'All'] as const).map((item) => (
                  <button
                    key={item}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${focus === item ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                    onClick={() => setFocus(item)}
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
                <div className={trackTraceV2SummaryCardClassName}>
                  <p className="text-sm font-bold text-text">{lowScoreDrivers} drivers need review</p>
                  <p className="mt-1 text-sm text-gray-600">Below average score threshold.</p>
                </div>
                <Link className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-primary/30 hover:bg-primary/5" to={scopedPath('/trips')}>
                  <p className="text-sm font-bold text-text">Open active trips</p>
                  <p className="mt-1 text-sm text-gray-600">Cross-check behavior signals against trip execution.</p>
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Coaching filters and review shortcuts stay grouped together so supervisors can move from signal to intervention with less scanning.
          </p>
        </Card>

        <MetricGrid
          items={[
            { label: 'Drivers Reviewed', value: rows.length },
            { label: 'Average Score', value: averageScore, description: 'Mean performance score across the reviewed driver cohort.' },
            { label: 'Best Score', value: bestScore },
            { label: 'SOS Incidents', value: rows.reduce((sum, row) => sum + row.sosCount, 0), description: 'Total SOS-triggered incidents across drivers in scope.' },
          ]}
        />

        {atRiskDrivers.length > 0 && (
          <section className="space-y-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-danger">Needs attention</p>
              <h2 className="mt-1 text-lg font-extrabold text-text">
                {atRiskDrivers.length} driver{atRiskDrivers.length > 1 ? 's' : ''} below performance threshold
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {atRiskDrivers.map((driver) => (
                <Card key={driver.driverId} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-text">{driver.driverName}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{driver.totalTrips} trips · {driver.totalDistanceDrivenKm} km</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${driver.score < averageScore ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                      Score {driver.score}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    {driver.score < averageScore && (
                      <span className="rounded-full bg-danger/10 px-2 py-0.5 text-danger">Low score</span>
                    )}
                    {driver.overspeedCount > 3 && (
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">{driver.overspeedCount} overspeed</span>
                    )}
                    {driver.gpsCompliancePercentage < 80 && (
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">{driver.gpsCompliancePercentage}% GPS</span>
                    )}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{driver.onTimePercentage}% on-time</span>
                  </div>
                  <div className="mt-3">
                    <Link className="text-sm font-semibold text-primary hover:underline" to={scopedPath('/trips')}>
                      Open active trips
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        <Card className="p-5">
          <h3 className="text-lg font-bold text-text">Driver scorecards</h3>
          <p className="mt-1 text-sm text-gray-600">The list is ranked by the current coaching focus so supervisors can work from the riskiest drivers first.</p>
          <div className="mt-4">
            <DataTable
              rows={focusedRows}
              getRowKey={(row) => row.driverId}
              emptyState={(
                <EmptyPlaceholder
                  compact
                  title="No driver behavior rows in scope"
                  description="Driver scorecards will appear here once the selected date range contains driver-behavior history."
                />
              )}
              mobileCardRender={(row) => (
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-extrabold text-text">{row.driverName}</p>
                      <p className="mt-1 text-sm text-gray-600">{row.totalDistanceDrivenKm} km driven</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      Score {row.score}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-gray-50 px-3 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">On-time / GPS</p>
                      <p className="mt-1 text-sm font-semibold text-text">{row.onTimePercentage}% on-time</p>
                      <p className="text-xs text-gray-500">{row.gpsCompliancePercentage}% GPS compliance</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-3 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Behavior flags</p>
                      <p className="mt-1 text-sm font-semibold text-text">{row.overspeedCount} overspeed</p>
                      <p className="text-xs text-gray-500">{row.routeDeviationCount} deviations · {row.sosCount} SOS</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-warning/10 px-2.5 py-1 text-warning">{row.idleMinutes} min idle</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">{row.totalTrips} trips</span>
                  </div>
                </div>
              )}
              columns={[
                { key: 'driverName', header: 'Driver', render: (row) => row.driverName },
                { key: 'score', header: 'Score', render: (row) => row.score },
                { key: 'onTimePercentage', header: 'On-Time %', render: (row) => `${row.onTimePercentage}%` },
                { key: 'overspeedCount', header: 'Overspeed', render: (row) => row.overspeedCount },
                { key: 'idleMinutes', header: 'Idle', render: (row) => `${row.idleMinutes} min` },
                { key: 'routeDeviationCount', header: 'Deviation', render: (row) => row.routeDeviationCount },
                { key: 'gpsCompliancePercentage', header: 'GPS Compliance', render: (row) => `${row.gpsCompliancePercentage}%` },
                { key: 'totalDistanceDrivenKm', header: 'Distance', render: (row) => `${row.totalDistanceDrivenKm} km` },
              ]}
            />
          </div>
        </Card>
      </div>
    </TrackTraceAccessBoundary>
  )
}
