import { Card } from '@shared-ui'
import type { TripReplay } from '../types/tracking.types'

export function ReplayMapPanel({ replay }: { replay: TripReplay }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-text">Replay map foundation</h3>
          <p className="mt-1 text-sm text-gray-600">Prepared for synced route playback, speed overlays, idle clusters, and alert waypoints.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">Playback controls pending</span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">1x preview</span>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-text">{replay.locations.length} replay points available</p>
        <p className="mt-2 text-sm text-gray-600">This panel is ready for route animation, alert markers, and timeline-synced playback.</p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Total Distance</p>
          <p className="mt-1 text-sm font-semibold text-text">{replay.totalDistanceKm} km</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Idle Minutes</p>
          <p className="mt-1 text-sm font-semibold text-text">{replay.totalIdleMinutes} min</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Average / Max Speed</p>
          <p className="mt-1 text-sm font-semibold text-text">{replay.averageSpeed} / {replay.maxSpeed} km/h</p>
        </div>
      </div>
    </Card>
  )
}
