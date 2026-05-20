import { useEffect, useState } from 'react'
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
  const [mapPreviewUnavailable, setMapPreviewUnavailable] = useState(false)
  const latitudeValid = draft.latitude >= -90 && draft.latitude <= 90
  const longitudeValid = draft.longitude >= -180 && draft.longitude <= 180
  const radiusMinValid = draft.radiusMeters >= 50
  const radiusMaxValid = draft.radiusMeters <= 5000
  const radiusValid = radiusMinValid && radiusMaxValid
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
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-secondary">Spatial preview</p>
            <span className="text-xs text-gray-400">Updates 0.6 s after you stop typing</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {mapUrl && !mapPreviewUnavailable ? (
              <img
                alt={`Map preview for ${draft.name.trim() || 'geofence'} at ${debouncedLat.toFixed(4)}, ${debouncedLng.toFixed(4)}`}
                className="h-[220px] w-full object-cover"
                key={mapUrl}
                onError={() => setMapPreviewUnavailable(true)}
                src={mapUrl}
              />
            ) : (
              <div className="flex h-[220px] items-center justify-center p-6 text-center">
                <p className="text-sm text-gray-400">
                  {coordsValid
                    ? 'Map preview is temporarily unavailable. Coordinates and radius can still be reviewed and saved.'
                    : 'Enter valid coordinates to see the location preview.'}
                </p>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="font-semibold text-text">{draft.name.trim() || 'Unnamed geofence'}</span>
            <span>·</span>
            <span>{draft.type}</span>
            <span>·</span>
            <span>{draft.radiusMeters} m radius</span>
            <span>·</span>
            <span>{draft.latitude.toFixed(4)}, {draft.longitude.toFixed(4)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-5">
          <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Validation guide</p>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <div className="rounded-xl bg-white px-4 py-3">
              <p className="font-semibold text-text">Name and entity</p>
              <p className="mt-1">{nameValid && linkedEntityValid ? 'Ready for save.' : 'Name and linked entity are required before saving.'}</p>
            </div>
            <div className="rounded-xl bg-white px-4 py-3">
              <p className="font-semibold text-text">Coordinate safety</p>
              <p className="mt-1">{latitudeValid && longitudeValid ? 'Latitude and longitude are within valid bounds.' : 'Latitude must be between -90 and 90. Longitude must be between -180 and 180.'}</p>
            </div>
            <div className="rounded-xl bg-white px-4 py-3">
              <p className="font-semibold text-text">Radius guidance</p>
              <p className="mt-1">
                {radiusValid
                  ? 'Radius is within the supported operational range.'
                  : !radiusMinValid
                    ? 'Use at least 50 meters to avoid noisy triggers in dense environments.'
                    : 'Keep radius at or below 5000 meters for supported circle geofences.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Name</label>
          <input className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm" value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
          {!nameValid ? <p className="mt-2 text-xs text-danger">Name is required.</p> : null}
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Type</label>
          <select className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm" value={draft.type} onChange={(event) => onChange({ ...draft, type: event.target.value as GeofenceType })}>
            {geofenceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Latitude</label>
          <input className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm" type="number" value={draft.latitude} onChange={(event) => onChange({ ...draft, latitude: Number(event.target.value) })} />
          {!latitudeValid ? <p className="mt-2 text-xs text-danger">Enter a latitude between -90 and 90.</p> : null}
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Longitude</label>
          <input className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm" type="number" value={draft.longitude} onChange={(event) => onChange({ ...draft, longitude: Number(event.target.value) })} />
          {!longitudeValid ? <p className="mt-2 text-xs text-danger">Enter a longitude between -180 and 180.</p> : null}
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Radius Meters</label>
          <input className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm" type="number" min={50} max={5000} value={draft.radiusMeters} onChange={(event) => onChange({ ...draft, radiusMeters: Number(event.target.value) })} />
          {!radiusMinValid ? <p className="mt-2 text-xs text-danger">Use 50 meters or more for safer production geofences.</p> : null}
          {radiusMinValid && !radiusMaxValid ? <p className="mt-2 text-xs text-danger">Keep radius at or below 5000 meters for supported circle geofences.</p> : null}
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Linked Entity Type</label>
          <select className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm" value={draft.linkedEntityType} onChange={(event) => onChange({ ...draft, linkedEntityType: event.target.value as LinkedEntityType })}>
            {linkedEntityTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Linked Entity ID</label>
          <input className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm" value={draft.linkedEntityId} onChange={(event) => onChange({ ...draft, linkedEntityId: event.target.value })} />
          {!linkedEntityValid ? <p className="mt-2 text-xs text-danger">Linked entity ID is required.</p> : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={!canSave || isSaving} onClick={onSave}>
          {isSaving ? (editing ? 'Updating…' : 'Creating…') : editing ? 'Update geofence' : 'Create geofence'}
        </Button>
        <Button disabled={isSaving} variant="outline" onClick={onCancel}>Reset</Button>
      </div>
    </Card>
  )
}
