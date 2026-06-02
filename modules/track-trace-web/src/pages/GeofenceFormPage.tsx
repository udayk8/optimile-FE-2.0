import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTrackingStore } from '../store/trackingStore'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { ListPageSkeleton } from '../components/shared/ListPageSkeleton'
import { GeofenceForm } from '../components/GeofenceForm'
import { Button } from '@shared-ui'
import type { GeofencePayload, TrackingGeofence } from '../types/geofence.types'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getOverlappingZones(draft: GeofencePayload, allGeofences: TrackingGeofence[], excludeId?: string): TrackingGeofence[] {
  if (!draft.latitude || !draft.longitude || !draft.radiusMeters) return []
  return allGeofences.filter((gf) => {
    if (gf.id === excludeId) return false
    return haversineKm(draft.latitude, draft.longitude, gf.latitude, gf.longitude) * 1000 < draft.radiusMeters + gf.radiusMeters
  })
}

const emptyDraft: GeofencePayload = {
  tenantId: '',
  name: '',
  type: 'Pickup',
  latitude: 0,
  longitude: 0,
  radiusMeters: 250,
  linkedEntityType: 'TRIP',
  linkedEntityId: '',
  isActive: true,
  dwellAlertMinutes: undefined,
  entryAlertEnabled: false,
  group: '',
}

export function GeofenceFormPage() {
  const { geofenceId } = useParams<{ geofenceId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { scopedPath } = useTrackTraceRouting()
  const { geofences, activeTrips, loading, error, createGeofence, updateGeofence } = useTrackingStore()

  const isEditMode = !!geofenceId
  const editing = isEditMode ? geofences.find((g) => g.id === geofenceId) ?? null : null

  const duplicateFromId = !isEditMode ? (searchParams.get('duplicateFrom') ?? null) : null
  const duplicateSource = duplicateFromId ? (geofences.find((g) => g.id === duplicateFromId) ?? null) : null

  const initialDraft: GeofencePayload = useMemo(() => {
    if (editing) {
      return {
        tenantId: editing.tenantId,
        name: editing.name,
        type: editing.type,
        latitude: editing.latitude,
        longitude: editing.longitude,
        radiusMeters: editing.radiusMeters,
        linkedEntityType: editing.linkedEntityType,
        linkedEntityId: editing.linkedEntityId,
        isActive: editing.isActive,
        dwellAlertMinutes: editing.dwellAlertMinutes,
        entryAlertEnabled: editing.entryAlertEnabled,
        group: editing.group ?? '',
      }
    }
    if (duplicateSource) {
      return {
        tenantId: duplicateSource.tenantId,
        name: `${duplicateSource.name} (copy)`,
        type: duplicateSource.type,
        latitude: duplicateSource.latitude,
        longitude: duplicateSource.longitude,
        radiusMeters: duplicateSource.radiusMeters,
        linkedEntityType: duplicateSource.linkedEntityType,
        linkedEntityId: duplicateSource.linkedEntityId,
        isActive: duplicateSource.isActive,
        dwellAlertMinutes: duplicateSource.dwellAlertMinutes,
        entryAlertEnabled: duplicateSource.entryAlertEnabled,
        group: duplicateSource.group ?? '',
      }
    }
    return emptyDraft
  }, [editing?.id, duplicateSource?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const [draft, setDraft] = useState<GeofencePayload>(initialDraft)

  // Sync draft when editing data arrives after async load
  useEffect(() => {
    setDraft(initialDraft)
  }, [editing?.id, duplicateSource?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const overlappingZones = useMemo(
    () => getOverlappingZones(draft, geofences, editing?.id),
    [draft, geofences, editing?.id]
  )

  function handleCancel() {
    if (isEditMode && geofenceId) {
      navigate(scopedPath(`/geofences/${geofenceId}`))
    } else {
      navigate(scopedPath('/geofences'))
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)
    try {
      if (isEditMode && geofenceId) {
        await updateGeofence(geofenceId, draft)
        navigate(scopedPath(`/geofences/${geofenceId}`))
      } else {
        await createGeofence(draft)
        navigate(scopedPath('/geofences'))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Geofence could not be saved.'
      setSaveError(msg)
      setTimeout(() => setSaveError(null), 4000)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return <ListPageSkeleton />
  if (error) return <EmptyPlaceholder title="Could not load geofences" description={error} />
  if (isEditMode && !editing) return (
    <EmptyPlaceholder
      title="Zone not found"
      description="This geofence may have been deleted."
      action={<Button size="sm" onClick={() => navigate(scopedPath('/geofences'))}>Back to Geofences</Button>}
    />
  )

  return (
    <TrackTraceAccessBoundary page="geofences">
      <div className="space-y-4">
        {/* Back nav */}
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 transition hover:text-text"
        >
          {isEditMode ? `← ${editing?.name ?? 'Zone'}` : duplicateSource ? `← ${duplicateSource.name}` : '← All geofences'}
        </button>

        {/* Page title */}
        <div>
          <h1 className="text-[20px] font-bold text-text">
            {isEditMode ? `Edit — ${editing?.name}` : duplicateSource ? `Duplicate — ${duplicateSource.name}` : 'Create geofence'}
          </h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {isEditMode
              ? 'Update zone details, radius, or linked trip.'
              : duplicateSource
              ? 'Pre-filled from the original zone — adjust as needed before saving.'
              : 'Define a new zone to monitor vehicle entries, exits, and dwell time.'}
          </p>
        </div>

        {/* Form */}
        <GeofenceForm
          draft={draft}
          editing={editing}
          errorMessage={saveError}
          overlappingZones={overlappingZones}
          isSaving={isSaving}
          activeTrips={activeTrips}
          onChange={setDraft}
          onSave={() => void handleSave()}
          onCancel={handleCancel}
        />
      </div>
    </TrackTraceAccessBoundary>
  )
}
