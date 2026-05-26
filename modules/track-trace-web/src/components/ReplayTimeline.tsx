import { EmptyPlaceholder } from './EmptyPlaceholder'
import { Card } from '@shared-ui'
import type { TripReplay } from '../types/tracking.types'

export function ReplayTimeline({ replay }: { replay: TripReplay }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-text">Replay timeline</h3>
          <p className="mt-1 text-sm text-gray-600">Replay-ready history with route events, idle points, and alert markers.</p>
        </div>
      </div>
      {replay.events.length ? (
        <div className="mt-4 space-y-3">
          {replay.events.map((event) => (
            <div key={event.id} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-text">{event.title}</p>
                <p className="text-xs text-gray-500">{new Date(event.eventTime).toLocaleString('en-IN')}</p>
              </div>
              <p className="mt-1 text-sm text-gray-600">{event.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyPlaceholder
            compact
            title="No replay events available"
            description="Route events, alert markers, and operational milestones will appear here when replay history is available for the selected trip."
          />
        </div>
      )}
    </Card>
  )
}
