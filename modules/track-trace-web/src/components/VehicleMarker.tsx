import { useState } from 'react'
import { Gauge, MapPin, UserRound } from 'lucide-react'
import { TrackingStatusBadge } from './TrackingStatusBadge'
import type { TrackingSource, TrackingTrip } from '../types/tracking.types'

function formatTrackingSource(source?: TrackingSource) {
  switch (source) {
    case 'GPS_DEVICE':
      return 'GPS device'
    case 'DRIVER_APP':
      return 'Driver app'
    case 'FASTAG':
      return 'FASTag'
    case 'ANPR':
      return 'ANPR'
    case 'MANUAL':
      return 'Manual'
    default:
      return 'Unknown source'
  }
}

function sourceHealthTone(trip: TrackingTrip) {
  const sourceHealth = trip.sourceHealth ?? (trip.isOffline ? 'Offline' : 'Healthy')

  if (sourceHealth === 'Offline') return 'bg-danger/10 text-danger'
  if (sourceHealth === 'Fallback') return 'bg-warning/10 text-warning'
  if (sourceHealth === 'Stale') return 'bg-warning/10 text-warning'
  return 'bg-success/10 text-success'
}

export function VehicleMarker({
  trip,
  selected,
  onSelect,
}: {
  trip: TrackingTrip
  selected: boolean
  onSelect: () => void
}) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <button
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        selected ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-inset ring-primary/15' : 'border-gray-200 bg-white hover:border-primary/20 hover:bg-slate-50/70'
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="relative min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <span>{trip.id}</span>
            <span className="text-gray-300">•</span>
            <span>{trip.bookingId}</span>
          </div>
          <button
            className="mt-1 max-w-full text-left text-[1.08rem] font-extrabold leading-tight text-text underline-offset-4 transition hover:text-primary hover:underline md:text-[1.18rem]"
            onBlur={() => setShowPreview(false)}
            onFocus={() => setShowPreview(true)}
            onMouseEnter={() => setShowPreview(true)}
            onMouseLeave={() => setShowPreview(false)}
            onClick={(event) => event.stopPropagation()}
            type="button"
          >
            <span className="line-clamp-2 break-words">{trip.vehicleNumber}</span>
          </button>
          {showPreview ? (
            <div
              className="absolute left-0 top-full z-20 mt-3 w-[20rem] rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
            >
              <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Booking preview</p>
              <h4 className="mt-2 text-lg font-extrabold text-text">{trip.id}</h4>
              <p className="mt-1 text-sm text-gray-600">{trip.customerName}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 px-3 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Booking</p>
                  <p className="mt-1 text-sm font-semibold text-text">{trip.bookingId}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Driver</p>
                  <p className="mt-1 text-sm font-semibold text-text">{trip.driverName}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-3 sm:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Route</p>
                  <p className="mt-1 text-sm font-semibold text-text">{trip.origin} to {trip.destination}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">ETA</p>
                  <p className="mt-1 text-sm font-semibold text-text">{new Date(trip.currentEta ?? trip.eta).toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Current location</p>
                  <p className="mt-1 text-sm font-semibold text-text">{trip.lastLocationLabel}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className={`rounded-full px-2.5 py-1 ${sourceHealthTone(trip)}`}>
                  {trip.sourceHealth ?? (trip.isOffline ? 'Offline' : 'Healthy')} source
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                  {trip.delayMinutes > 0 ? `${trip.delayMinutes} min delay` : 'On time'}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                  {trip.routeDeviationKm > 0 ? `${trip.routeDeviationKm} km off route` : 'On planned path'}
                </span>
              </div>
            </div>
          ) : null}
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-500">
            <UserRound className="h-3.5 w-3.5" />
            <span>{trip.driverName}</span>
          </div>
          <p className="mt-1 line-clamp-1 text-[13px] text-gray-500">{trip.customerName}</p>
        </div>
        <div className="shrink-0 pt-1">
          <TrackingStatusBadge status={trip.status} />
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className={`rounded-full px-2.5 py-1 ${sourceHealthTone(trip)}`}>
          {trip.sourceHealth ?? (trip.isOffline ? 'Offline' : 'Healthy')} source
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
          Active: {formatTrackingSource(trip.activeSource ?? trip.currentLocation.source)}
        </span>
      </div>
      <div className="mt-2.5 grid gap-1.5 text-sm text-gray-600">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          <span className="line-clamp-1">{trip.lastLocationLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Gauge className="h-3.5 w-3.5 text-gray-400" />
          <span>
            {trip.trackingDeviceLabel ?? formatTrackingSource(trip.activeSource ?? trip.currentLocation.source)} · {trip.currentLocation.speed ?? 0} km/h · {trip.isOffline ? 'Offline' : 'Online'}
          </span>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
        <span>Updated {new Date(trip.lastUpdatedAt).toLocaleTimeString('en-IN')}</span>
        <span>{trip.routeDeviationKm > 0 ? `${trip.routeDeviationKm} km off route` : 'On planned route'}</span>
      </div>
    </button>
  )
}
