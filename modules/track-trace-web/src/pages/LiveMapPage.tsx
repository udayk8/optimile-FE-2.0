import { useEffect, useMemo, useState } from 'react'
import { Button, Card } from '@shared-ui'
import { ArrowUpDown, Clock3, Filter, Search, Siren, TimerReset } from 'lucide-react'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { LiveMapPanel } from '../components/LiveMapPanel'
import { trackTraceV2StickyPanelClassName } from '../components/shared/trackTraceV2Chrome'
import { useTrackingStore } from '../store/trackingStore'
import { MapPageSkeleton } from '../components/shared/MapPageSkeleton'
import type { TrackingDeviceRole, TrackingTrip } from '../types/tracking.types'

const SOURCE_FILTER_OPTIONS = ['All', 'Primary GPS', 'Secondary GPS', 'Driver app', 'Fallback in use'] as const
type SourceFilterOption = (typeof SOURCE_FILTER_OPTIONS)[number]

function sourceFilterChipClassName(active: boolean) {
  return active
    ? 'rounded-full border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary'
    : 'rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-primary/40 hover:text-primary'
}

function sortChipClassName(active: boolean) {
  return active
    ? 'inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm'
    : 'inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-primary/40 hover:text-primary'
}

function resolveActiveDeviceRole(trip: TrackingTrip): TrackingDeviceRole | undefined {
  return trip.trackingDevices?.find((device) => device.id === trip.activeTrackingDeviceId)?.role
}

