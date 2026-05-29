import type { AlertSeverity, TrackingLocation, TrackingStatus } from './tracking.types'

export type SocketConnectionState =
  | 'Connecting'
  | 'Connected'
  | 'Disconnected'
  | 'Reconnecting'
  | 'Failed'

export type TrackingSocketEvent =
  | {
      type: 'LocationUpdated'
      tripId: string
      location: TrackingLocation
      regionLabel: string
    }
  | {
      type: 'TripStatusChanged'
      tripId: string
      status: TrackingStatus
      changedAt: string
    }
  | {
      type: 'ETAUpdated'
      tripId: string
      currentEta: string
      delayMinutes: number
      etaConfidence: 'Low' | 'Medium' | 'High'
      delayReason: string
      updatedAt: string
    }
  | {
      type: 'AlertRaised'
      tripId: string
      alertId: string
      severity: AlertSeverity
      message: string
      alertType: string
      createdAt: string
      location: string
      vehicleNumber: string
    }
  | {
      type: 'AlertAcknowledged'
      tripId: string
      alertId: string
      acknowledgedBy: string
      updatedAt: string
    }
  | {
      type: 'AlertResolved'
      tripId: string
      alertId: string
      resolvedBy: string
      resolutionNote: string
      updatedAt: string
    }
  | {
      type: 'VehicleOffline'
      tripId: string
      vehicleNumber: string
      updatedAt: string
    }
  | {
      type: 'VehicleOnline'
      tripId: string
      vehicleNumber: string
      updatedAt: string
    }
  | {
      type: 'RouteDeviationDetected'
      tripId: string
      deviationDistanceKm: number
      latitude: number
      longitude: number
      severity: AlertSeverity
      detectedAt: string
    }
  | {
      type: 'GeofenceEntered'
      tripId: string
      geofenceId: string
      geofenceName: string
      latitude: number
      longitude: number
      eventTime: string
    }
  | {
      type: 'GeofenceExited'
      tripId: string
      geofenceId: string
      geofenceName: string
      latitude: number
      longitude: number
      eventTime: string
    }
  | {
      type: 'TripCompleted'
      tripId: string
      completedAt: string
    }
