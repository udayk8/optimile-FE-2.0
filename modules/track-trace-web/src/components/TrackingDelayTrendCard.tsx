import { useEffect, useMemo, useState } from 'react'
import { Card } from '@shared-ui'
import { TrackingAnalyticsEmptyState, TrackingAnalyticsErrorState, TrackingAnalyticsLoadingState } from './TrackingAnalyticsCardState'
import { getDelayTrend } from '../services/analyticsApi'
import type { AnalyticsFilters, DelayTrendPoint } from '../types/analytics.types'

function buildPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return ''
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

export function TrackingDelayTrendCard({ filters }: { filters?: AnalyticsFilters }) {
  const [points, setPoints] = useState<DelayTrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    getDelayTrend(filters)
      .then((response) => {
        if (!active) return
        setPoints(response)
      })
      .catch(() => {
        if (!active) return
        setError('Delay trend could not be prepared from the analytics layer.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [filters])

  const chart = useMemo(() => {
    const width = 640
    const height = 240
    const padding = 24

    if (!points.length) {
      return { width, height, linePath: '', areaPath: '', plottedPoints: [], maxDelayedTrips: 1 }
    }

    const maxDelayedTrips = Math.max(...points.map((point) => point.delayedTrips), 1)
    const plottedPoints = points.map((point, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(points.length - 1, 1)
      const y = height - padding - (point.delayedTrips / maxDelayedTrips) * (height - padding * 2)
      return { ...point, x, y }
    })

    const linePath = buildPath(plottedPoints)
    const areaPath = `${linePath} L ${plottedPoints[plottedPoints.length - 1]?.x ?? padding} ${height - padding} L ${plottedPoints[0]?.x ?? padding} ${height - padding} Z`

    return { width, height, linePath, areaPath, plottedPoints, maxDelayedTrips }
  }, [points])

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Shipment delay</p>
          <h2 className="mt-1 text-lg font-extrabold text-text">Delay trend over time</h2>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-gray-600">
          Shows whether delay pressure is rising or recovering across the recent reporting window.
        </p>
      </div>

      {loading ? (
        <TrackingAnalyticsLoadingState />
      ) : error ? (
        <TrackingAnalyticsErrorState message={error} />
      ) : !points.length ? (
        <TrackingAnalyticsEmptyState
          title="No delay data yet"
          description="Delay trend will populate as trips complete within the selected date window."
        />
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
            <svg className="h-[240px] w-full" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="Delay trend over time">
              <defs>
                <linearGradient id="delayTrendArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#1f4f7a" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#1f4f7a" stopOpacity="0.03" />
                </linearGradient>
              </defs>

              {[0, 1, 2, 3].map((step) => {
                const y = 24 + ((chart.height - 48) / 3) * step
                return <line key={step} x1="24" x2={chart.width - 24} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />
              })}

              {chart.areaPath ? <path d={chart.areaPath} fill="url(#delayTrendArea)" /> : null}
              {chart.linePath ? <path d={chart.linePath} fill="none" stroke="#1f4f7a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" /> : null}

              {chart.plottedPoints.map((point) => (
                <g key={point.date}>
                  <circle cx={point.x} cy={point.y} fill="#1f4f7a" r="5" />
                  <circle cx={point.x} cy={point.y} fill="#ffffff" r="2.5" />
                  <text x={point.x} y={chart.height - 6} fill="#6b7280" fontSize="11" textAnchor="middle">
                    {point.date}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="space-y-3">
            {points.map((point, index) => {
              const previous = index > 0 ? points[index - 1] : null
              const direction =
                previous && point.averageDelayMinutes > previous.averageDelayMinutes
                  ? 'Delay pressure rising'
                  : previous && point.averageDelayMinutes < previous.averageDelayMinutes
                    ? 'Delay pressure easing'
                    : 'Steady movement'

              return (
                <div key={point.date} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-text">{point.date}</p>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {point.delayedTrips} delayed trips
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-extrabold text-text">{point.averageDelayMinutes} min</p>
                  <p className="mt-1 text-sm text-gray-600">Average delay</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{direction}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
