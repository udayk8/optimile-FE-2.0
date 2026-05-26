import type { TrackingAlertRecord } from '../types/alert.types'
import type { AlertRule as TrackingAlertRuleConfig, TrackingRules } from '../types/settings.types'
import type { AlertSeverity, TrackingDevice, TrackingSource, TrackingTrip } from '../types/tracking.types'

function getTripTimestamp(trip: TrackingTrip) {
  return new Date(trip.lastUpdatedAt).getTime()
}

function resolveFreshestTimestamp(trips: TrackingTrip[]) {
  return trips.reduce((latest, trip) => Math.max(latest, getTripTimestamp(trip)), 0)
}

function resolveSourceHealth(
  trip: TrackingTrip,
  rules: TrackingRules,
  freshestTimestamp: number,
): TrackingTrip['sourceHealth'] {
  if (trip.isOffline) return 'Offline'
  const activeTrackingDevice = trip.trackingDevices?.find((device) => device.id === trip.activeTrackingDeviceId)
  if (activeTrackingDevice && activeTrackingDevice.role !== 'PRIMARY') return 'Fallback'
  if (trip.activeSource && trip.primarySource && trip.activeSource !== trip.primarySource) return 'Fallback'

  const staleThresholdMs = rules.stalePingThresholdMinutes * 60 * 1000
  if (freshestTimestamp - getTripTimestamp(trip) > staleThresholdMs) return 'Stale'

  return 'Healthy'
}

export function hydrateTrackingTrips(trips: TrackingTrip[], rules: TrackingRules): TrackingTrip[] {
  const freshestTimestamp = resolveFreshestTimestamp(trips)

  return trips.map((trip) => {
    const activeTrackingDevice =
      trip.trackingDevices?.find((device) => device.id === trip.activeTrackingDeviceId) ??
      trip.trackingDevices?.find((device) => device.status === 'Active')
    const activeSource =
      activeTrackingDevice?.source ??
      trip.currentLocation.source ??
      trip.activeSource ??
      trip.primarySource ??
      rules.preferredFallbackSource
    const primaryTrackingDevice = trip.trackingDevices?.find((device) => device.role === 'PRIMARY')
    const trackingDevices = trip.trackingDevices?.map((device) => ({
      ...device,
      status: (
        device.id === activeTrackingDevice?.id ? 'Active' : device.status === 'Unavailable' ? 'Unavailable' : device.status === 'Faulted' ? 'Faulted' : 'Standby'
      ) as TrackingDevice['status'],
    }))

    return {
      ...trip,
      currentLocation: activeTrackingDevice?.lastReading ? { ...activeTrackingDevice.lastReading, source: activeTrackingDevice.source } : trip.currentLocation,
      activeSource,
      primarySource: primaryTrackingDevice?.source ?? trip.primarySource ?? activeSource,
      trackingDevices,
      activeTrackingDeviceId: activeTrackingDevice?.id ?? trip.activeTrackingDeviceId,
      trackingDeviceLabel: activeTrackingDevice?.label ?? trip.trackingDeviceLabel,
      trackingDeviceId: activeTrackingDevice?.id ?? trip.trackingDeviceId,
      sourceHealth: resolveSourceHealth(
        {
          ...trip,
          trackingDevices,
          activeTrackingDeviceId: activeTrackingDevice?.id ?? trip.activeTrackingDeviceId,
          activeSource,
          primarySource: primaryTrackingDevice?.source ?? trip.primarySource ?? activeSource,
        },
        rules,
        freshestTimestamp,
      ),
    }
  })
}

function findRule(rules: TrackingAlertRuleConfig[], alertType: string) {
  return rules.find((rule) => rule.alertType === alertType && rule.isEnabled)
}

function buildDerivedAlert(
  id: string,
  alertType: string,
  severity: AlertSeverity,
  trip: TrackingTrip,
  message: string,
): TrackingAlertRecord {
  return {
    id,
    tripId: trip.id,
    vehicleNumber: trip.vehicleNumber,
    type: alertType,
    severity,
    status: 'Open',
    message,
    location: trip.lastLocationLabel,
    createdAt: trip.lastUpdatedAt,
  }
}

