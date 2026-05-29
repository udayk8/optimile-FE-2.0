import { useEffect, useRef, useState } from 'react'
import { Button, Card } from '@shared-ui'
import type { GeofencePayload, GeofenceType, LinkedEntityType, TrackingGeofence } from '../types/geofence.types'

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

export function GeofenceForm({
  draft,
  editing,
  errorMessage,
  isSaving = false,
  onChange,
  onSave,
  onCancel,
}: {
  draft: GeofencePayload
  editing?: TrackingGeofence | null
  errorMessage?: string | null
  isSaving?: boolean
  onChange: (draft: GeofencePayload) => void
  onSave: () => void
  onCancel: () => void
}) {
  const firstInputRef = useRef<HTMLInputElement>(null)
  const [mapPreviewUnavailable, setMapPreviewUnavailable] = useState(false)

  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  const latitudeValid = draft.latitude >= -90 && draft.latitude <= 90
  const longitudeValid = draft.longitude >= -180 && draft.longitude <= 180
  const radiusValid = draft.radiusMeters >= 50 && draft.radiusMeters <= 5000
  const nameValid = draft.name.trim().length > 0
  const linkedEntityValid = draft.linkedEntityId.trim().length > 0
  const canSave = latitudeValid && longitudeValid && radiusValid && nameValid && linkedEntityValid

  const debouncedLat = useDebounced(draft.latitude, 600)
  const debouncedLng = useDebounced(draft.longitude, 600)
  const coordsValid = latitudeValid && longitudeValid
  const mapUrl = coordsValid
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${debouncedLat},${debouncedLng}&zoom=14&size=600x240&markers=${debouncedLat},${debouncedLng},red`
    : null

  useEffect(() => {
    setMapPreviewUnavailable(false)
  }, [mapUrl])

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-text">{editing ? 'Edit geofence' : 'Create geofence'}</h3>
          <p className="mt-1 text-sm text-gray-600">Circle geofences are available now. Polygon support can be layered later.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
        {/* Map preview */}
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Spatial preview</p>
            <span className="text-xs text-gray-400">Updates 0.6 s after you stop typing</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {mapUrl && !mapPreviewUnavailable ? (
              <img
                alt={`Map preview at ${debouncedLat.toFixed(4)}, ${debouncedLng.toFixed(4)}`}
                className="h-[220px] w-full object-cover"
                key={mapUrl}
                onError={() => setMapPreviewUnavailable(true)}
                src={mapUrl}
              />
            ) : (
              <div className="flex h-[220px] items-center justify-center p-6 text-center">
                <p className="text-sm text-gray-400">
                  {coordsValid
                    ? 'Map preview could not load. Check that coordinates are within valid bounds (-90 to 90 lat, -180 to 180 lng).'
                    : 'Enter valid coordinates to see the location preview.'}
                </p>
              </div>
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

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Linked Entity Type</label>
          <select
            className={selectClass}
            disabled={isSaving}
            onChange={(e) => onChange({ ...draft, linkedEntityType: e.target.value as LinkedEntityType })}
            value={draft.linkedEntityType}
          >
            {linkedEntityTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <p className="mt-1 text-xs text-gray-400">The type of record this geofence triggers events for.</p>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Linked Entity ID</label>
          <input
            className={inputClass}
            disabled={isSaving}
            onChange={(e) => onChange({ ...draft, linkedEntityId: e.target.value })}
            placeholder="e.g. TRIP-1042 or BOOKING-2891"
            value={draft.linkedEntityId}
          />
          <p className="mt-1 text-xs text-gray-400">The specific trip, booking, or checkpoint ID this geofence is attached to.</p>
          {!linkedEntityValid && <p className="mt-1 text-xs text-danger">Linked entity ID is required.</p>}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={!canSave || isSaving} loading={isSaving} onClick={onSave}>
          {isSaving ? (editing ? 'Updating…' : 'Creating…') : editing ? 'Update geofence' : 'Create geofence'}
        </Button>
        <Button disabled={isSaving} variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  )
}
