import { useEffect, useRef, useState, useCallback } from 'react'
import { Button, Card } from '@shared-ui'
import { GoogleMap, OverlayView, useJsApiLoader } from '@react-google-maps/api'
import type { GeofencePayload, GeofenceType, LinkedEntityType, TrackingGeofence } from '../types/geofence.types'
import type { TrackingTrip } from '../types/tracking.types'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

const MAP_OPTIONS: google.maps.MapOptions = {
  clickableIcons: false,
  disableDefaultUI: true,
  gestureHandling: 'cooperative',
  zoomControl: true,
  styles: [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

const inputClass = 'mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50'
const selectClass = 'mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50'

const geofenceTypes: GeofenceType[] = ['Pickup', 'Drop', 'Warehouse', 'Yard', 'Customer Site', 'Checkpoint', 'Restricted Zone', 'Custom']
const linkedEntityTypes: LinkedEntityType[] = ['TRIP', 'BOOKING', 'CUSTOMER', 'WAREHOUSE', 'CHECKPOINT', 'YARD', 'CUSTOM']

// ─── Trip Picker ─────────────────────────────────────────────────────────────

function TripPicker({
  trips,
  selectedId,
  disabled,
  onSelect,
}: {
  trips: TrackingTrip[]
  selectedId: string
  disabled: boolean
  onSelect: (trip: TrackingTrip) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedTrip = trips.find((t) => t.id === selectedId) ?? null

  const filtered = query.trim()
    ? trips.filter((t) => {
        const q = query.toLowerCase()
        return (
          t.id.toLowerCase().includes(q) ||
          t.origin.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q) ||
          t.vehicleNumber.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q)
        )
      })
    : trips

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const ACTIVE_STATUSES = new Set(['In Transit', 'Near Destination', 'At Checkpoint', 'Route Deviated', 'Delayed'])

  return (
    <div ref={wrapperRef} className="relative">
      {/* Selected trip chip */}
      {selectedTrip && !open ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-primary bg-primary/5 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-text">{selectedTrip.id}</p>
            <p className="text-[11px] text-gray-500">{selectedTrip.origin} → {selectedTrip.destination}</p>
            <p className="text-[11px] text-gray-400">{selectedTrip.vehicleNumber} · {selectedTrip.driverName}</p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => { setOpen(true); setQuery('') }}
            className="shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-50"
          >
            Change
          </button>
        </div>
      ) : (
        <input
          autoFocus={open}
          className={inputClass}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search by trip ID, route, vehicle, or customer…"
          value={open ? query : selectedTrip ? selectedTrip.id : selectedId}
        />
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-gray-400">No trips match "{query}"</p>
          ) : (
            filtered.slice(0, 30).map((trip) => {
              const isActive = ACTIVE_STATUSES.has(trip.status)
              return (
                <button
                  key={trip.id}
                  type="button"
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-gray-50"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onSelect(trip)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                    {trip.status}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text">{trip.id}</p>
                    <p className="text-[11px] text-gray-500">{trip.origin} → {trip.destination}</p>
                    <p className="text-[11px] text-gray-400">{trip.vehicleNumber} · {trip.customerName}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ─── Location shortcut buttons ────────────────────────────────────────────────

function TripLocationShortcuts({
  trip,
  disabled,
  onUseLocation,
}: {
  trip: TrackingTrip
  disabled: boolean
  onUseLocation: (lat: number, lng: number, label: string) => void
}) {
  const hasOriginCoords = trip.plannedRoute && trip.plannedRoute.length > 0
  const hasDestCoords = trip.plannedRoute && trip.plannedRoute.length > 1
  const hasCurrentCoords = !!trip.currentLocation

  if (!hasOriginCoords && !hasDestCoords && !hasCurrentCoords) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <p className="w-full text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Use trip location:</p>
      {hasOriginCoords && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            const loc = trip.plannedRoute[0]
            onUseLocation(loc.latitude, loc.longitude, `${trip.origin} Pickup`)
          }}
          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
        >
          📍 Pickup — {trip.origin}
        </button>
      )}
      {hasDestCoords && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            const loc = trip.plannedRoute[trip.plannedRoute.length - 1]
            onUseLocation(loc.latitude, loc.longitude, `${trip.destination} Drop`)
          }}
          className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-50"
        >
          📍 Delivery — {trip.destination}
        </button>
      )}
      {hasCurrentCoords && (
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onUseLocation(
              trip.currentLocation.latitude,
              trip.currentLocation.longitude,
              `${trip.id} current position`,
            )
          }
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
        >
          📍 Current vehicle position
        </button>
      )}
    </div>
  )
}

