import { EmptyPlaceholder } from './EmptyPlaceholder'
import { Card } from '@shared-ui'
import type { TrackingEvent } from '../types/tracking.types'

export function TripTimeline({ events }: { events: TrackingEvent[] }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Trip Timeline</p>
      {events.length ? (
        <div className="mt-4 space-y-4">
          {events.map((event) => (
            <div key={event.id} className="flex gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-text">{event.title}</p>
                  <p className="text-xs font-medium text-gray-500">{new Date(event.eventTime).toLocaleString('en-IN')}</p>
                </div>
                <p className="mt-1 text-sm text-gray-600">{event.description}</p>
                <p className="mt-2 text-xs text-gray-500">{event.type}{event.location ? ` · ${event.location}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyPlaceholder
            compact
            title="No timeline events yet"
            description="Trip milestones, location updates, ETA changes, and operational events will appear here once movement history is available."
          />
        </div>
      )}
    </Card>
  )
}
