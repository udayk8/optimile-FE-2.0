import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@shared-ui'
import { useTrackingStore } from '../store/trackingStore'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { ListPageSkeleton } from '../components/shared/ListPageSkeleton'
import { getRoutePerformance } from '../services/analyticsApi'
import type { RoutePerformance } from '../types/analytics.types'
import type { GeofenceEvent, TrackingGeofence } from '../types/geofence.types'
import type { TrackingAlertRecord } from '../types/alert.types'
import type { TrackingTrip } from '../types/tracking.types'

// ─── helpers (duplicated from management page to keep pages self-contained) ───

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const STATIONARY_STATUSES = new Set([
  'At Checkpoint', 'Idle', 'Stopped', 'At Pickup', 'At Destination', 'Unloading', 'Loading',
])

function getDwellMinutes(trip: TrackingTrip, gf: TrackingGeofence): number | null {
  if (!trip.currentLocation) return null
  const distM = haversineKm(trip.currentLocation.latitude, trip.currentLocation.longitude, gf.latitude, gf.longitude) * 1000
  if (distM > gf.radiusMeters) return null
  if (trip.idleMinutes != null && trip.idleMinutes > 0) return trip.idleMinutes
  if (STATIONARY_STATUSES.has(trip.status))
    return Math.floor((Date.now() - new Date(trip.currentLocation.recordedAt).getTime()) / 60000)
  return null
}

