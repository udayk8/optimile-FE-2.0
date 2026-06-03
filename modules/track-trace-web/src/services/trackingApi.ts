import {
  trackingAlerts,
  trackingDashboardSummary,
  trackingEvents,
  trackingTrips,
} from '../store/trackingMockData'
import type {
  CustomerTrackingView,
  TrackingAlert,
  TrackingDashboardSummary,
  TrackingEvent,
  TrackingLocation,
  TripReplay,
  TrackingTrip,
} from '../types/tracking.types'
import { getCustomerSafeTracking as getCustomerSafeTrackingFromService, toCustomerTrackingView } from './customerTrackingApi'
import { findBookingTrip, getBookingResolvableTrips } from '../integration/bookingTrackingBridge'

const USE_MOCK_TRACKING = import.meta.env.VITE_USE_MOCK_TRACKING !== 'false'
const TRACKING_API_BASE_URL = import.meta.env.VITE_TRACKING_API_BASE_URL ?? '/api/tracking'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function resolveAfter<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(clone(value)), ms)
  })
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${TRACKING_API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`Tracking API request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

function normalizeTrip(trip: TrackingTrip): TrackingTrip {
  return {
    ...trip,
    tenantId: trip.tenantId ?? 'tenant-optimile',
    plannedEta: trip.plannedEta ?? trip.scheduledDeliveryTime,
    currentEta: trip.currentEta ?? trip.eta,
    lastRecalculatedAt: trip.lastRecalculatedAt ?? trip.lastUpdatedAt,
    etaConfidence: trip.etaConfidence ?? (trip.delayMinutes > 120 ? 'Low' : trip.delayMinutes > 45 ? 'Medium' : 'High'),
    delayReason: trip.delayReason ?? (trip.routeDeviationKm > 0 ? 'Route Deviation' : trip.idleMinutes ? 'Vehicle Idle' : trip.delayMinutes > 0 ? 'Traffic' : 'Unknown'),
  }
}

function buildTripReplayFromTrip(trip: TrackingTrip): TripReplay {
  const locations = trip.actualRoute.length ? trip.actualRoute : trip.plannedRoute
  const speeds = locations.map((location) => location.speed ?? 40)
  const idleMinutes = trip.idleMinutes ?? (trip.status === 'Idle' || trip.status === 'Stopped' ? 45 : 0)

  return {
    tripId: trip.id,
    vehicleNumber: trip.vehicleNumber,
    driverName: trip.driverName,
    startTime: trip.actualPickupTime ?? trip.scheduledPickupTime,
    endTime: trip.lastUpdatedAt,
    locations,
    events: trackingEvents.filter((event) => event.tripId === trip.id),
    alerts: trackingAlerts.filter((alert) => alert.tripId === trip.id),
    totalDistanceKm: trip.distanceCoveredKm,
    totalIdleMinutes: idleMinutes,
    maxSpeed: Math.max(...speeds),
    averageSpeed: Math.round(speeds.reduce((total, speed) => total + speed, 0) / speeds.length),
  }
}

export async function getTrackingDashboardSummary(): Promise<TrackingDashboardSummary> {
  if (!USE_MOCK_TRACKING) {
    return fetchJson<TrackingDashboardSummary>('/dashboard-summary')
  }
  return resolveAfter(trackingDashboardSummary)
}

export async function getActiveTrips(filters?: {
  search?: string
  status?: string
  delayedOnly?: boolean
}): Promise<TrackingTrip[]> {
  if (!USE_MOCK_TRACKING) {
    return fetchJson<TrackingTrip[]>('/trips').then((rows) => rows.map(normalizeTrip))
  }

  const normalizedSearch = filters?.search?.trim().toLowerCase()
  // Bridge: real tenant booking/delivery trips (empty when standalone).
  const rows = [...getBookingResolvableTrips(), ...trackingTrips]
    .map(normalizeTrip)
    .filter((trip) => {
      if (filters?.status && filters.status !== 'All' && trip.status !== filters.status) return false
      if (filters?.delayedOnly && trip.delayMinutes <= 0) return false
      if (
        normalizedSearch &&
        ![
          trip.id,
          trip.bookingId,
          trip.vehicleNumber,
          trip.customerName,
        ].some((value) => value.toLowerCase().includes(normalizedSearch))
      ) {
        return false
      }
      return true
    })

  return resolveAfter(rows)
}

export async function getTripById(tripId: string): Promise<TrackingTrip | undefined> {
  if (!USE_MOCK_TRACKING) {
    return fetchJson<TrackingTrip>(`/trips/${tripId}`).then(normalizeTrip)
  }
  const trip = trackingTrips.find((item) => item.id === tripId) ?? findBookingTrip(tripId)
  return resolveAfter(trip ? normalizeTrip(trip) : undefined)
}

export async function getTripTimeline(tripId: string): Promise<TrackingEvent[]> {
  if (!USE_MOCK_TRACKING) {
    return fetchJson<TrackingEvent[]>(`/trips/${tripId}/timeline`)
  }
  return resolveAfter(
    trackingEvents
      .filter((event) => event.tripId === tripId)
      .sort((left, right) => new Date(right.eventTime).getTime() - new Date(left.eventTime).getTime()),
  )
}

export async function getTrackingAlerts(): Promise<TrackingAlert[]> {
  if (!USE_MOCK_TRACKING) {
    return fetchJson<TrackingAlert[]>('/alerts')
  }
  return resolveAfter(trackingAlerts)
}

export async function getLiveVehicles(): Promise<TrackingTrip[]> {
  if (!USE_MOCK_TRACKING) {
    return fetchJson<TrackingTrip[]>('/live-vehicles').then((rows) => rows.map(normalizeTrip))
  }
  return resolveAfter(
    trackingTrips
      .filter((trip) => trip.status !== 'Completed' && trip.status !== 'Cancelled')
      .map(normalizeTrip),
  )
}

export async function getRecentTrackingEvents(limit = 8): Promise<TrackingEvent[]> {
  if (!USE_MOCK_TRACKING) {
    return fetchJson<TrackingEvent[]>(`/events?limit=${limit}`)
  }
  const items = [...trackingEvents].sort(
    (left, right) => new Date(right.eventTime).getTime() - new Date(left.eventTime).getTime(),
  )
  return resolveAfter(items.slice(0, limit))
}

export async function getTripLocations(tripId: string): Promise<TrackingLocation[]> {
  if (!USE_MOCK_TRACKING) {
    return fetchJson<TrackingLocation[]>(`/trips/${tripId}/locations`)
  }
  const trip = trackingTrips.find((item) => item.id === tripId)
  return resolveAfter(trip ? trip.actualRoute : [])
}

export async function getTripReplay(tripId: string): Promise<TripReplay | undefined> {
  if (!USE_MOCK_TRACKING) {
    return fetchJson<TripReplay>(`/trips/${tripId}/replay`)
  }
  const trip = trackingTrips.find((item) => item.id === tripId)
  return resolveAfter(trip ? buildTripReplayFromTrip(normalizeTrip(trip)) : undefined)
}

export async function getVehicleCurrentLocation(vehicleId: string): Promise<TrackingLocation | undefined> {
  if (!USE_MOCK_TRACKING) {
    return fetchJson<TrackingLocation>(`/vehicles/${vehicleId}/location`)
  }
  const trip = trackingTrips.find((item) => item.vehicleNumber === vehicleId || item.id === vehicleId)
  return resolveAfter(trip?.currentLocation)
}

export async function getCustomerSafeTracking(tripId: string): Promise<CustomerTrackingView | undefined> {
  if (!USE_MOCK_TRACKING) {
    return fetchJson<CustomerTrackingView>(`/trips/${tripId}/customer-view`)
  }
  return getCustomerSafeTrackingFromService(tripId)
}

export { USE_MOCK_TRACKING, TRACKING_API_BASE_URL, normalizeTrip, buildTripReplayFromTrip, toCustomerTrackingView }