function withExistingState(alert: TrackingAlertRecord, existing?: TrackingAlertRecord): TrackingAlertRecord {
  if (!existing) return alert
  return {
    ...alert,
    acknowledgedBy: existing.acknowledgedBy,
    assignedTo: existing.assignedTo,
    auditTrail: existing.auditTrail,
    remarks: existing.remarks,
    resolutionNote: existing.resolutionNote,
    resolvedBy: existing.resolvedBy,
    status: existing.status,
    updatedAt: existing.updatedAt,
  }
}

export function mergeDerivedTrackingAlerts(
  baseAlerts: TrackingAlertRecord[],
  trips: TrackingTrip[],
  rules: TrackingRules,
  alertRules: TrackingAlertRuleConfig[],
): TrackingAlertRecord[] {
  const existingById = new Map(baseAlerts.map((alert) => [alert.id, alert]))
  const derivedAlerts: TrackingAlertRecord[] = []

  for (const trip of trips) {
    const routeDeviationKm = trip.routeDeviationKm ?? 0
    if (trip.isOffline) {
      const rule = findRule(alertRules, 'Vehicle Offline')
      if (rule) {
        derivedAlerts.push(
          withExistingState(
            buildDerivedAlert(
              `SYS-OFFLINE-${trip.id}`,
              'Vehicle Offline',
              rule.severity,
              trip,
              `${trip.vehicleNumber} is offline. Last signal from ${trip.lastLocationLabel}.`,
            ),
            existingById.get(`SYS-OFFLINE-${trip.id}`),
          ),
        )
      }
    }

    if (trip.sourceHealth === 'Fallback' && trip.activeSource && trip.primarySource) {
      const rule = findRule(alertRules, 'Tracking Source Fallback')
      if (rule) {
        derivedAlerts.push(
          withExistingState(
            buildDerivedAlert(
              `SYS-FALLBACK-${trip.id}`,
              'Tracking Source Fallback',
              rule.severity,
              trip,
              `${trip.vehicleNumber} switched from ${trip.primarySource} to ${trip.activeSource}.`,
            ),
            existingById.get(`SYS-FALLBACK-${trip.id}`),
          ),
        )
      }
    }

    const freshestTimestamp = resolveFreshestTimestamp(trips)
    if (!trip.isOffline && freshestTimestamp - getTripTimestamp(trip) > rules.stalePingThresholdMinutes * 60 * 1000) {
      const rule = findRule(alertRules, 'Stale Ping')
      if (rule) {
        derivedAlerts.push(
          withExistingState(
            buildDerivedAlert(
              `SYS-STALE-${trip.id}`,
              'Stale Ping',
              rule.severity,
              trip,
              `${trip.vehicleNumber} has not received a fresh location update within the configured threshold.`,
            ),
            existingById.get(`SYS-STALE-${trip.id}`),
          ),
        )
      }
    }

    if (routeDeviationKm * 1000 >= rules.routeDeviationThresholdMeters) {
      const rule = findRule(alertRules, 'Route Deviation')
      if (rule) {
        derivedAlerts.push(
          withExistingState(
            buildDerivedAlert(
              `SYS-ROUTEDEV-${trip.id}`,
              'Route Deviation',
              rule.severity,
              trip,
              `${trip.vehicleNumber} is ${routeDeviationKm.toFixed(1)} km off the planned route.`,
            ),
            existingById.get(`SYS-ROUTEDEV-${trip.id}`),
          ),
        )
      }
    }
  }

  const derivedIds = new Set(derivedAlerts.map((alert) => alert.id))
  const mergedBaseAlerts = baseAlerts.filter((alert) => !derivedIds.has(alert.id))

  return [...derivedAlerts, ...mergedBaseAlerts]
}

export function resolvePreferredFallbackSource(source?: TrackingSource): TrackingSource {
  return source ?? 'DRIVER_APP'
}
