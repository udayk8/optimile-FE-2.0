import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, DataTable, PageHero } from '@shared-ui'
import { MetricGrid } from '../components/analytics/MetricGrid'
import { TrackingAlertSeverityCard } from '../components/TrackingAlertSeverityCard'
import { TrackingDelayTrendCard } from '../components/TrackingDelayTrendCard'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { FeatureAccessNotice } from '../components/shared/FeatureAccessNotice'
import { trackTraceV2EyebrowClassName, trackTraceV2StickyPanelClassName } from '../components/shared/trackTraceV2Chrome'
import { useTrackTraceAccess } from '../hooks/useTrackTraceAccess'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { getExceptionAnalytics, getTrackingKpiSummary } from '../services/analyticsApi'
import { getTripsAtRisk as getTripsAtRiskPredictions } from '../services/predictionApi'
import type { AnalyticsFilters, ExceptionAnalyticsRecord, TrackingKpiSummary } from '../types/analytics.types'
import type { DelayRiskScore } from '../types/prediction.types'
import { AnalyticsPageSkeleton } from '../components/shared/AnalyticsPageSkeleton'

const windowDays = {
  '7D': 7,
  '14D': 14,
  '30D': 30,
} as const

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function buildWindowStart(window: keyof typeof windowDays) {
  const date = new Date()
  date.setDate(date.getDate() - windowDays[window] + 1)
  return formatDateInput(date)
}

