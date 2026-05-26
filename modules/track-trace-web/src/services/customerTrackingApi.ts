import { trackingAlerts, trackingEvents, trackingTrips } from '../store/trackingMockData'
import type { CustomerTrackingView, TrackingTrip } from '../types/tracking.types'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function resolveAfter<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(clone(value)), ms)
  })
}

export function toCustomerTrackingView(trip: TrackingTrip): CustomerTrackingView {
  const publicTimeline = trackingEvents
    .filter((event) => event.tripId === trip.id && !['Alert Raised', 'Stop Alert'].includes(event.type))
    .slice(0, 5)
    .map((event) => ({
      title: event.title,
      time: event.eventTime,
      location: event.location,
    }))

  return {
    bookingId: trip.bookingId,
    currentStatus: trip.customerSafeStatus,
    origin: trip.origin,
    destination: trip.destination,
    eta: trip.currentEta ?? trip.eta,
    delayStatus: trip.delayMinutes > 0 ? `${trip.delayMinutes} min delay` : 'On time',
    publicTimeline,
    lastUpdatedAt: trip.lastUpdatedAt,
    podStatus: trip.status === 'Completed' ? 'Delivered' : 'Pending',
    currentRegion: trip.lastLocationLabel,
  }
}

export async function getCustomerSafeTracking(tripId: string): Promise<CustomerTrackingView | undefined> {
  const trip = trackingTrips.find((item) => item.id === tripId)
  return resolveAfter(trip ? toCustomerTrackingView(trip) : undefined)
}
