import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import {
  acknowledgeAlert as acknowledgeAlertApi,
  addAlertRemark,
  assignAlert as assignAlertApi,
  getTrackingAlerts as getTrackingAlertsApi,
  resolveAlert as resolveAlertApi,
} from '../services/alertApi'
import {
  createGeofence,
  deleteGeofence,
  getGeofenceEvents,
  getGeofences,
  toggleGeofenceStatus,
  updateGeofence,
} from '../services/geofenceApi'
import { trackingSocket } from '../services/trackingSocket'
import {
  getActiveTrips,
  getRecentTrackingEvents,
  getTrackingDashboardSummary,
} from '../services/trackingApi'
import { hydrateTrackingTrips, mergeDerivedTrackingAlerts } from '../services/trackingHealth'
import { getAlertRules as getTrackingAlertRulesConfig, getTrackingRules } from '../services/trackingSettingsApi'
import { applySocketEventToAlerts, applySocketEventToGeofenceEvents, applySocketEventToTimeline, applySocketEventToTrips } from './socketStore'
import type { AssignAlertPayload, ResolveAlertPayload, TrackingAlertFilters, TrackingAlertRecord } from '../types/alert.types'
import type { GeofenceEvent, GeofencePayload, TrackingGeofence } from '../types/geofence.types'
import type { AlertRule as TrackingAlertRuleConfig, TrackingRules } from '../types/settings.types'
import type { SocketConnectionState, TrackingSocketEvent } from '../types/socket.types'
import type { TrackingAlert, TrackingDashboardSummary, TrackingDevice, TrackingEvent, TrackingSourceSwitchAuditEntry, TrackingTrip } from '../types/tracking.types'

interface LiveMapFilters {
  showActiveOnly: boolean
  showDelayedOnly: boolean
  showOfflineOnly: boolean
  showRouteDeviationOnly: boolean
  showFallbackOnly: boolean
}

const DEFAULT_LIVE_MAP_FILTERS: LiveMapFilters = {
  showActiveOnly: true,
  showDelayedOnly: false,
  showOfflineOnly: false,
  showRouteDeviationOnly: false,
  showFallbackOnly: false,
}

interface TrackingStoreContextValue {
  loading: boolean
  error: string | null
  activeTrips: TrackingTrip[]
  liveVehicles: TrackingTrip[]
  alerts: TrackingAlertRecord[]
  dashboardSummary: TrackingDashboardSummary | null
  events: TrackingEvent[]
  geofences: TrackingGeofence[]
  geofenceEvents: GeofenceEvent[]
  socketConnectionState: SocketConnectionState
  lastUpdatedAt: string | null
  selectedTripId?: string
  setSelectedTripId: (tripId?: string) => void
  liveMapFilters: LiveMapFilters
  setLiveMapFilters: (patch: Partial<LiveMapFilters>) => void
  switchTripTrackingSource: (tripId: string, deviceId: string, switchedBy: string) => void
  refresh: () => Promise<void>
  acknowledgeAlert: (alertId: string, remarks?: string, acknowledgedBy?: string) => Promise<void>
  resolveAlert: (alertId: string, payload: ResolveAlertPayload) => Promise<void>
  assignAlert: (alertId: string, payload: AssignAlertPayload) => Promise<void>
  addRemark: (alertId: string, remark: string) => Promise<void>
  createGeofence: (payload: GeofencePayload) => Promise<void>
  updateGeofence: (id: string, payload: GeofencePayload) => Promise<void>
  deleteGeofence: (id: string) => Promise<void>
  toggleGeofenceStatus: (id: string, isActive: boolean) => Promise<void>
  filterAlerts: (filters: TrackingAlertFilters) => TrackingAlertRecord[]
}

const TrackingStoreContext = createContext<TrackingStoreContextValue | null>(null)