export function TrackingAnalyticsPage() {
  const { scopedPath } = useTrackTraceRouting()
  const { canUseFeature, hasPermission } = useTrackTraceAccess()
  const [timeWindow, setTimeWindow] = useState<'7D' | '14D' | '30D'>('14D')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [summary, setSummary] = useState<TrackingKpiSummary | null>(null)
  const [exceptionRows, setExceptionRows] = useState<ExceptionAnalyticsRecord[]>([])
  const [riskRows, setRiskRows] = useState<DelayRiskScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const analyticsFilters = useMemo<AnalyticsFilters>(() => {
    const resolvedFromDate = fromDate || buildWindowStart(timeWindow)
    const resolvedToDate = toDate || formatDateInput(new Date())

    return {
      fromDate: resolvedFromDate,
      toDate: resolvedToDate,
    }
  }, [fromDate, timeWindow, toDate])

  function applyTimeWindowPreset(window: '7D' | '14D' | '30D') {
    setTimeWindow(window)
    setFromDate(buildWindowStart(window))
    setToDate(formatDateInput(new Date()))
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    Promise.all([
      getTrackingKpiSummary(analyticsFilters),
      getExceptionAnalytics(analyticsFilters),
      getTripsAtRiskPredictions(analyticsFilters),
    ])
      .then(([kpi, exceptions, risk]) => {
        if (!active) return
        setSummary(kpi)
        setExceptionRows(exceptions)
        setRiskRows(risk)
      })
      .catch(() => {
        if (active) setError('Tracking analytics could not be prepared from the mock intelligence layer.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [analyticsFilters])

  if (!hasPermission('track_trace:analytics:view') || !canUseFeature('tracking.analytics')) {
    return (
      <TrackTraceAccessBoundary page="analytics">
        <FeatureAccessNotice
          title="Analytics is restricted for this plan"
          description="Tracking analytics requires enterprise intelligence access. The feature gate and permission model are ready, but this profile does not currently expose the full analytics workspace."
        />
      </TrackTraceAccessBoundary>
    )
  }

  if (loading) {
    return <AnalyticsPageSkeleton />
  }

  if (error || !summary) {
    return <EmptyPlaceholder title="Analytics unavailable" description={error ?? 'Tracking analytics could not be prepared.'} />
  }

  return (
    <TrackTraceAccessBoundary page="analytics">
      <div className="space-y-6">
        <PageHero
          eyebrow="Analytics"
          title="Tracking analytics dashboard"
          subtitle="Historical visibility into reliability, delay pressure, exceptions, and predicted risk."
        />

        <Card className={trackTraceV2StickyPanelClassName}>
            <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
              <div>
                <p className={trackTraceV2EyebrowClassName}>Analysis controls</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['7D', '14D', '30D'] as const).map((item) => (
                    <button
                      key={item}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${timeWindow === item ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                      onClick={() => applyTimeWindowPreset(item)}
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
                    <input
                      className="mt-1 h-9 rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      onChange={(e) => setFromDate(e.target.value)}
                      type="date"
                      value={fromDate}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">To</span>
                    <input
                      className="mt-1 h-9 rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      min={fromDate || undefined}
                      onChange={(e) => setToDate(e.target.value)}
                      type="date"
                      value={toDate}
                    />
                  </label>
                  {(fromDate || toDate) && (
                    <button
                      className="self-end mb-0.5 text-sm font-medium text-primary hover:underline"
                      onClick={() => { setFromDate(''); setToDate('') }}
                      type="button"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
                  <Link className="text-primary hover:underline" to={scopedPath('/trips')}>
                    Open trips at risk
                  </Link>
                  <Link className="text-primary hover:underline" to={scopedPath('/alerts')}>
                    Review open alerts
                  </Link>
                </div>
              </div>
            </div>
        </Card>

        <MetricGrid
          items={[
            { label: 'Trips In Scope', value: summary.totalTrips, description: `${analyticsFilters.fromDate} to ${analyticsFilters.toDate}` },
            { label: 'Completed Trips', value: summary.completedTrips, description: 'Delivered volume in the selected analytical window.' },
            { label: 'On-Time %', value: `${summary.onTimeDeliveryPercentage}%`, description: 'Baseline service reliability across the selected period.' },
            { label: 'Average Delay', value: `${summary.averageDelayMinutes} min`, description: 'Average delay depth for the selected analytical window.' },
          ]}
        />

        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <Card className="p-5">
            <h3 className="text-lg font-bold text-text">Exception analytics</h3>
            <p className="mt-1 text-sm text-gray-600">Open vs resolved load and average resolution time by issue type.</p>
            <div className="mt-4">
              <DataTable
                rows={exceptionRows}
                getRowKey={(row) => row.type}
                emptyState={(
                  <EmptyPlaceholder
                    compact
                    title="No exception analytics in scope"
                    description="Exception rows will appear here once alerts in the selected window produce open or resolved issue history."
                  />
                )}
                mobileCardRender={(row) => (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-extrabold text-text">{row.type}</p>
                        <p className="mt-1 text-sm text-gray-600">{row.severity} severity</p>
                      </div>
                      <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger">{row.openCount} open</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-gray-50 px-3 py-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Resolved</p>
                        <p className="mt-1 text-sm font-semibold text-text">{row.resolvedCount}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-3 py-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Avg Resolution</p>
                        <p className="mt-1 text-sm font-semibold text-text">{row.averageResolutionMinutes} min</p>
                      </div>
                    </div>
                  </div>
                )}
                columns={[
                  { key: 'type', header: 'Exception Type', render: (row) => row.type },
                  { key: 'severity', header: 'Severity', render: (row) => row.severity },
                  { key: 'openCount', header: 'Open', render: (row) => row.openCount },
                  { key: 'resolvedCount', header: 'Resolved', render: (row) => row.resolvedCount },
                  { key: 'averageResolutionMinutes', header: 'Avg Resolution', render: (row) => `${row.averageResolutionMinutes} min` },
                ]}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-bold text-text">Trips at predicted risk</h3>
            <p className="mt-1 text-sm text-gray-600">Trips most likely to miss ETA or require intervention.</p>
            <div className="mt-4 space-y-3">
              {riskRows.length ? (
                riskRows.map((risk) => (
                  <div key={risk.tripId} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-text">{risk.tripId}</p>
                      <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">{risk.riskLevel}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{risk.reason}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Score {risk.score} · Predicted delay {risk.predictedDelayMinutes} min · Confidence {risk.confidence}
                    </p>
                    <p className="mt-2 text-sm font-medium text-text">{risk.recommendedAction}</p>
                    <div className="mt-3">
                      <Link className="text-sm font-semibold text-primary hover:underline" to={scopedPath(`/trips/${risk.tripId}`)}>
                        Open trip detail
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyPlaceholder
                  compact
                  title="No predicted risk trips in scope"
                  description="Trips that cross the current risk threshold will appear here for intervention review."
                />
              )}
            </div>
          </Card>
        </div>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={trackTraceV2EyebrowClassName}>Operational trend analysis</p>
              <h2 className="mt-1 text-xl font-extrabold text-text">Delay and exception distribution</h2>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-gray-600">
              Review the core views that explain whether pressure is coming from delays and alert severity concentration.
            </p>
          </div>

          <TrackingDelayTrendCard filters={analyticsFilters} />

          <div>
            <TrackingAlertSeverityCard filters={analyticsFilters} />
          </div>
        </section>
      </div>
    </TrackTraceAccessBoundary>
  )
}