export function LiveMapPage() {
  const [markerQuery, setMarkerQuery] = useState('')
  const [markerSort, setMarkerSort] = useState<'priority' | 'freshness' | 'eta'>('priority')
  const [sourceFilter, setSourceFilter] = useState<SourceFilterOption>('All')
  const [showFilters, setShowFilters] = useState(false)
  const {
    error,
    geofenceEvents,
    lastUpdatedAt,
    liveMapFilters,
    liveVehicles,
    loading,
    selectedTripId,
    setLiveMapFilters,
    setSelectedTripId,
    socketConnectionState,
    switchTripTrackingSource,
  } = useTrackingStore()

  const { showActiveOnly, showDelayedOnly, showOfflineOnly, showRouteDeviationOnly, showFallbackOnly } = liveMapFilters

  const filteredTrips = useMemo(() => {
    return liveVehicles.filter((trip) => {
      if (showActiveOnly && ['Completed', 'Cancelled'].includes(trip.status)) return false
      if (showDelayedOnly && trip.delayMinutes <= 0) return false
      if (showOfflineOnly && !trip.isOffline) return false
      if (showRouteDeviationOnly && trip.routeDeviationKm <= 0) return false
      if (showFallbackOnly && trip.sourceHealth !== 'Fallback') return false
      if (sourceFilter === 'Primary GPS' && resolveActiveDeviceRole(trip) !== 'PRIMARY') return false
      if (sourceFilter === 'Secondary GPS' && resolveActiveDeviceRole(trip) !== 'SECONDARY') return false
      if (sourceFilter === 'Driver app' && resolveActiveDeviceRole(trip) !== 'DRIVER_APP') return false
      if (sourceFilter === 'Fallback in use' && trip.sourceHealth !== 'Fallback') return false
      return true
    })
  }, [liveVehicles, showActiveOnly, showDelayedOnly, showFallbackOnly, showOfflineOnly, showRouteDeviationOnly, sourceFilter])

  const visibleTrips = useMemo(() => {
    const normalizedQuery = markerQuery.trim().toLowerCase()
    const searchedTrips = normalizedQuery
      ? filteredTrips.filter((trip) =>
        [
          trip.id,
          trip.bookingId,
          trip.vehicleNumber,
          trip.customerName,
          trip.lastLocationLabel,
          trip.trackingDeviceLabel,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery)),
      )
      : filteredTrips

    const priorityScore = (trip: typeof filteredTrips[number]) => {
      let score = 0
      if (trip.isOffline) score += 50
      if (trip.sourceHealth === 'Fallback') score += 35
      if (trip.sourceHealth === 'Stale') score += 25
      if (trip.routeDeviationKm > 0) score += 15
      score += Math.min(trip.delayMinutes, 30)
      return score
    }

    return [...searchedTrips].sort((left, right) => {
      if (markerSort === 'freshness') {
        return new Date(right.lastUpdatedAt).getTime() - new Date(left.lastUpdatedAt).getTime()
      }
      if (markerSort === 'eta') {
        return new Date(left.currentEta ?? left.eta).getTime() - new Date(right.currentEta ?? right.eta).getTime()
      }
      return priorityScore(right) - priorityScore(left)
    })
  }, [filteredTrips, markerQuery, markerSort])

  const selectedTrip = visibleTrips.find((trip) => trip.id === selectedTripId) ?? visibleTrips[0]
  const sourceIssueCount = filteredTrips.filter((trip) => (trip.sourceHealth ?? 'Healthy') !== 'Healthy').length
  const manualOverrideCount = filteredTrips.filter((trip) => Boolean(trip.sourceSwitchAuditTrail?.length)).length
  const delayedCount = filteredTrips.filter((trip) => trip.delayMinutes > 0 || trip.status === 'Delayed').length
  const activeFilterCount =
    Number(showActiveOnly)
    + Number(showDelayedOnly)
    + Number(showOfflineOnly)
    + Number(showRouteDeviationOnly)
    + Number(showFallbackOnly)
    + Number(sourceFilter !== 'All')
    + Number(markerSort !== 'priority')

  useEffect(() => {
    if (!visibleTrips.length) return

    const selectedTripStillVisible = visibleTrips.some((trip) => trip.id === selectedTripId)
    if (!selectedTripStillVisible) {
      setSelectedTripId(visibleTrips[0].id)
    }
  }, [visibleTrips, selectedTripId, setSelectedTripId])

  if (loading) {
    return <MapPageSkeleton />
  }

  if (error) {
    return <EmptyPlaceholder title="Live map unavailable" description={error} />
  }

  return (
    <TrackTraceAccessBoundary page="live-map">
      <div className="space-y-6">
        <Card className={`${trackTraceV2StickyPanelClassName} p-4`}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h2 className="text-[2rem] font-extrabold leading-none text-text">Live Map</h2>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  {visibleTrips.length} vehicles in scope
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 xl:max-w-[72rem]">
              <div className="flex flex-wrap items-center gap-4">
                <label className="relative min-w-[280px] flex-1" htmlFor="live-map-search">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="live-map-search"
                    className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-100 pl-12 pr-4 text-sm text-text outline-none transition placeholder:text-gray-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    onChange={(event) => setMarkerQuery(event.target.value)}
                    placeholder="Search vehicle, booking, trip, customer, or city..."
                    value={markerQuery}
                  />
                </label>
                <Button
                  className="h-11 min-w-[152px] rounded-2xl px-5 text-sm"
                  onClick={() => setShowFilters((current) => !current)}
                  size="sm"
                  variant="outline"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                  {activeFilterCount > 0 ? (
                    <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-[11px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-gray-500">
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">{delayedCount} delayed</span>
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">{sourceIssueCount} source issues</span>
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">{manualOverrideCount} overrides</span>
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">
                  {lastUpdatedAt ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString('en-IN')}` : 'Awaiting live refresh'}
                </span>
              </div>
            </div>
          </div>
          {showFilters ? (
            <div className="mt-4 grid gap-5 border-t border-gray-200 pt-4 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr),auto]">
              <div className="space-y-3">
                <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Status</p>
                <div className="flex flex-wrap gap-2.5">
                  <button className={sourceFilterChipClassName(showActiveOnly)} onClick={() => setLiveMapFilters({ showActiveOnly: !showActiveOnly })} type="button">Active only</button>
                  <button className={sourceFilterChipClassName(showDelayedOnly)} onClick={() => setLiveMapFilters({ showDelayedOnly: !showDelayedOnly })} type="button">Delayed trips</button>
                  <button className={sourceFilterChipClassName(showOfflineOnly)} onClick={() => setLiveMapFilters({ showOfflineOnly: !showOfflineOnly })} type="button">Offline vehicles</button>
                  <button className={sourceFilterChipClassName(showRouteDeviationOnly)} onClick={() => setLiveMapFilters({ showRouteDeviationOnly: !showRouteDeviationOnly })} type="button">Route deviation</button>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Tracking device</p>
                <div className="flex flex-wrap gap-2.5">
                  {SOURCE_FILTER_OPTIONS.map((option) => (
                    <button
                      key={option}
                      className={sourceFilterChipClassName(sourceFilter === option)}
                      onClick={() => setSourceFilter(option)}
                      type="button"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3 xl:text-right">
                <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-gray-500 xl:ml-auto">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Queue sort
                </p>
                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <button className={sortChipClassName(markerSort === 'priority')} onClick={() => setMarkerSort('priority')} type="button">
                    <Siren className="h-4 w-4" />
                    Urgency
                  </button>
                  <button className={sortChipClassName(markerSort === 'freshness')} onClick={() => setMarkerSort('freshness')} type="button">
                    <Clock3 className="h-4 w-4" />
                    Freshest
                  </button>
                  <button className={sortChipClassName(markerSort === 'eta')} onClick={() => setMarkerSort('eta')} type="button">
                    <TimerReset className="h-4 w-4" />
                    ETA first
                  </button>
                </div>
              </div>
              {(showDelayedOnly || showOfflineOnly || showRouteDeviationOnly || showFallbackOnly || sourceFilter !== 'All' || markerSort !== 'priority') ? (
                <div className="xl:col-span-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setLiveMapFilters({
                        showActiveOnly: true,
                        showDelayedOnly: false,
                        showOfflineOnly: false,
                        showRouteDeviationOnly: false,
                        showFallbackOnly: false,
                      })
                      setSourceFilter('All')
                      setMarkerSort('priority')
                    }}
                  >
                    Reset all filters
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        <LiveMapPanel
          trips={visibleTrips}
          onSelectTrip={setSelectedTripId}
          selectedTripId={selectedTrip?.id}
          geofenceEvents={geofenceEvents}
          socketConnectionState={socketConnectionState}
          lastUpdatedAt={lastUpdatedAt}
          onSwitchTrackingSource={(tripId, deviceId) => switchTripTrackingSource(tripId, deviceId, 'track.trace@optimile')}
          showHealthBanner={false}
          showSelectedTripWorkbench
        />
      </div>
    </TrackTraceAccessBoundary>
  )
}