export function TrackingStoreProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTrips, setActiveTrips] = useState<TrackingTrip[]>([])
  const [alerts, setAlerts] = useState<TrackingAlertRecord[]>([])
  const [dashboardSummary, setDashboardSummary] = useState<TrackingDashboardSummary | null>(null)
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [geofences, setGeofences] = useState<TrackingGeofence[]>([])
  const [geofenceEvents, setGeofenceEvents] = useState<GeofenceEvent[]>([])
  const [socketConnectionState, setSocketConnectionState] = useState<SocketConnectionState>('Connecting')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>()
  const [liveMapFilters, setLiveMapFiltersState] = useState<LiveMapFilters>(DEFAULT_LIVE_MAP_FILTERS)
  const trackingRulesRef = useRef<TrackingRules | null>(null)
  const trackingAlertRulesRef = useRef<TrackingAlertRuleConfig[]>([])

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryResponse, tripsResponse, alertsResponse, eventsResponse, geofencesResponse, geofenceEventsResponse, trackingRulesResponse, alertRuleConfigResponse] = await Promise.all([
        getTrackingDashboardSummary(),
        getActiveTrips(),
        getTrackingAlertsApi(),
        getRecentTrackingEvents(),
        getGeofences(),
        getGeofenceEvents(),
        getTrackingRules(),
        getTrackingAlertRulesConfig(),
      ])

      trackingRulesRef.current = trackingRulesResponse
      trackingAlertRulesRef.current = alertRuleConfigResponse
      const hydratedTrips = hydrateTrackingTrips(tripsResponse, trackingRulesResponse)
      const mergedAlerts = mergeDerivedTrackingAlerts(alertsResponse, hydratedTrips, trackingRulesResponse, alertRuleConfigResponse)

      setDashboardSummary(summaryResponse)
      setActiveTrips(hydratedTrips)
      setAlerts(mergedAlerts)
      setEvents(eventsResponse)
      setGeofences(geofencesResponse)
      setGeofenceEvents(geofenceEventsResponse)
      setSelectedTripId((current) => current ?? hydratedTrips[0]?.id)
      setLastUpdatedAt(new Date().toISOString())
    } catch {
      setError('Track and Trace operational data could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    const unsubscribeEvents = trackingSocket.subscribe((event: TrackingSocketEvent) => {
      setActiveTrips((current) => {
        const baseTrips = applySocketEventToTrips(current, event)
        const rules = trackingRulesRef.current
        const nextTrips = rules ? hydrateTrackingTrips(baseTrips, rules) : baseTrips
        setAlerts((currentAlerts) => {
          const baseAlerts = applySocketEventToAlerts(currentAlerts, event)
          return rules
            ? mergeDerivedTrackingAlerts(baseAlerts, nextTrips, rules, trackingAlertRulesRef.current)
            : baseAlerts
        })
        return nextTrips
      })
      setEvents((current) => applySocketEventToTimeline(current, event))
      setGeofenceEvents((current) => applySocketEventToGeofenceEvents(current, event))
      setLastUpdatedAt(new Date().toISOString())
    })
    const unsubscribeState = trackingSocket.onStateChange((state) => {
      setSocketConnectionState(state)
    })

    trackingSocket.connect()

    return () => {
      unsubscribeEvents()
      unsubscribeState()
      trackingSocket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (socketConnectionState === 'Connected') return

    const poller = window.setInterval(() => {
      void Promise.all([getActiveTrips(), getTrackingAlertsApi(), getTrackingDashboardSummary(), getTrackingRules(), getTrackingAlertRulesConfig()]).then(
        ([tripsResponse, alertsResponse, summaryResponse, trackingRulesResponse, alertRulesResponse]) => {
          trackingRulesRef.current = trackingRulesResponse
          trackingAlertRulesRef.current = alertRulesResponse
          const hydratedTrips = hydrateTrackingTrips(tripsResponse, trackingRulesResponse)
          const mergedAlerts = mergeDerivedTrackingAlerts(alertsResponse, hydratedTrips, trackingRulesResponse, alertRulesResponse)
          setActiveTrips(hydratedTrips)
          setAlerts(mergedAlerts)
          setDashboardSummary(summaryResponse)
          setLastUpdatedAt(new Date().toISOString())
        },
      )
    }, 15000)

    return () => {
      window.clearInterval(poller)
    }
  }, [socketConnectionState])

  useEffect(() => {
    if (!activeTrips.length) return
    const totalActiveTrips = activeTrips.filter((trip) => !['Completed', 'Cancelled'].includes(trip.status)).length
    const inTransitTrips = activeTrips.filter((trip) => ['In Transit', 'At Checkpoint', 'Near Destination', 'Delayed', 'Route Deviated'].includes(trip.status)).length
    const delayedTrips = activeTrips.filter((trip) => trip.delayMinutes > 0 || ['Delayed', 'Offline', 'Route Deviated'].includes(trip.status)).length
    const idleVehicles = activeTrips.filter((trip) => trip.status === 'Idle' || trip.status === 'Stopped').length
    const offlineVehicles = activeTrips.filter((trip) => trip.isOffline).length
    const openAlerts = alerts.filter((alert) => alert.status !== 'Resolved').length
    const averageEtaDelay = activeTrips.length ? Math.round(activeTrips.reduce((total, trip) => total + trip.delayMinutes, 0) / activeTrips.length) : 0
    const onTimePercentage = activeTrips.length ? Math.round((activeTrips.filter((trip) => trip.delayMinutes <= 30).length / activeTrips.length) * 100) : 0

    setDashboardSummary((current) => {
      if (!current) return current
      if (
        current.totalActiveTrips === totalActiveTrips &&
        current.inTransitTrips === inTransitTrips &&
        current.delayedTrips === delayedTrips &&
        current.idleVehicles === idleVehicles &&
        current.offlineVehicles === offlineVehicles &&
        current.openAlerts === openAlerts &&
        current.averageEtaDelay === averageEtaDelay &&
        current.onTimePercentage === onTimePercentage
      ) return current
      return { ...current, totalActiveTrips, inTransitTrips, delayedTrips, idleVehicles, offlineVehicles, openAlerts, averageEtaDelay, onTimePercentage }
    })
  }, [activeTrips, alerts])

  const value = useMemo<TrackingStoreContextValue>(
    () => ({
      loading,
      error,
      activeTrips,
      liveVehicles: activeTrips,
      alerts,
      dashboardSummary,
      events,
      geofences,
      geofenceEvents,
      socketConnectionState,
      lastUpdatedAt,
      selectedTripId,
      setSelectedTripId,
      liveMapFilters,
      setLiveMapFilters: (patch) => setLiveMapFiltersState((current) => ({ ...current, ...patch })),
      switchTripTrackingSource: (tripId, deviceId, switchedBy) => {
        setActiveTrips((current) => {
          const nextTrips = current.map((trip) => {
            if (trip.id !== tripId) return trip

            const targetDevice = trip.trackingDevices?.find((device) => device.id === deviceId)
            const currentDevice = trip.trackingDevices?.find((device) => device.id === trip.activeTrackingDeviceId)
            if (!targetDevice || currentDevice?.id === targetDevice.id) return trip

            const switchedAt = new Date().toISOString()
            const nextAuditEntry: TrackingSourceSwitchAuditEntry = {
              id: `source-switch-${trip.id}-${switchedAt}`,
              tripId: trip.id,
              switchedBy,
              switchedAt,
              fromDeviceId: currentDevice?.id,
              fromSource: currentDevice?.source ?? trip.activeSource,
              toDeviceId: targetDevice.id,
              toSource: targetDevice.source,
              reason: 'Manual Override',
              note: `Switched live map visibility to ${targetDevice.label}.`,
            }

            return {
              ...trip,
              currentLocation: targetDevice.lastReading
                ? { ...targetDevice.lastReading, source: targetDevice.source }
                : trip.currentLocation,
              activeSource: targetDevice.source,
              activeTrackingDeviceId: targetDevice.id,
              manualOverrideSource: targetDevice.source,
              lastSourceSwitchedAt: switchedAt,
              lastSourceSwitchedBy: switchedBy,
              trackingDeviceLabel: targetDevice.label,
              trackingDeviceId: targetDevice.id,
              trackingDevices: trip.trackingDevices?.map((device) => ({
                ...device,
                status: (
                  device.id === targetDevice.id
                    ? 'Active'
                    : device.status === 'Unavailable'
                      ? 'Unavailable'
                      : device.status === 'Faulted'
                        ? 'Faulted'
                        : 'Standby'
                ) as TrackingDevice['status'],
                healthNote:
                  device.id === targetDevice.id
                    ? `Manual override in use since ${new Date(switchedAt).toLocaleTimeString('en-IN')}.`
                    : device.healthNote,
              })),
              sourceSwitchAuditTrail: [
                nextAuditEntry,
                ...(trip.sourceSwitchAuditTrail ?? []),
              ],
            }
          })

          const rules = trackingRulesRef.current
          return rules ? hydrateTrackingTrips(nextTrips, rules) : nextTrips
        })
        setLastUpdatedAt(new Date().toISOString())
      },
      refresh,
      acknowledgeAlert: async (alertId, remarks, acknowledgedBy) => {
        const payload = await acknowledgeAlertApi(alertId, {
          acknowledgedBy: acknowledgedBy ?? 'control.tower@optimile',
          remarks,
        })
        setAlerts((current) =>
          current.map((alert) =>
            alert.id === alertId
              ? {
                  ...alert,
                  status: alert.status === 'Resolved' ? 'Resolved' : 'Acknowledged',
                  acknowledgedBy: payload.acknowledgedBy,
                  acknowledgedAt: payload.updatedAt,
                  remarks: remarks ? [...(alert.remarks ?? []), remarks] : alert.remarks,
                  updatedAt: payload.updatedAt,
                }
              : alert,
          ),
        )
      },
      resolveAlert: async (alertId, payload) => {
        const response = await resolveAlertApi(alertId, payload)
        setAlerts((current) =>
          current.map((alert) =>
            alert.id === alertId
              ? {
                  ...alert,
                  status: 'Resolved',
                  resolvedBy: response.resolvedBy,
                  resolutionNote: response.resolutionNote,
                  updatedAt: response.updatedAt,
                }
              : alert,
          ),
        )
      },
      assignAlert: async (alertId, payload) => {
        const response = await assignAlertApi(alertId, payload)
        setAlerts((current) =>
          current.map((alert) =>
            alert.id === alertId
              ? {
                  ...alert,
                  assignedTo: response.assignedTo,
                  updatedAt: response.updatedAt,
                }
              : alert,
          ),
        )
      },
      addRemark: async (alertId, remark) => {
        await addAlertRemark(alertId, remark)
        setAlerts((current) =>
          current.map((alert) =>
            alert.id === alertId
              ? {
                  ...alert,
                  remarks: [...(alert.remarks ?? []), remark],
                  updatedAt: new Date().toISOString(),
                }
              : alert,
          ),
        )
      },
      createGeofence: async (payload) => {
        const next = await createGeofence(payload)
        setGeofences((current) => [next, ...current])
      },
      updateGeofence: async (id, payload) => {
        const next = await updateGeofence(id, payload)
        setGeofences((current) => current.map((item) => (item.id === id ? next : item)))
      },
      deleteGeofence: async (id) => {
        await deleteGeofence(id)
        setGeofences((current) => current.filter((item) => item.id !== id))
      },
      toggleGeofenceStatus: async (id, isActive) => {
        const next = await toggleGeofenceStatus(id, isActive)
        setGeofences((current) => current.map((item) => (item.id === id ? next : item)))
      },
      filterAlerts: (filters) =>
        alerts.filter((alert) => {
          if (filters.severity && filters.severity !== 'All' && alert.severity !== filters.severity) return false
          if (filters.status && filters.status !== 'All' && alert.status !== filters.status) return false
          if (filters.type && !alert.type.toLowerCase().includes(filters.type.toLowerCase())) return false
          if (filters.tripId && !alert.tripId.toLowerCase().includes(filters.tripId.toLowerCase())) return false
          if (filters.vehicleNumber && !alert.vehicleNumber.toLowerCase().includes(filters.vehicleNumber.toLowerCase())) return false
          return true
        }),
    }),
    [activeTrips, alerts, dashboardSummary, error, events, geofenceEvents, geofences, lastUpdatedAt, liveMapFilters, loading, selectedTripId, socketConnectionState],
  )

  return <TrackingStoreContext.Provider value={value}>{children}</TrackingStoreContext.Provider>
}

export function useTrackingStore() {
  const context = useContext(TrackingStoreContext)
  if (!context) {
    throw new Error('useTrackingStore must be used inside TrackingStoreProvider')
  }
  return context
}
