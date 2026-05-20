import { Card } from '@shared-ui'
import type { TrackingTrip } from '../types/tracking.types'

export function RouteProgress({ trip }: { trip: TrackingTrip }) {
  const totalDistance = trip.distanceCoveredKm + trip.remainingDistanceKm
  const progress = totalDistance ? Math.round((trip.distanceCoveredKm / totalDistance) * 100) : 0

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Route Progress</p>
          <h3 className="mt-1 text-xl font-bold text-text">{trip.origin} to {trip.destination}</h3>
        </div>
        <p className="text-sm font-bold text-text">{progress}% complete</p>
      </div>

      <div className="mt-4 h-2 rounded-full bg-gray-200">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(progress, 6)}%` }} />
      </div>

      <div className="mt-5 space-y-3">
        {trip.checkpoints.map((checkpoint, index) => (
          <div key={checkpoint.id} className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              checkpoint.status === 'Reached'
                ? 'bg-success/15 text-success'
                : checkpoint.status === 'Missed'
                  ? 'bg-danger/10 text-danger'
                  : 'bg-gray-200 text-gray-600'
            }`}>
              {index + 1}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-text">{checkpoint.name}</p>
              <p className="text-sm text-gray-600">{checkpoint.city}</p>
              <p className="mt-1 text-xs text-gray-500">
                Planned: {new Date(checkpoint.plannedAt).toLocaleString('en-IN')}
                {checkpoint.actualAt ? ` · Actual: ${new Date(checkpoint.actualAt).toLocaleString('en-IN')}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