function formatDwell(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function dwellClass(minutes: number): string {
  if (minutes >= 120) return 'bg-danger/10 text-danger border-danger/20'
  if (minutes >= 60) return 'bg-warning/10 text-warning border-warning/20'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function getTodayThroughput(gf: TrackingGeofence, events: GeofenceEvent[]): number {
  const today = new Date().toISOString().slice(0, 10)
  return events.filter((e) => e.geofenceId === gf.id && e.eventType === 'GeofenceEntered' && e.eventTime.slice(0, 10) === today).length
}

function severityColor(s: string) {
  if (s === 'Critical') return 'bg-danger/10 text-danger border-danger/20'
  if (s === 'High') return 'bg-orange-50 text-orange-600 border-orange-200'
  if (s === 'Medium') return 'bg-warning/10 text-warning border-warning/20'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    'In Transit': 'bg-primary/10 text-primary',
    'Delayed': 'bg-danger/10 text-danger',
    'Route Deviated': 'bg-orange-100 text-orange-600',
    'At Checkpoint': 'bg-blue-100 text-blue-600',
    'Near Destination': 'bg-teal-100 text-teal-700',
    'Idle': 'bg-gray-100 text-gray-500',
    'Stopped': 'bg-gray-100 text-gray-500',
    'Offline': 'bg-gray-200 text-gray-600',
    'Completed': 'bg-success/10 text-success',
  }
  return map[status] ?? 'bg-gray-100 text-gray-500'
}

function getEtaStatus(trip: TrackingTrip) {
  const etaStr = trip.currentEta ?? trip.eta
  if (!etaStr || !trip.scheduledDeliveryTime) return null
  const eta = new Date(etaStr)
  const scheduled = new Date(trip.scheduledDeliveryTime)
  const diffMin = Math.round((eta.getTime() - scheduled.getTime()) / 60000)
  const etaFmt = eta.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const schedFmt = scheduled.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  if (diffMin <= 15) return { label: 'On time', sub: `ETA ${etaFmt} · Sched ${schedFmt}`, color: 'text-success' }
  if (diffMin <= 60) return { label: `+${diffMin}m late`, sub: `ETA ${etaFmt} · Sched ${schedFmt}`, color: 'text-warning' }
  const h = Math.floor(diffMin / 60), m = diffMin % 60
  return { label: m > 0 ? `+${h}h ${m}m late` : `+${h}h late`, sub: `ETA ${etaFmt} · Sched ${schedFmt}`, color: 'text-danger' }
}

type TripMatchType = 'linked' | 'in-zone'

function getEnrichedLinkedTrips(gf: TrackingGeofence, activeTrips: TrackingTrip[]): { trip: TrackingTrip; matchType: TripMatchType }[] {
  const active = activeTrips.filter((t) => !['Completed', 'Cancelled'].includes(t.status))
  const linkedIds = new Set(gf.linkedEntityType === 'TRIP' ? [gf.linkedEntityId] : [])
  const linked = active.filter((t) => linkedIds.has(t.id)).map((trip) => ({ trip, matchType: 'linked' as TripMatchType }))
  const linkedSet = new Set(linked.map((l) => l.trip.id))
  const inZone = active
    .filter((t) => {
      if (linkedSet.has(t.id) || !t.currentLocation) return false
      return haversineKm(t.currentLocation.latitude, t.currentLocation.longitude, gf.latitude, gf.longitude) * 1000 <= gf.radiusMeters
    })
    .map((trip) => ({ trip, matchType: 'in-zone' as TripMatchType }))
  return [...linked, ...inZone]
}

function getOpenAlerts(gf: TrackingGeofence, activeTrips: TrackingTrip[], alerts: TrackingAlertRecord[]): TrackingAlertRecord[] {
  const tripIds = new Set(
    activeTrips.filter((t) => t.id === gf.linkedEntityId).map((t) => t.id)
  )
  return alerts.filter((a) => tripIds.has(a.tripId) && a.status !== 'Resolved')
}

// ─── type badge colors ────────────────────────────────────────────────────────

const typeColor: Record<string, string> = {
  Pickup: 'bg-blue-100 text-blue-700',
  Drop: 'bg-teal-100 text-teal-700',
  Warehouse: 'bg-indigo-100 text-indigo-700',
  Checkpoint: 'bg-purple-100 text-purple-700',
  'Restricted Zone': 'bg-danger/10 text-danger',
  Yard: 'bg-orange-100 text-orange-600',
  'Customer Site': 'bg-green-100 text-green-700',
  Custom: 'bg-gray-100 text-gray-600',
}

// ─── page ─────────────────────────────────────────────────────────────────────

export function GeofenceDetailPage() {
  const { geofenceId } = useParams<{ geofenceId: string }>()
  const navigate = useNavigate()
  const { scopedPath } = useTrackTraceRouting()
  const { geofences, activeTrips, alerts, geofenceEvents, loading, error, toggleGeofenceStatus, deleteGeofence } = useTrackingStore()

  const [routeRows, setRouteRows] = useState<RoutePerformance[]>([])
  const [pendingDelete, setPendingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => { void getRoutePerformance().then(setRouteRows).catch(() => {}) }, [])

  const geofence = geofences.find((g) => g.id === geofenceId) ?? null

  const linkedTrips = useMemo(
    () => (geofence ? getEnrichedLinkedTrips(geofence, activeTrips) : []),
    [geofence, activeTrips]
  )

  const openAlerts = useMemo(
    () => (geofence ? getOpenAlerts(geofence, activeTrips, alerts) : []),
    [geofence, activeTrips, alerts]
  )

  const zoneEvents = useMemo(
    () => (geofence ? geofenceEvents.filter((e) => e.geofenceId === geofence.id) : []),
    [geofence, geofenceEvents]
  )

  if (loading) return <ListPageSkeleton />
  if (error) return <EmptyPlaceholder title="Could not load zone" description={error} />
  if (!geofence) return (
    <EmptyPlaceholder
      title="Zone not found"
      description="This geofence may have been deleted."
      action={<Button size="sm" onClick={() => navigate(scopedPath('/geofences'))}>Back to Geofences</Button>}
    />
  )

  const worstSeverity = openAlerts.reduce<string | null>((worst, a) => {
    const order = ['Critical', 'High', 'Medium', 'Low']
    if (!worst) return a.severity
    return order.indexOf(a.severity) < order.indexOf(worst) ? a.severity : worst
  }, null)

  const todayCount = getTodayThroughput(geofence, zoneEvents)

  async function handleDelete() {
    setPendingDelete(false)
    try {
      await deleteGeofence(geofence!.id)
      navigate(scopedPath('/geofences'))
    } catch {
      setDeleteError('Could not delete this zone. Please try again.')
      setTimeout(() => setDeleteError(null), 4000)
    }
  }

  return (
    <TrackTraceAccessBoundary page="geofences">
      {/* Delete confirm modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h3 className="text-[14px] font-semibold text-text">Delete {geofence.name}?</h3>
            {(() => {
              const affected = activeTrips.filter((t) => t.id === geofence.linkedEntityId && !['Completed', 'Cancelled'].includes(t.status))
              return affected.length > 0 ? (
                <div className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] text-warning">
                  <span className="font-semibold">{affected.length} active trip{affected.length !== 1 ? 's are' : ' is'} linked</span> — they will stop receiving zone alerts immediately.
                </div>
              ) : null
            })()}
            <p className="mt-2 text-[13px] leading-5 text-gray-600">
              This will permanently remove the <span className="font-semibold">{geofence.type.toLowerCase()}</span> zone. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingDelete(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => void handleDelete()}>Delete zone</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {deleteError && (
          <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-2.5 text-[12px] font-medium text-danger">{deleteError}</div>
        )}

        {/* Back nav */}
        <button
          type="button"
          onClick={() => navigate(scopedPath('/geofences'))}
          className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 transition hover:text-text"
        >
          ← All geofences
        </button>

        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[20px] font-bold text-text">{geofence.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${typeColor[geofence.type] ?? 'bg-gray-100 text-gray-500'}`}>
                {geofence.type}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${geofence.isActive ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'}`}>
                {geofence.isActive ? 'Active' : 'Inactive'}
              </span>
              {worstSeverity && (
                <span className={`rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${severityColor(worstSeverity)}`}>
                  {worstSeverity} alert
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-gray-500">
              {geofence.latitude.toFixed(4)}, {geofence.longitude.toFixed(4)} · {geofence.radiusMeters} m radius
            </p>
            {linkedTrips[0] && geofence.linkedEntityType === 'TRIP' ? (
              <p className="text-[13px] text-gray-400">{linkedTrips[0].trip.origin} → {linkedTrips[0].trip.destination}</p>
            ) : (
              <p className="text-[13px] text-gray-400">{geofence.linkedEntityType} · {geofence.linkedEntityId}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(scopedPath(`/geofences/${geofence.id}/edit`))}>
              Edit zone
            </Button>
            <Button
              variant="outline"
              onClick={() => void toggleGeofenceStatus(geofence.id, !geofence.isActive)}
            >
              {geofence.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button variant="destructive" onClick={() => setPendingDelete(true)}>Delete</Button>
          </div>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2">
          {todayCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[12px] font-medium text-primary">{todayCount} entr{todayCount === 1 ? 'y' : 'ies'} today</span>
          ) : (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[12px] text-gray-400">No entries today</span>
          )}
          {geofence.dwellAlertMinutes ? (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[12px] font-medium text-gray-600">Dwell alert: {geofence.dwellAlertMinutes}m</span>
          ) : (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[12px] text-gray-400">No dwell alert</span>
          )}
          <span className={`rounded-full bg-gray-100 px-3 py-1 text-[12px] ${geofence.entryAlertEnabled ? 'font-medium text-gray-600' : 'text-gray-400'}`}>
            {geofence.entryAlertEnabled ? 'Entry alerts on' : 'Entry alerts off'}
          </span>
        </div>

        {/* Main content grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Linked Trips */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <p className="text-[14px] font-semibold text-text">Linked Trips</p>
                <p className="text-[12px] text-gray-500">Active dispatch trips connected to this zone</p>
              </div>
              {linkedTrips.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(scopedPath('/dispatch') + '?search=' + encodeURIComponent(geofence.linkedEntityId))}
                >
                  View in Dispatch →
                </Button>
              )}
            </div>
            {linkedTrips.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-gray-400">No active trips linked to this zone</p>
                <p className="mt-1 text-[12px] text-gray-400">Trips appear here when dispatched with this zone's entity ID</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {linkedTrips.map(({ trip, matchType }) => {
                  const dwell = getDwellMinutes(trip, geofence)
                  const etaStatus = getEtaStatus(trip)
                  return (
                    <div key={trip.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-semibold text-text">{trip.id}</p>
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${matchType === 'linked' ? 'bg-primary/10 text-primary' : 'bg-orange-100 text-orange-600'}`}>
                              {matchType === 'linked' ? 'Linked' : 'In Zone'}
                            </span>
                          </div>
                          <p className="text-[12px] text-gray-500">{trip.origin} → {trip.destination}</p>
                          {trip.vehicleNumber && (
                            <p className="text-[12px] text-gray-400">{trip.vehicleNumber} · {trip.driverName}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(trip.status)}`}>{trip.status}</span>
                          {dwell !== null && (
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${dwellClass(dwell)}`}>⏱ {formatDwell(dwell)} in zone</span>
                          )}
                          {etaStatus && <span className={`text-[11px] font-semibold ${etaStatus.color}`}>{etaStatus.label}</span>}
                        </div>
                      </div>
                      {etaStatus && <p className="mt-1 text-[11px] text-gray-400">{etaStatus.sub}</p>}
                      {trip.currentLocation && (
                        <p className="mt-1 text-[11px] text-gray-400">Last ping {relativeTime(trip.currentLocation.recordedAt)} · {trip.activeSource}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Open Alerts */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <p className="text-[14px] font-semibold text-text">Open Alerts</p>
                <p className="text-[12px] text-gray-500">Unresolved alerts on linked trips</p>
              </div>
              {openAlerts.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const tripId = linkedTrips[0]?.trip.id
                    navigate(scopedPath('/alerts') + (tripId ? '?tripId=' + encodeURIComponent(tripId) : ''))
                  }}
                >
                  View in Alerts →
                </Button>
              )}
            </div>
            {openAlerts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-gray-400">No open alerts for this zone</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {openAlerts.map((alert) => (
                  <div key={alert.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-text">{alert.type}</p>
                        <p className="mt-0.5 text-[12px] text-gray-500 line-clamp-2">{alert.message}</p>
                        <p className="mt-1 text-[11px] text-gray-400">Trip {alert.tripId} · {alert.vehicleNumber}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${severityColor(alert.severity)}`}>{alert.severity}</span>
                        <span className="text-[11px] text-gray-400">{relativeTime(alert.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Corridor Intelligence */}
        {linkedTrips.length > 0 && (() => {
          const firstTrip = linkedTrips[0].trip
          const laneId = (firstTrip.origin + '-' + firstTrip.destination).toLowerCase().replace(/\s+/g, '-')
          const row = routeRows.find((r) => r.laneId === laneId)
          if (!row) return null
          const delayColor = row.averageDelayMinutes > 90 ? 'text-danger' : row.averageDelayMinutes > 30 ? 'text-warning' : 'text-success'
          const effColor = row.efficiencyScore >= 95 ? 'text-success' : 'text-warning'
          return (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-[14px] font-semibold text-text">Corridor Intelligence</p>
                <p className="text-[12px] text-gray-500">{row.origin} → {row.destination}</p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100 px-0 py-0">
                <div className="px-6 py-4 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Avg delay</p>
                  <p className={`mt-1 text-xl font-extrabold ${delayColor}`}>{row.averageDelayMinutes}m</p>
                </div>
                <div className="px-6 py-4 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Efficiency</p>
                  <p className={`mt-1 text-xl font-extrabold ${effColor}`}>{row.efficiencyScore}%</p>
                </div>
                <div className="px-6 py-4 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Deviations</p>
                  <p className="mt-1 text-xl font-extrabold text-text">{row.deviationCount}</p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Entry / Exit Log */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-[14px] font-semibold text-text">Entry / Exit Log</p>
            <p className="text-[12px] text-gray-500">Recent vehicle movements through this zone</p>
          </div>
          {zoneEvents.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-gray-400">No entry or exit events recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {zoneEvents.map((ev, idx) => {
                const isEntry = ev.eventType === 'GeofenceEntered'
                const nextEv = zoneEvents[idx + 1]
                const dwellMs =
                  !isEntry && nextEv?.eventType === 'GeofenceEntered' && nextEv.tripId === ev.tripId
                    ? new Date(ev.eventTime).getTime() - new Date(nextEv.eventTime).getTime()
                    : null
                const dwellMin = dwellMs !== null ? Math.floor(dwellMs / 60000) : null
                return (
                  <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${isEntry ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'}`}>
                      {isEntry ? '↓' : '↑'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-text">
                        {isEntry ? 'Entered' : 'Exited'} <span className="font-normal text-gray-500">· {ev.tripId}</span>
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(ev.eventTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {dwellMin !== null && (
                          <span className={`ml-2 font-medium ${dwellClass(dwellMin)}`}>· {formatDwell(dwellMin)} dwell</span>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </TrackTraceAccessBoundary>
  )
}
