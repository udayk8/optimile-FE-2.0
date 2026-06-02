import { Link } from 'react-router-dom'
import { Button, Card } from '@shared-ui'
import type { TrackingTrip } from '../types/tracking.types'
import { TrackingStatusBadge } from './TrackingStatusBadge'

function delayTone(trip: TrackingTrip) {
  if (trip.delayMinutes >= 120 || trip.isOffline || trip.routeDeviationKm >= 10) return 'bg-danger/10 text-danger'
  if (trip.delayMinutes > 0 || trip.routeDeviationKm > 0) return 'bg-warning/10 text-warning'
  return 'bg-success/10 text-success'
}

export function SelectedTripInsightCard({
  trip,
  alertCount,
  tripBasePath,
  liveMapPath,
}: {
  trip: TrackingTrip
  alertCount: number
  tripBasePath: string
  liveMapPath: string
}) {
  return (
    <Card className="rounded-none border-0 border-b border-gray-200 bg-gray-50/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Selected trip</p>
          <h4 className="mt-2 text-lg font-extrabold text-text sm:text-xl">{trip.bookingId}</h4>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            {trip.customerName} · {trip.vehicleNumber} · {trip.driverName}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button asChild className="w-full sm:w-auto" size="sm" variant="outline">
            <Link to={liveMapPath}>Open live map</Link>
          </Button>
          <Button asChild className="w-full sm:w-auto" size="sm">
            <Link to={`${tripBasePath}/${trip.id}`}>Open trip detail</Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className={`rounded-full px-2.5 py-1 ${delayTone(trip)}`}>
          {trip.delayMinutes > 0 ? `${trip.delayMinutes} min delay` : 'On time'}
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">{trip.etaConfidence ?? 'Medium'} confidence</span>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{alertCount} active alerts</span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">{trip.sourceHealth ?? 'Healthy'} source health</span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Route</p>
          <p className="mt-1 text-sm font-semibold text-text">{trip.origin}</p>
          <p className="text-xs text-gray-500">{trip.destination}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Current location</p>
          <p className="mt-1 text-sm font-semibold text-text">{trip.lastLocationLabel}</p>
          <p className="text-xs text-gray-500">{trip.remainingDistanceKm} km remaining</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">ETA</p>
          <p className="mt-1 text-sm font-semibold text-text">{new Date(trip.currentEta ?? trip.eta).toLocaleString(undefined)}</p>
          {trip.plannedEta && trip.plannedEta !== (trip.currentEta ?? trip.eta) && (
            <p className="text-xs text-gray-500">Planned {new Date(trip.plannedEta).toLocaleString(undefined)}</p>
          )}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Operational status</p>
          <div className="mt-2">
            <TrackingStatusBadge
              status={trip.status}
              description={[
                trip.routeDeviationKm > 0 ? `${trip.routeDeviationKm} km off route` : null,
                trip.idleMinutes ? `${trip.idleMinutes} min idle` : null,
              ].filter(Boolean).join(' · ') || 'On route'}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