// ─── Address Search (Nominatim) ───────────────────────────────────────────────

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

function AddressSearch({
  disabled,
  onSelect,
}: {
  disabled: boolean
  onSelect: (lat: number, lng: number, label: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchResults(value: string) {
    if (!value.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    setError(false)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=6&addressdetails=0&countrycodes=in`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const data = await res.json() as NominatimResult[]
      setResults(data)
      setOpen(true)
    } catch {
      setError(true)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleChange(value: string) {
    setQuery(value)
    setError(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(() => void fetchResults(value), 600)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      void fetchResults(query)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          className="mt-2 h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search address or place name…"
          value={query}
        />
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => { if (debounceRef.current) clearTimeout(debounceRef.current); void fetchResults(query) }}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm hover:text-primary disabled:cursor-not-allowed"
        >
          {loading ? '⏳' : '🔍'}
        </button>
        {query && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1 text-xs text-warning">Address search unavailable — enter coordinates manually.</p>
      )}

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {results.map((r) => (
            <button
              key={r.place_id}
              type="button"
              className="flex w-full items-start gap-2 px-4 py-2.5 text-left transition hover:bg-gray-50"
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name)
                setQuery(r.display_name.split(',').slice(0, 2).join(', '))
                setOpen(false)
              }}
            >
              <span className="mt-0.5 shrink-0 text-gray-400">📍</span>
              <span className="text-[13px] text-text leading-5">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {open && !loading && results.length === 0 && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
          <p className="text-[13px] text-gray-400">No results for "{query}" — try a different search.</p>
        </div>
      )}
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function GeofenceForm({
  draft,
  editing,
  errorMessage,
  overlappingZones = [],
  isSaving = false,
  activeTrips = [],
  onChange,
  onSave,
  onCancel,
}: {
  draft: GeofencePayload
  editing?: TrackingGeofence | null
  errorMessage?: string | null
  overlappingZones?: TrackingGeofence[]
  isSaving?: boolean
  activeTrips?: TrackingTrip[]
  onChange: (draft: GeofencePayload) => void
  onSave: () => void
  onCancel: () => void
}) {
  const firstInputRef = useRef<HTMLInputElement>(null)
  const [overlapDismissed, setOverlapDismissed] = useState(false)

  useEffect(() => {
    setOverlapDismissed(false)
  }, [overlappingZones.length])

  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  // Clear entity ID when entity type changes (so stale IDs don't carry over)
  function handleEntityTypeChange(type: LinkedEntityType) {
    onChange({ ...draft, linkedEntityType: type, linkedEntityId: '' })
  }

  const selectedTrip = draft.linkedEntityType === 'TRIP'
    ? activeTrips.find((t) => t.id === draft.linkedEntityId) ?? null
    : null

  const latitudeValid = draft.latitude >= -90 && draft.latitude <= 90
  const longitudeValid = draft.longitude >= -180 && draft.longitude <= 180
  const radiusValid = draft.radiusMeters >= 50 && draft.radiusMeters <= 5000
  const nameValid = draft.name.trim().length > 0
  const linkedEntityValid = draft.linkedEntityId.trim().length > 0
  const canSave = latitudeValid && longitudeValid && radiusValid && nameValid && linkedEntityValid

  const debouncedLat = useDebounced(draft.latitude, 600)
  const debouncedLng = useDebounced(draft.longitude, 600)
  const coordsValid = latitudeValid && longitudeValid

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    id: 'fleet-live-map-google',
  })

  const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 } // India center
  const hasRealCoords = coordsValid && (debouncedLat !== 0 || debouncedLng !== 0)
  const mapCenter = hasRealCoords ? { lat: debouncedLat, lng: debouncedLng } : DEFAULT_CENTER

  function radiusToZoom(radiusM: number): number {
    if (radiusM <= 100) return 17
    if (radiusM <= 250) return 16
    if (radiusM <= 500) return 15
    if (radiusM <= 1000) return 14
    if (radiusM <= 2500) return 13
    return 12
  }
  const mapZoom = hasRealCoords ? radiusToZoom(draft.radiusMeters) : 5

  const mapRef = useRef<google.maps.Map | null>(null)
  const circleRef = useRef<google.maps.Circle | null>(null)

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    circleRef.current = new google.maps.Circle({
      map,
      center: mapCenter,
      radius: draft.radiusMeters,
      fillColor: '#6366f1',
      fillOpacity: 0.2,
      strokeColor: '#6366f1',
      strokeOpacity: 0.9,
      strokeWeight: 2,
      visible: hasRealCoords,
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pan map + update circle when coords or radius change
  useEffect(() => {
    if (!circleRef.current) return
    const center = hasRealCoords ? { lat: debouncedLat, lng: debouncedLng } : DEFAULT_CENTER
    circleRef.current.setCenter(center)
    circleRef.current.setRadius(draft.radiusMeters)
    circleRef.current.setVisible(hasRealCoords)
    if (hasRealCoords) {
      mapRef.current?.panTo(center)
      mapRef.current?.setZoom(radiusToZoom(draft.radiusMeters))
    }
  }, [debouncedLat, debouncedLng, draft.radiusMeters, hasRealCoords]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="p-5">
      <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
        {/* Map preview */}
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Spatial preview</p>
            <span className="text-xs text-gray-400">{hasRealCoords ? 'Updates 0.6 s after you stop typing' : 'Search an address or enter coordinates below'}</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {!mapsLoaded ? (
              <div className="flex h-[220px] items-center justify-center">
                <p className="text-sm text-gray-400">Loading map…</p>
              </div>
            ) : (
              <GoogleMap
                mapContainerClassName="h-[220px] w-full"
                center={mapCenter}
                zoom={mapZoom}
                onLoad={onMapLoad}
                onUnmount={() => { mapRef.current = null; circleRef.current = null }}
                options={MAP_OPTIONS}
              >
                {hasRealCoords && (
                  <OverlayView position={{ lat: debouncedLat, lng: debouncedLng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                    <div className="-translate-x-1/2 -translate-y-full pb-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-500 shadow-lg">
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                      <div className="mx-auto h-2 w-0.5 bg-indigo-500" />
                    </div>
                  </OverlayView>
                )}
              </GoogleMap>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="font-semibold text-text">{draft.name.trim() || <span className="italic text-gray-400">No name yet</span>}</span>
            <span>·</span>
            <span>{draft.type}</span>
            <span>·</span>
            <span>{draft.radiusMeters} m radius</span>
            <span>·</span>
            <span>{draft.latitude.toFixed(4)}, {draft.longitude.toFixed(4)}</span>
          </div>
        </div>

        {/* Validation guide */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-5">
          <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Validation guide</p>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <div className="rounded-xl bg-white px-4 py-3">
              <p className="font-semibold text-text">Name and entity</p>
              <p className="mt-1">{nameValid && linkedEntityValid ? 'Ready for save.' : 'Name and linked entity ID are required before saving.'}</p>
            </div>
            <div className="rounded-xl bg-white px-4 py-3">
              <p className="font-semibold text-text">Coordinate safety</p>
              <p className="mt-1">{latitudeValid && longitudeValid ? 'Latitude and longitude are within valid bounds.' : 'Latitude must be −90 to 90. Longitude must be −180 to 180.'}</p>
            </div>
            <div className="rounded-xl bg-white px-4 py-3">
              <p className="font-semibold text-text">Radius guidance</p>
              <p className="mt-1">
                {radiusValid
                  ? 'Radius is within the supported operational range.'
                  : 'Enter a value between 50 and 5000 meters.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {overlappingZones.length > 0 && !overlapDismissed && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <div>
            <p className="font-semibold">Overlap warning</p>
            <p className="mt-0.5 text-[12px] leading-5">
              This zone's boundary overlaps with:{' '}
              <span className="font-medium">{overlappingZones.map((z) => z.name).join(', ')}</span>.
              You can still save — review if this is intentional.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 text-[12px] font-bold underline underline-offset-2 hover:opacity-70"
            onClick={() => setOverlapDismissed(true)}
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Name</label>
          <input
            ref={firstInputRef}
            className={inputClass}
            disabled={isSaving}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="e.g. Mumbai Pickup Zone"
            value={draft.name}
          />
          {!nameValid && <p className="mt-2 text-xs text-danger">Name is required.</p>}
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Type</label>
          <select
            className={selectClass}
            disabled={isSaving}
            onChange={(e) => onChange({ ...draft, type: e.target.value as GeofenceType })}
            value={draft.type}
          >
            {geofenceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>

        {/* Linked entity — full row */}
        <div className="md:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Link to</label>
              <p className="mt-0.5 text-[11px] text-gray-400">What does this zone belong to?</p>
              <select
                className={selectClass}
                disabled={isSaving}
                onChange={(e) => handleEntityTypeChange(e.target.value as LinkedEntityType)}
                value={draft.linkedEntityType}
              >
                {linkedEntityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === 'TRIP' ? 'Trip' :
                     type === 'BOOKING' ? 'Booking' :
                     type === 'CUSTOMER' ? 'Customer' :
                     type === 'WAREHOUSE' ? 'Warehouse' :
                     type === 'CHECKPOINT' ? 'Checkpoint' :
                     type === 'YARD' ? 'Yard' : 'Custom'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                {draft.linkedEntityType === 'TRIP' ? 'Select trip' : 'Entity ID'}
              </label>
              {draft.linkedEntityType === 'TRIP' ? (
                <>
                  <TripPicker
                    trips={activeTrips}
                    selectedId={draft.linkedEntityId}
                    disabled={isSaving}
                    onSelect={(trip) => onChange({ ...draft, linkedEntityId: trip.id })}
                  />
                  {!linkedEntityValid && <p className="mt-1 text-xs text-danger">Please select a trip.</p>}
                </>
              ) : (
                <>
                  <input
                    className={inputClass}
                    disabled={isSaving}
                    onChange={(e) => onChange({ ...draft, linkedEntityId: e.target.value })}
                    placeholder="e.g. BOOKING-2891"
                    value={draft.linkedEntityId}
                  />
                  <p className="mt-1 text-xs text-gray-400">The specific {draft.linkedEntityType.toLowerCase()} ID this zone triggers events for.</p>
                  {!linkedEntityValid && <p className="mt-1 text-xs text-danger">Linked entity ID is required.</p>}
                </>
              )}
            </div>
          </div>

          {/* Trip location shortcuts — shown when a trip is selected */}
          {selectedTrip && (
            <TripLocationShortcuts
              trip={selectedTrip}
              disabled={isSaving}
              onUseLocation={(lat, lng) => onChange({ ...draft, latitude: lat, longitude: lng })}
            />
          )}
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Search address</label>
          <p className="mt-0.5 text-[11px] text-gray-400">Type a place name or address to auto-fill coordinates below.</p>
          <AddressSearch
            disabled={isSaving}
            onSelect={(lat, lng) => onChange({ ...draft, latitude: lat, longitude: lng })}
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Latitude</label>
          <input
            className={inputClass}
            disabled={isSaving}
            max={90}
            min={-90}
            onChange={(e) => onChange({ ...draft, latitude: Number(e.target.value) })}
            step="0.0001"
            type="number"
            value={draft.latitude}
          />
          {!latitudeValid && <p className="mt-2 text-xs text-danger">Enter a latitude between −90 and 90.</p>}
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Longitude</label>
          <input
            className={inputClass}
            disabled={isSaving}
            max={180}
            min={-180}
            onChange={(e) => onChange({ ...draft, longitude: Number(e.target.value) })}
            step="0.0001"
            type="number"
            value={draft.longitude}
          />
          {!longitudeValid && <p className="mt-2 text-xs text-danger">Enter a longitude between −180 and 180.</p>}
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Radius (meters)</label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[100, 250, 500, 1000].map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={isSaving}
                onClick={() => onChange({ ...draft, radiusMeters: preset })}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                  draft.radiusMeters === preset
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {preset >= 1000 ? `${preset / 1000} km` : `${preset} m`}
              </button>
            ))}
          </div>
          <input
            className="mt-2 h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            max={5000}
            min={50}
            onChange={(e) => onChange({ ...draft, radiusMeters: Number(e.target.value) })}
            step="10"
            type="range"
            value={draft.radiusMeters}
          />
          <input
            className={inputClass}
            disabled={isSaving}
            max={5000}
            min={50}
            onChange={(e) => onChange({ ...draft, radiusMeters: Number(e.target.value) })}
            step="10"
            type="number"
            value={draft.radiusMeters}
          />
          {!radiusValid && <p className="mt-2 text-xs text-danger">Enter a value between 50 and 5000 meters.</p>}
        </div>
      </div>

      {/* Group */}
      <div className="mt-4">
        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Group / Corridor</label>
        <input
          className={inputClass}
          disabled={isSaving}
          onChange={(e) => onChange({ ...draft, group: e.target.value })}
          placeholder="e.g. Mumbai–Pune Corridor or Client: Tata Steel"
          value={draft.group ?? ''}
        />
        <p className="mt-1 text-xs text-gray-400">Optional. Used to cluster zones in the list view.</p>
      </div>

      {/* Alert thresholds */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Alert Thresholds</p>
        <p className="mt-1 text-xs text-gray-400">Configure when this zone should raise an alert.</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Dwell Alert (minutes)
            </label>
            <input
              className={inputClass}
              disabled={isSaving}
              min={1}
              max={600}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : Number(e.target.value)
                onChange({ ...draft, dwellAlertMinutes: val })
              }}
              placeholder="e.g. 90 — alert after 90 min inside zone"
              type="number"
              value={draft.dwellAlertMinutes ?? ''}
            />
            <p className="mt-1 text-xs text-gray-400">Leave blank to disable dwell alerts for this zone.</p>
          </div>
          <div className="flex flex-col justify-center gap-2 pt-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                checked={draft.entryAlertEnabled ?? false}
                className="h-4 w-4 rounded border-gray-300 accent-primary"
                disabled={isSaving}
                onChange={(e) => onChange({ ...draft, entryAlertEnabled: e.target.checked })}
                type="checkbox"
              />
              <span className="text-sm font-medium text-text">Alert on zone entry</span>
            </label>
            <p className="text-xs text-gray-400 pl-7">Raise an alert the moment any vehicle enters this zone.</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={!canSave || isSaving} onClick={onSave}>
          {isSaving ? (editing ? 'Updating…' : 'Creating…') : editing ? 'Update geofence' : 'Create geofence'}
        </Button>
        <Button disabled={isSaving} variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  )
}
