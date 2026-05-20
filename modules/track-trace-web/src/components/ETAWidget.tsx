import { Card } from '@shared-ui'
import type { TrackingTrip } from '../types/tracking.types'

export function ETAWidget({ trip }: { trip: TrackingTrip }) {
  const currentEta = trip.currentEta ?? trip.eta

  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Current ETA</p>
      <p className="mt-2 text-2xl font-extrabold text-text">{new Date(currentEta).toLocaleString('en-IN')}</p>
      <p className="mt-2 text-sm text-gray-600">{trip.etaConfidence ?? 'Medium'} confidence</p>
      <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Scheduled Delivery</p>
          <p className="mt-1 font-semibold text-text">{new Date(trip.scheduledDeliveryTime).toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Delay</p>
          <p className="mt-1 font-semibold text-text">{trip.delayMinutes} min</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Remaining Distance</p>
          <p className="mt-1 font-semibold text-text">{trip.remainingDistanceKm} km</p>
        </div>
      </div>
    </Card>
  )
}
