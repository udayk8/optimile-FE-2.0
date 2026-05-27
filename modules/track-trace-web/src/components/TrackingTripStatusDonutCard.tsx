import { useMemo } from 'react'
import { Card } from '@shared-ui'
import { TrackingAnalyticsEmptyState } from './TrackingAnalyticsCardState'
import type { TrackingTrip } from '../types/tracking.types'

type StatusSegment = {
  label: string
  statuses: TrackingTrip['status'][]
  color: string
  badge: string
}

const statusSegments: StatusSegment[] = [
  {
    label: 'In Transit',
    statuses: ['Assigned', 'At Pickup', 'Loading', 'In Transit', 'At Checkpoint', 'Near Destination', 'At Destination', 'Unloading'],
    color: '#1f4f7a',
    badge: 'bg-primary/10 text-primary',
  },
  {
    label: 'Delayed',
    statuses: ['Delayed'],
    color: '#f59e0b',
    badge: 'bg-warning/10 text-warning',
  },
  {
    label: 'Idle / Stopped',
    statuses: ['Idle', 'Stopped'],
    color: '#6b7280',
    badge: 'bg-gray-100 text-gray-600',
  },
  {
    label: 'Offline',
    statuses: ['Offline'],
    color: '#dc2626',
    badge: 'bg-danger/10 text-danger',
  },
  {
    label: 'Route Deviation',
    statuses: ['Route Deviated'],
    color: '#0f766e',
    badge: 'bg-secondary/10 text-secondary',
  },
]

export function TrackingTripStatusDonutCard({
  trips,
  compact = false,
}: {
  trips: TrackingTrip[]
  compact?: boolean
}) {
  const chart = useMemo(() => {
    const activeTrips = trips.filter((trip) => !['Completed', 'Cancelled'].includes(trip.status))
    const total = activeTrips.length

    const rows = statusSegments
      .map((segment) => {
        const count = activeTrips.filter((trip) => segment.statuses.includes(trip.status)).length
        const percentage = total ? Math.round((count / total) * 100) : 0
        return { ...segment, count, percentage }
      })
      .filter((segment) => segment.count > 0)

    let cumulative = 0
    const segments = rows.map((segment) => {
      const ratio = total ? segment.count / total : 0
      const start = cumulative
      const end = cumulative + ratio
      cumulative = end
      return { ...segment, start, end }
    })

    return { total, segments }
  }, [trips])

  const radius = 82
  const circumference = 2 * Math.PI * radius

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Trip composition</p>
          <h2 className="mt-1 text-lg font-extrabold text-text">Trip status split</h2>
        </div>
        {!compact ? (
          <p className="max-w-3xl text-sm leading-6 text-gray-600">
            Gives a fast composition view of the active fleet so operators can understand the overall trip mix before drilling into table or map details.
          </p>
        ) : null}
      </div>

      {!chart.total ? (
        <TrackingAnalyticsEmptyState
          title="No trip status split available"
          description="The donut chart will appear once there are active trips inside the current dashboard scope."
        />
      ) : (
      <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr,1.05fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-6">
          <div className="relative flex h-[220px] w-[220px] items-center justify-center">
            <svg className="-rotate-90" height="220" viewBox="0 0 220 220" width="220" aria-label="Trip status split donut">
              <circle cx="110" cy="110" fill="none" r={radius} stroke="#e5e7eb" strokeWidth="24" />
              {chart.segments.map((segment) => (
                <circle
                  key={segment.label}
                  cx="110"
                  cy="110"
                  fill="none"
                  r={radius}
                  stroke={segment.color}
                  strokeDasharray={`${Math.max((segment.end - segment.start) * circumference, 0)} ${circumference}`}
                  strokeDashoffset={-segment.start * circumference}
                  strokeLinecap="butt"
                  strokeWidth="24"
                />
              ))}
            </svg>
            <div className="absolute text-center">
              <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Active trips</p>
              <p className="mt-2 text-4xl font-extrabold text-text">{chart.total}</p>
              {!compact ? <p className="mt-1 text-sm text-gray-600">Current monitored scope</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {chart.segments.map((segment) => (
              <div key={segment.label} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                    <p className="text-sm font-bold text-text">{segment.label}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${segment.badge}`}>{segment.percentage}% share</span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-text">{segment.count}</p>
                {!compact ? (
                  <p className="mt-1 text-sm text-gray-600">
                    {segment.label === 'In Transit' && 'Trips actively progressing through the delivery lifecycle.'}
                    {segment.label === 'Delayed' && 'Trips currently breaching or approaching ETA pressure.'}
                    {segment.label === 'Idle / Stopped' && 'Trips paused long enough to require operational attention.'}
                    {segment.label === 'Offline' && 'Trips currently missing healthy live telemetry.'}
                    {segment.label === 'Route Deviation' && 'Trips drifting from their approved route path.'}
                  </p>
                ) : null}
              </div>
            ))}
        </div>
      </div>
      )}
    </Card>
  )
}
