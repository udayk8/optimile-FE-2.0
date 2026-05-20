import { trackingTrips } from '../store/trackingMockData'
import type { TrackingSocketEvent, SocketConnectionState } from '../types/socket.types'

type EventListener = (event: TrackingSocketEvent) => void
type StateListener = (state: SocketConnectionState) => void

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

class MockTrackingSocket {
  private eventListeners = new Set<EventListener>()
  private stateListeners = new Set<StateListener>()
  private timer: number | null = null
  private trips = clone(trackingTrips)

  subscribe(listener: EventListener) {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  onStateChange(listener: StateListener) {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  connect() {
    this.emitState('Connecting')
    window.setTimeout(() => {
      this.emitState('Connected')
      this.startEmitting()
    }, 300)
  }

  disconnect() {
    if (this.timer) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    this.emitState('Disconnected')
  }

  private startEmitting() {
    if (this.timer) return
    this.timer = window.setInterval(() => {
      const trip = this.trips[Math.floor(Math.random() * this.trips.length)]
      if (!trip) return
      const event = this.buildEvent(trip.id)
      if (event) this.emit(event)
    }, 7000)
  }

  private buildEvent(tripId: string): TrackingSocketEvent | null {
    const trip = this.trips.find((item) => item.id === tripId)
    if (!trip) return null
    const now = new Date().toISOString()
    const regionLabel = trip.lastLocationLabel
    const variants: TrackingSocketEvent[] = [
      {
        type: 'LocationUpdated',
        tripId,
        location: {
          ...trip.currentLocation,
          recordedAt: now,
          speed: Math.max(0, (trip.currentLocation.speed ?? 42) + Math.round(Math.random() * 12 - 6)),
        },
        regionLabel,
      },
      {
        type: 'ETAUpdated',
        tripId,
        currentEta: trip.currentEta ?? trip.eta,
        delayMinutes: Math.max(0, trip.delayMinutes + Math.round(Math.random() * 10 - 4)),
        etaConfidence: trip.delayMinutes > 120 ? 'Low' : trip.delayMinutes > 45 ? 'Medium' : 'High',
        delayReason: trip.routeDeviationKm > 0 ? 'Route Deviation' : trip.idleMinutes ? 'Vehicle Idle' : 'Traffic',
        updatedAt: now,
      },
      {
        type: trip.isOffline ? 'VehicleOnline' : 'VehicleOffline',
        tripId,
        vehicleNumber: trip.vehicleNumber,
        updatedAt: now,
      },
      {
        type: 'GeofenceEntered',
        tripId,
        geofenceId: `GF-${(Math.floor(Math.random() * 3) + 1).toString()}`,
        geofenceName: 'Transit Geofence',
        latitude: trip.currentLocation.latitude,
        longitude: trip.currentLocation.longitude,
        eventTime: now,
      },
      {
        type: 'RouteDeviationDetected',
        tripId,
        deviationDistanceKm: Math.max(4, trip.routeDeviationKm || 6),
        latitude: trip.currentLocation.latitude,
        longitude: trip.currentLocation.longitude,
        severity: trip.routeDeviationKm > 15 ? 'Critical' : 'High',
        detectedAt: now,
      },
    ]
    return variants[Math.floor(Math.random() * variants.length)]
  }

  private emit(event: TrackingSocketEvent) {
    this.eventListeners.forEach((listener) => listener(event))
  }

  private emitState(state: SocketConnectionState) {
    this.stateListeners.forEach((listener) => listener(state))
  }
}

export const trackingSocket = new MockTrackingSocket()
