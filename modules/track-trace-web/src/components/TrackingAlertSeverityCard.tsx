import { useEffect, useMemo, useState } from 'react'
import { Card } from '@shared-ui'
import { TrackingAnalyticsEmptyState, TrackingAnalyticsErrorState, TrackingAnalyticsLoadingState } from './TrackingAnalyticsCardState'
import { getAlertSeverityDistribution } from '../services/analyticsApi'
import type { AnalyticsFilters, DistributionPoint } from '../types/analytics.types'

function severityTone(label: string) {
  switch (label.toLowerCase()) {
    case 'critical':
      return {
        bar: 'bg-danger',
        badge: 'bg-danger/10 text-danger',
      }
    case 'high':
      return {
        bar: 'bg-warning',
        badge: 'bg-warning/10 text-warning',
      }
    case 'medium':
      return {
        bar: 'bg-primary',
        badge: 'bg-primary/10 text-primary',
      }
    default:
      return {
        bar: 'bg-gray-500',
        badge: 'bg-gray-100 text-gray-600',
      }
  }
}

export function TrackingAlertSeverityCard({ filters }: { filters?: AnalyticsFilters }) {
  const [points, setPoints] = useState<DistributionPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    getAlertSeverityDistribution(filters)
      .then((response) => {
        if (!active) return
        setPoints(response)
      })
      .catch(() => {
        if (!active) return
        setError('Alert severity distribution could not be prepared from the analytics layer.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [filters])

  const chart = useMemo(() => {
    const maxValue = Math.max(...points.map((point) => point.value), 1)
    const total = points.reduce((sum, point) => sum + point.value, 0)
    return { maxValue, total }
  }, [points])

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Exception pressure</p>
          <h2 className="mt-1 text-lg font-extrabold text-text">Alerts by severity</h2>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-gray-600">
          Shows how current alert pressure is distributed across severity levels so operators can see whether risk is concentrated or broadly spread.
        </p>
      </div>

      {loading ? (
        <TrackingAnalyticsLoadingState />
      ) : error ? (
        <TrackingAnalyticsErrorState message={error} />
      ) : !points.length ? (
        <TrackingAnalyticsEmptyState
          title="No severity distribution available"
          description="Severity analytics will appear here once open alert categories are available in the intelligence layer."
        />
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="space-y-4">
              {points.map((point) => {
                const tone = severityTone(point.label)
                const percentage = chart.total ? Math.round((point.value / chart.total) * 100) : 0

                return (
                  <div key={point.label}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone.badge}`}>{point.label}</span>
                        <span className="text-sm font-semibold text-text">{point.value} alerts</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500">{percentage}% of queue</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100">
                      <div
                        className={`h-3 rounded-full ${tone.bar}`}
                        style={{ width: `${Math.max(12, Math.round((point.value / chart.maxValue) * 100))}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            {points.map((point) => {
              const tone = severityTone(point.label)
              const percentage = chart.total ? Math.round((point.value / chart.total) * 100) : 0

              return (
                <div key={point.label} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-text">{point.label}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>{percentage}% share</span>
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-text">{point.value}</p>
                  <p className="mt-1 text-sm text-gray-600">Open alert count in the current reporting window.</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
