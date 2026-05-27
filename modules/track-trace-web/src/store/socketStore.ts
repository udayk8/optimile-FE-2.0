import type { GeofenceEvent } from '../types/geofence.types'
import type { TrackingAlertRecord } from '../types/alert.types'
import type { TrackingEvent, TrackingTrip } from '../types/tracking.types'
import type { TrackingSocketEvent } from '../types/socket.types'

export function applySocketEventToTrips(trips: TrackingTrip[], event: TrackingSocketEvent): TrackingTrip[] {
  return trips.map((trip) => {
    if (trip.id !== event.tripId) return trip

    switch (event.type) {
      case 'LocationUpdated':
        return {
          ...trip,
          currentLocation: event.location,
          lastUpdatedAt: event.location.recordedAt,
          lastLocationLabel: event.regionLabel,
          isOffline: false,
        }
      case 'TripStatusChanged':
        return {
          ...trip,
          status: event.status,
          lastUpdatedAt: event.changedAt,
        }
      case 'ETAUpdated':
        return {
          ...trip,
          eta: event.currentEta,
          currentEta: event.currentEta,
          delayMinutes: event.delayMinutes,
          etaConfidence: event.etaConfidence,
          delayReason: event.delayReason as TrackingTrip['delayReason'],
          lastRecalculatedAt: event.updatedAt,
          lastUpdatedAt: event.updatedAt,
        }
      case 'VehicleOffline':
        return {
          ...trip,
          isOffline: true,
          status: trip.status === 'Completed' ? trip.status : 'Offline',
          lastUpdatedAt: event.updatedAt,
        }
      case 'VehicleOnline':
        return {
          ...trip,
          isOffline: false,
          status: trip.status === 'Offline' ? 'In Transit' : trip.status,
          lastUpdatedAt: event.updatedAt,
        }
      case 'RouteDeviationDetected':
        return {
          ...trip,
          routeDeviationKm: event.deviationDistanceKm,
          status: 'Route Deviated',
          lastUpdatedAt: event.detectedAt,
        }
      case 'TripCompleted':
        return {
          ...trip,
          status: 'Completed',
          delayMinutes: 0,
          remainingDistanceKm: 0,
          lastUpdatedAt: event.completedAt,
        }
      default:
        return trip
    }
  })
}

export function applySocketEventToAlerts(alerts: TrackingAlertRecord[], event: TrackingSocketEvent): TrackingAlertRecord[] {
  switch (event.type) {
    case 'AlertRaised':
      return [
        {
          id: event.alertId,
          tripId: event.tripId,
          vehicleNumber: event.vehicleNumber,
          type: event.alertType,
          severity: event.severity,
          status: 'Open',
          message: event.message,
          location: event.location,
          createdAt: event.createdAt,
        },
        ...alerts,
      ]
    case 'AlertAcknowledged':
      return alerts.map((alert) =>
        alert.id === event.alertId
          ? {
              ...alert,
              status: alert.status === 'Resolved' ? 'Resolved' : 'Acknowledged',
              acknowledgedBy: event.acknowledgedBy,
              updatedAt: event.updatedAt,
            }
          : alert,
      )
    case 'AlertResolved':
      return alerts.map((alert) =>
        alert.id === event.alertId
          ? {
              ...alert,
              status: 'Resolved',
              resolvedBy: event.resolvedBy,
              resolutionNote: event.resolutionNote,
              updatedAt: event.updatedAt,
            }
          : alert,
      )
    case 'RouteDeviationDetected':
      return [
        {
          id: `AL-${event.tripId}-${event.detectedAt}`,
          tripId: event.tripId,
          vehicleNumber: '',
          type: 'Route Deviation',
          severity: event.severity,
          status: 'Open',
          message: `Route deviation detected (${event.deviationDistanceKm} km off route).`,
          location: `${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}`,
          createdAt: event.detectedAt,
        },
        ...alerts,
      ]
    default:
      return alerts
  }
}

export function applySocketEventToTimeline(events: TrackingEvent[], event: TrackingSocketEvent): TrackingEvent[] {
  const timelineEvent: TrackingEvent | null =
    event.type === 'LocationUpdated'
      ? {
          id: `EV-${event.tripId}-${event.location.recordedAt}`,
          tripId: event.tripId,
          type: 'Location Update',
          title: 'Live location updated',
          description: `Vehicle reported from ${event.regionLabel}.`,
          eventTime: event.location.recordedAt,
          location: event.regionLabel,
        }
      : event.type === 'ETAUpdated'
        ? {
            id: `EV-${event.tripId}-${event.updatedAt}`,
            tripId: event.tripId,
            type: 'ETA Update',
            title: 'ETA recalculated',
            description: `ETA shifted to ${new Date(event.currentEta).toLocaleString('en-IN')} due to ${event.delayReason}.`,
            eventTime: event.updatedAt,
          }
        : event.type === 'TripStatusChanged'
          ? {
              id: `EV-${event.tripId}-${event.changedAt}`,
              tripId: event.tripId,
              type: 'Trip Status',
              title: `Status changed to ${event.status}`,
              description: 'Trip state was updated from the live tracking feed.',
              eventTime: event.changedAt,
            }
          : event.type === 'GeofenceEntered' || event.type === 'GeofenceExited'
            ? {
                id: `EV-${event.tripId}-${event.eventTime}`,
                tripId: event.tripId,
                type: event.type,
                title: `${event.geofenceName} ${event.type === 'GeofenceEntered' ? 'entered' : 'exited'}`,
                description: 'Geofence activity was captured from the live movement stream.',
                eventTime: event.eventTime,
              }
            : event.type === 'TripCompleted'
              ? {
                  id: `EV-${event.tripId}-${event.completedAt}`,
                  tripId: event.tripId,
                  type: 'Trip Completed',
                  title: 'Trip marked completed',
                  description: 'Trip completion event received from the live feed.',
                  eventTime: event.completedAt,
                }
              : null

  if (!timelineEvent) return events

  return [timelineEvent, ...events].sort(
    (left, right) => new Date(right.eventTime).getTime() - new Date(left.eventTime).getTime(),
  )
}

export function applySocketEventToGeofenceEvents(
  geofenceEvents: GeofenceEvent[],
  event: TrackingSocketEvent,
): GeofenceEvent[] {
  if (event.type !== 'GeofenceEntered' && event.type !== 'GeofenceExited') {
    return geofenceEvents
  }

  return [
    {
      id: `${event.geofenceId}-${event.eventTime}`,
      tripId: event.tripId,
      geofenceId: event.geofenceId,
      geofenceName: event.geofenceName,
      eventType: event.type,
      eventTime: event.eventTime,
      latitude: event.latitude,
      longitude: event.longitude,
    },
    ...geofenceEvents,
  ]
}
