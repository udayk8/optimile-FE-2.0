import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card } from '@shared-ui'
import { Crosshair, Layers3, Minus, Plus, Radio, Truck } from 'lucide-react'
import { EmptyPlaceholder } from './EmptyPlaceholder'
import { useGoogleMapsApi } from '../hooks/useGoogleMapsApi'
import { VehicleMarker } from './VehicleMarker'
import type { GeofenceEvent } from '../types/geofence.types'
import type { SocketConnectionState } from '../types/socket.types'
import type { TrackingDevice, TrackingSource, TrackingTrip } from '../types/tracking.types'

type OverlayRecord = {
  marker?: any
  polyline?: any
}

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

function deviceStatusTone(device: TrackingDevice) {
  if (device.status === 'Faulted' || device.status === 'Unavailable') return 'bg-danger/10 text-danger'
  if (device.status === 'Active') return 'bg-primary/10 text-primary'
  return 'bg-gray-100 text-gray-600'
}

export function LiveMapPanel({
  trips,
  selectedTripId,
  onSelectTrip,
  onSwitchTrackingSource,
  geofenceEvents = [],
  socketConnectionState = 'Disconnected',
  lastUpdatedAt,
  showSelectedTripWorkbench = true,
}: {
  trips: TrackingTrip[]
  selectedTripId?: string
  onSelectTrip?: (tripId: string) => void
  onSwitchTrackingSource?: (tripId: string, deviceId: string) => void
  geofenceEvents?: GeofenceEvent[]
  socketConnectionState?: SocketConnectionState
  lastUpdatedAt?: string | null
  showHealthBanner?: boolean
  showSelectedTripWorkbench?: boolean
}) {
  const [workbenchView, setWorkbenchView] = useState<'overview' | 'sources' | 'activity'>('overview')
  const [queueView, setQueueView] = useState<'all' | 'issues' | 'offline' | 'delayed'>('all')
  const [pendingSourceSwitch, setPendingSourceSwitch] = useState<{ deviceId: string; deviceLabel: string } | null>(null)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const { isLoaded, error } = useGoogleMapsApi(apiKey)
  const mapNodeRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const overlaysRef = useRef<OverlayRecord[]>([])
  const mapInteractionBoundRef = useRef(false)
  const userAdjustedViewportRef = useRef(false)
  const lastFocusedTripIdRef = useRef<string | null>(null)

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? trips[0] ?? null,
    [selectedTripId, trips],
  )
  const selectedTripTrackingDevices = selectedTrip?.trackingDevices ?? []
  const latestSourceSwitch = selectedTrip?.sourceSwitchAuditTrail?.[0]
  const activeTrackingDevice = selectedTripTrackingDevices.find((device) => device.id === selectedTrip?.activeTrackingDeviceId)
  const alternateTrackingDevices = selectedTripTrackingDevices.filter((device) => device.id !== selectedTrip?.activeTrackingDeviceId)
  const reachedCheckpointCount = selectedTrip?.checkpoints.filter((checkpoint) => checkpoint.status === 'Reached').length ?? 0
  const actualRoutePointCount = selectedTrip?.actualRoute.length ?? 0
  const plannedRoutePointCount = selectedTrip?.plannedRoute.length ?? 0
  const selectedTripGeofenceEvents = geofenceEvents
    .filter((event) => event.tripId === selectedTrip?.id)
    .slice(0, 4)
  const queueTrips = useMemo(() => {
    if (queueView === 'issues') {
      return trips.filter((trip) => trip.isOffline || trip.delayMinutes > 0 || trip.routeDeviationKm > 0 || (trip.sourceHealth ?? 'Healthy') !== 'Healthy')
    }
    if (queueView === 'offline') {
      return trips.filter((trip) => trip.isOffline || trip.status === 'Offline' || (trip.sourceHealth ?? 'Healthy') === 'Offline')
    }
    if (queueView === 'delayed') {
      return trips.filter((trip) => trip.delayMinutes > 0 || trip.status === 'Delayed')
    }
    return trips
  }, [queueView, trips])

  useEffect(() => {
    setWorkbenchView('overview')
  }, [selectedTrip?.id])

  useEffect(() => {
    setQueueView('all')
  }, [selectedTripId])

  useEffect(() => {
    if (!isLoaded || !mapNodeRef.current) return

    const googleMaps = window.google?.maps
    if (!googleMaps) return

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new googleMaps.Map(mapNodeRef.current, {
        center: selectedTrip
          ? { lat: selectedTrip.currentLocation.latitude, lng: selectedTrip.currentLocation.longitude }
          : { lat: 20.5937, lng: 78.9629 },
        zoom: 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
      })
    }

    const map = mapInstanceRef.current
    if (!mapInteractionBoundRef.current) {
      map.addListener('dragstart', () => {
        userAdjustedViewportRef.current = true
      })
      map.addListener('zoom_changed', () => {
        userAdjustedViewportRef.current = true
      })
      mapInteractionBoundRef.current = true
    }

    overlaysRef.current.forEach((overlay) => {
      overlay.marker?.setMap?.(null)
      overlay.polyline?.setMap?.(null)
    })
    overlaysRef.current = []

    const allTripsBounds = new googleMaps.LatLngBounds()
    const selectedTripBounds = new googleMaps.LatLngBounds()

    trips.forEach((trip) => {
      const marker = new googleMaps.Marker({
        map,
        position: { lat: trip.currentLocation.latitude, lng: trip.currentLocation.longitude },
        title: `${trip.bookingId} · ${trip.vehicleNumber}`,
        label: trip.isOffline ? 'O' : trip.delayMinutes > 0 ? 'D' : 'A',
        icon: {
          path: googleMaps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: trip.id === selectedTrip?.id ? 6 : 5,
          fillColor: trip.isOffline ? 'var(--color-danger)' : trip.delayMinutes > 0 ? 'var(--color-warning)' : 'var(--color-primary)',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          rotation: 90,
        },
        zIndex: trip.id === selectedTrip?.id ? 1000 : 10,
      })
      if (onSelectTrip) {
        marker.addListener('click', () => {
          userAdjustedViewportRef.current = false
          onSelectTrip(trip.id)
        })
      }
      overlaysRef.current.push({ marker })
      allTripsBounds.extend(marker.getPosition())
      if (trip.id === selectedTrip?.id) {
        selectedTripBounds.extend(marker.getPosition())
      }
    })

    if (selectedTrip) {
      const plannedPath = selectedTrip.plannedRoute.map((point) => ({ lat: point.latitude, lng: point.longitude }))
      const actualPath = selectedTrip.actualRoute.map((point) => ({ lat: point.latitude, lng: point.longitude }))

      const plannedPolyline = new googleMaps.Polyline({
        map,
        path: plannedPath,
        strokeColor: 'var(--color-secondary)',
        strokeOpacity: 0.9,
        strokeWeight: 3,
      })
      const actualPolyline = new googleMaps.Polyline({
        map,
        path: actualPath,
        strokeColor: 'var(--color-primary)',
        strokeOpacity: 0.9,
        strokeWeight: 4,
      })
      overlaysRef.current.push({ polyline: plannedPolyline }, { polyline: actualPolyline })

      selectedTrip.checkpoints.forEach((checkpoint, index) => {
        const marker = new googleMaps.Marker({
          map,
          position: { lat: checkpoint.location.latitude, lng: checkpoint.location.longitude },
          title: checkpoint.name,
          label: String(index + 1),
        })
      overlaysRef.current.push({ marker })
        allTripsBounds.extend(marker.getPosition())
        selectedTripBounds.extend(marker.getPosition())
      })
    }

    geofenceEvents.slice(0, 12).forEach((event) => {
      const marker = new googleMaps.Marker({
        map,
        position: { lat: event.latitude, lng: event.longitude },
        title: `${event.geofenceName} · ${event.eventType}`,
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: event.eventType === 'GeofenceEntered' ? 'var(--color-success)' : 'var(--color-warning)',
          fillOpacity: 0.95,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        },
      })
      overlaysRef.current.push({ marker })
      allTripsBounds.extend(marker.getPosition())
      if (event.tripId === selectedTrip?.id) {
        selectedTripBounds.extend(marker.getPosition())
      }
    })

    const selectedTripChanged = lastFocusedTripIdRef.current !== (selectedTrip?.id ?? null)

    if (selectedTrip && selectedTripChanged && !selectedTripBounds.isEmpty()) {
      userAdjustedViewportRef.current = false
      map.fitBounds(selectedTripBounds, 64)
    } else if (!selectedTrip && !userAdjustedViewportRef.current && !allTripsBounds.isEmpty()) {
      map.fitBounds(allTripsBounds, 48)
    }

    lastFocusedTripIdRef.current = selectedTrip?.id ?? null
  }, [geofenceEvents, isLoaded, selectedTrip, trips])

  function zoomMap(delta: number) {
    const map = mapInstanceRef.current
    if (!map) return
    const currentZoom = map.getZoom?.() ?? 5
    map.setZoom(currentZoom + delta)
  }

  function focusSelectedTrip() {
    if (!selectedTrip || !mapInstanceRef.current) return
    userAdjustedViewportRef.current = false
    lastFocusedTripIdRef.current = null
    if (onSelectTrip) {
      onSelectTrip(selectedTrip.id)
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid h-[calc(100vh-15rem)] min-h-[42rem] xl:grid-cols-[22rem,minmax(0,1fr)]">
        <div className="hidden min-h-0 border-r border-gray-200 bg-white/94 backdrop-blur xl:flex xl:flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="text-xl font-extrabold text-text">Active Vehicles ({trips.length})</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                <span className={`rounded-full px-2.5 py-1 ${socketConnectionState === 'Connected' ? 'bg-success/10 text-success' : socketConnectionState === 'Connecting' || socketConnectionState === 'Reconnecting' ? 'bg-warning/10 text-warning' : 'bg-gray-100 text-gray-600'}`}>
                  {socketConnectionState}
                </span>
                {lastUpdatedAt ? (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                    Updated {new Date(lastUpdatedAt).toLocaleTimeString(undefined)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
              <Layers3 className="h-4 w-4" />
            </div>
          </div>
          <div className="border-b border-gray-100 bg-white/80 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All', description: undefined },
                { id: 'issues', label: 'Issues', description: 'Offline, delayed, or off-route' },
                { id: 'offline', label: 'Offline', description: 'Lost signal' },
                { id: 'delayed', label: 'Delayed', description: 'Behind ETA' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={
                    queueView === tab.id
                      ? 'rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-white'
                      : 'rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition hover:border-primary/30 hover:text-primary'
                  }
                  onClick={() => setQueueView(tab.id as 'all' | 'issues' | 'offline' | 'delayed')}
                  title={tab.description}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-gray-50/40 p-3.5">
            {queueTrips.length ? queueTrips.map((trip) => (
              <VehicleMarker
                key={trip.id}
                onSelect={() => onSelectTrip?.(trip.id)}
                selected={selectedTrip?.id === trip.id}
                trip={trip}
              />
            )) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white/80 px-4 py-6 text-center text-sm text-gray-500">
                No vehicles match the current queue view.
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col bg-white">
          <div className="relative min-h-[24rem] flex-1 overflow-hidden bg-gray-500">
            {!trips.length ? (
              <div className="flex h-full items-center justify-center bg-gray-50 p-6">
                <EmptyPlaceholder
                  compact
                  title="No trips available for the live map"
                  description="Once active trips enter the current workspace, this map will show live vehicle positions and selected-trip context."
                />
              </div>
            ) : !apiKey ? (
              <div className="flex h-full items-center justify-center bg-gray-50 px-6 text-center text-sm text-gray-600">
                Map is unavailable. Check your environment configuration and try reloading.
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center bg-danger/5 px-6 text-center text-sm text-danger">{error}</div>
            ) : !isLoaded ? (
              <div className="flex h-full items-center justify-center bg-gray-50 px-6 text-center text-sm text-gray-600">
                Loading live tracking map...
              </div>
            ) : (
              <>
                <div ref={mapNodeRef} className="h-full w-full bg-gray-100" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,_rgba(255,255,255,0.12),_transparent_28%),linear-gradient(135deg,rgba(22,28,36,0.22),rgba(95,114,128,0.08))]" />
              </>
            )}

            <div className="absolute left-4 bottom-4 z-20 hidden rounded-xl border border-gray-200 bg-white/95 px-3 py-2.5 shadow-md xl:block">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Map legend</p>
              <div className="space-y-1.5 text-xs font-semibold">
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-primary" />On-time trip</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-warning" />Delayed trip</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-danger" />Offline vehicle</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-success" />Geofence entry</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-secondary/40" />Planned route</div>
              </div>
            </div>

            <div className="absolute right-5 bottom-5 z-20 flex flex-col gap-3">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <button className="flex h-11 w-11 items-center justify-center border-b border-gray-100 text-gray-500 transition hover:bg-gray-50" onClick={() => zoomMap(1)} type="button">
                  <Plus className="h-4 w-4" />
                </button>
                <button className="flex h-11 w-11 items-center justify-center text-gray-500 transition hover:bg-gray-50" onClick={() => zoomMap(-1)} type="button">
                  <Minus className="h-4 w-4" />
                </button>
              </div>
              <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-lg transition hover:bg-gray-50" onClick={focusSelectedTrip} type="button">
                <Crosshair className="h-4 w-4" />
              </button>
            </div>
          </div>

          {selectedTrip && showSelectedTripWorkbench ? (
            <div className="border-t border-gray-200 bg-white p-4 xl:p-5">
              <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.15fr),minmax(0,0.9fr),minmax(15rem,0.95fr)]">
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-white text-primary">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-3">
                        <h3 className="text-[1.3rem] font-extrabold leading-none text-text 2xl:text-[1.5rem]">{selectedTrip.vehicleNumber}</h3>
                        <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">{selectedTrip.bookingId}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sourceHealthTone(selectedTrip)}`}>
                          {selectedTrip.sourceHealth ?? (selectedTrip.isOffline ? 'Offline' : 'Healthy')} source
                        </span>
                      </div>
                      <div className="mb-2.5 flex flex-wrap gap-2">
                        {[
                          { id: 'overview', label: 'Overview' },
                          { id: 'sources', label: 'Sources' },
                          { id: 'activity', label: 'Activity' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            className={
                              workbenchView === tab.id
                                ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white'
                                : 'rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-primary/30 hover:text-primary'
                            }
                            onClick={() => setWorkbenchView(tab.id as 'overview' | 'sources' | 'activity')}
                            type="button"
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500">
                        Destination: <span className="font-semibold text-text">{selectedTrip.destination}</span>
                      </p>
                      <p className="mt-1.5 text-xs text-gray-500">
                        Booking {selectedTrip.bookingId} · {selectedTrip.lastLocationLabel}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white bg-white px-3 py-2.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">ETA risk</p>
                          <p className="mt-1 text-[0.95rem] font-bold text-text">{selectedTrip.delayMinutes > 0 ? `${selectedTrip.delayMinutes} min delay` : 'On time'}</p>
                        </div>
                        <div className="rounded-xl border border-white bg-white px-3 py-2.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Checkpoint progress</p>
                          <p className="mt-1 text-[0.95rem] font-bold text-text">{reachedCheckpointCount}/{selectedTrip.checkpoints.length}</p>
                        </div>
                        <div className="rounded-xl border border-white bg-white px-3 py-2.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Current speed</p>
                          <p className="mt-1 text-[0.95rem] font-bold text-text">{selectedTrip.currentLocation.speed ?? 0} km/h</p>
                        </div>
                        <div className="rounded-xl border border-white bg-white px-3 py-2.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Route state</p>
                          <p className="mt-1 text-[0.95rem] font-bold text-text">{selectedTrip.routeDeviationKm > 0 ? `${selectedTrip.routeDeviationKm} km off route` : 'On planned route'}</p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl border border-primary/20 bg-white px-3 py-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Route trace</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-gray-500">Planned path</p>
                            <p className="mt-1 text-sm font-semibold text-text">{selectedTrip.origin} to {selectedTrip.destination}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Actual points</p>
                            <p className="mt-1 text-sm font-semibold text-text">{actualRoutePointCount} pings tracked</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Planned route nodes</p>
                            <p className="mt-1 text-sm font-semibold text-text">{plannedRoutePointCount} checkpoints mapped</p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">The map above highlights the followed path in blue and the planned path in gray for the selected vehicle.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {workbenchView === 'overview' ? (
                  <>
                    <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
                      <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-secondary">
                        <Radio className="h-3.5 w-3.5" />
                        Current source
                      </p>
                      <p className="mt-2.5 text-[1.05rem] font-extrabold text-text 2xl:text-lg">
                        {activeTrackingDevice?.label ?? formatTrackingSource(selectedTrip.activeSource ?? selectedTrip.currentLocation.source)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {activeTrackingDevice ? `${activeTrackingDevice.role} · ${formatTrackingSource(activeTrackingDevice.source)}` : 'Active trip telemetry source'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activeTrackingDevice ? (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${deviceStatusTone(activeTrackingDevice)}`}>
                            {activeTrackingDevice.status}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 shadow-sm">
                          Last ping {new Date(selectedTrip.lastUpdatedAt).toLocaleTimeString(undefined)}
                        </span>
                      </div>
                      <Button className="mt-4" size="sm" variant="outline">View live feed</Button>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
                      <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Investigation summary</p>
                      <div className="mt-3 grid gap-2.5">
                        <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                          <span className="font-semibold text-text">Driver</span>: {selectedTrip.driverName}
                        </div>
                        <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                          <span className="font-semibold text-text">Booking</span>: {selectedTrip.bookingId}
                        </div>
                        <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                          <span className="font-semibold text-text">Route</span>: {selectedTrip.origin} to {selectedTrip.destination}
                        </div>
                        <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                          {latestSourceSwitch ? (
                            <>
                              Switched by <span className="font-semibold text-text">{latestSourceSwitch.switchedBy}</span> at{' '}
                              <span className="font-semibold text-text">{new Date(latestSourceSwitch.switchedAt).toLocaleString(undefined)}</span>.
                            </>
                          ) : (
                            'No manual source override has been applied to this trip.'
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}

                {workbenchView === 'sources' ? (
                  <>
                    <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
                      <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-secondary">
                        <Radio className="h-3.5 w-3.5" />
                        Current source
                      </p>
                      <p className="mt-2.5 text-[1.05rem] font-extrabold text-text 2xl:text-lg">
                        {activeTrackingDevice?.label ?? formatTrackingSource(selectedTrip.activeSource ?? selectedTrip.currentLocation.source)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {activeTrackingDevice ? `${activeTrackingDevice.role} · ${formatTrackingSource(activeTrackingDevice.source)}` : 'Active trip telemetry source'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activeTrackingDevice ? (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${deviceStatusTone(activeTrackingDevice)}`}>
                            {activeTrackingDevice.status}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 shadow-sm">
                          Last ping {new Date(selectedTrip.lastUpdatedAt).toLocaleTimeString(undefined)}
                        </span>
                      </div>
                      <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                        {latestSourceSwitch ? (
                          <>
                            Switched by <span className="font-semibold text-text">{latestSourceSwitch.switchedBy}</span> at{' '}
                            <span className="font-semibold text-text">{new Date(latestSourceSwitch.switchedAt).toLocaleString(undefined)}</span>.
                          </>
                        ) : (
                          'No manual source override has been applied to this trip.'
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
                      <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Source operations</p>
                      <p className="mt-2 text-sm text-gray-600">Switch only when the current feed is stale, faulted, or no longer representative. The change takes effect immediately and applies until manually switched again.</p>
                      <div className="mt-3 space-y-2.5">
                        {alternateTrackingDevices.length ? (
                          alternateTrackingDevices.map((device) => {
                            const isSwitchable = !!onSwitchTrackingSource && device.status !== 'Unavailable' && device.status !== 'Faulted'
                            return (
                              <div key={device.id} className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-text">{device.label}</p>
                                    <p className="mt-1 text-xs text-gray-500">{device.role} · {formatTrackingSource(device.source)}</p>
                                  </div>
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${deviceStatusTone(device)}`}>{device.status}</span>
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                  Last seen {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString(undefined) : 'pending'}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">{device.healthNote ?? 'No telemetry notes.'}</p>
                                {isSwitchable ? (
                                  pendingSourceSwitch?.deviceId === device.id ? (
                                    <div className="mt-3 rounded-xl border border-warning/20 bg-warning/5 px-3 py-2.5">
                                      <p className="text-xs font-semibold text-warning">Switch to {device.label}? Live map will use this source until changed again.</p>
                                      <div className="mt-2 flex gap-2">
                                        <Button size="sm" onClick={() => { onSwitchTrackingSource!(selectedTrip.id, device.id); setPendingSourceSwitch(null) }}>Confirm switch</Button>
                                        <Button size="sm" variant="outline" onClick={() => setPendingSourceSwitch(null)}>Cancel</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      className="mt-3 rounded-lg border border-primary/20 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                                      onClick={() => setPendingSourceSwitch({ deviceId: device.id, deviceLabel: device.label })}
                                      type="button"
                                    >
                                      Switch source
                                    </button>
                                  )
                                ) : null}
                              </div>
                            )
                          })
                        ) : (
                          <div className="rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-600">
                            No alternate tracking devices are available for this trip.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}

                {workbenchView === 'activity' ? (
                  <>
                    <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
                      <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Recent activity</p>
                      <div className="mt-3 space-y-2.5">
                        {selectedTripGeofenceEvents.length ? (
                          selectedTripGeofenceEvents.map((event) => (
                            <div key={event.id} className="rounded-xl bg-gray-50 px-3 py-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-text">{event.geofenceName}</p>
                                <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                                  {event.eventType === 'GeofenceEntered' ? 'Entered' : 'Exited'}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-gray-500">{new Date(event.eventTime).toLocaleString(undefined)}</p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-600">
                            No recent geofence events are linked to this trip.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
                      <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Activity context</p>
                      <div className="mt-3 space-y-2.5">
                        <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                          <span className="font-semibold text-text">Last location</span>: {selectedTrip.lastLocationLabel}
                        </div>
                        <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                          <span className="font-semibold text-text">Checkpoint progress</span>: {reachedCheckpointCount}/{selectedTrip.checkpoints.length}
                        </div>
                        <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                          <span className="font-semibold text-text">Delay state</span>: {selectedTrip.delayMinutes > 0 ? `${selectedTrip.delayMinutes} min delay` : 'On time'}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
