import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card } from '@shared-ui'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { GeofenceForm } from '../components/GeofenceForm'
import { GeofenceList } from '../components/GeofenceList'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { PaginationStrip } from '../components/shared/PaginationStrip'
import { useTrackingStore } from '../store/trackingStore'
import type { GeofencePayload, TrackingGeofence } from '../types/geofence.types'
import { ListPageSkeleton } from '../components/shared/ListPageSkeleton'

const PAGE_SIZE = 25

const initialDraft: GeofencePayload = {
  tenantId: '',
  name: '',
  type: 'Pickup',
  latitude: 0,
  longitude: 0,
  radiusMeters: 250,
  linkedEntityType: 'TRIP',
  linkedEntityId: '',
  isActive: true,
}

export function GeofenceManagementPage() {
  const { geofences, loading, error, createGeofence, updateGeofence, deleteGeofence, toggleGeofenceStatus } = useTrackingStore()
  const formRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<GeofencePayload>(initialDraft)
  const [editing, setEditing] = useState<TrackingGeofence | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<TrackingGeofence | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TrackingGeofence['type'] | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Disabled'>('All')

  const filteredGeofences = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return geofences.filter((geofence) => {
      const matchesSearch =
        !normalizedSearch ||
        geofence.name.toLowerCase().includes(normalizedSearch) ||
        geofence.linkedEntityId.toLowerCase().includes(normalizedSearch) ||
        geofence.linkedEntityType.toLowerCase().includes(normalizedSearch)

      const matchesType = typeFilter === 'All' || geofence.type === typeFilter
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && geofence.isActive) ||
        (statusFilter === 'Disabled' && !geofence.isActive)

      return matchesSearch && matchesType && matchesStatus
    })
  }, [geofences, search, statusFilter, typeFilter])

  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(filteredGeofences.length / PAGE_SIZE)
  const paginatedGeofences = filteredGeofences.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, typeFilter, statusFilter])

  if (loading) {
    return <ListPageSkeleton />
  }

  if (error) {
    return <EmptyPlaceholder title="Geofences unavailable" description={error} />
  }

  function openCreateForm() {
    setEditing(null)
    setDraft(initialDraft)
    setShowForm(true)
    setSaveError(null)
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function openEditForm(geofence: TrackingGeofence) {
    setEditing(geofence)
    setDraft({
      tenantId: geofence.tenantId,
      name: geofence.name,
      type: geofence.type,
      latitude: geofence.latitude,
      longitude: geofence.longitude,
      radiusMeters: geofence.radiusMeters,
      linkedEntityType: geofence.linkedEntityType,
      linkedEntityId: geofence.linkedEntityId,
      isActive: geofence.isActive,
    })
    setShowForm(true)
    setSaveError(null)
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function closeForm() {
    setEditing(null)
    setDraft(initialDraft)
    setShowForm(false)
    setSaveError(null)
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveError(null)

    try {
      if (editing) {
        await updateGeofence(editing.id, draft)
      } else {
        await createGeofence(draft)
      }
      closeForm()
    } catch (saveFailure) {
      const msg = saveFailure instanceof Error ? saveFailure.message : 'Geofence could not be saved.'
      setSaveError(msg)
      setTimeout(() => setSaveError(null), 4000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TrackTraceAccessBoundary page="geofences">
      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h3 className="text-[14px] font-semibold text-text">Delete {pendingDelete.name}?</h3>
            <p className="mt-2 text-[13px] leading-5 text-gray-600">
              This will permanently remove the{' '}
              <span className="font-semibold">{pendingDelete.type.toLowerCase()}</span> zone and stop
              triggering events for any linked trips or vehicles. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const target = pendingDelete
                  setPendingDelete(null)
                  void deleteGeofence(target.id).catch(() => {
                    setDeleteError(`"${target.name}" could not be deleted. Please try again.`)
                    setTimeout(() => setDeleteError(null), 4000)
                  })
                }}
              >
                Delete geofence
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {deleteError && (
          <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-2.5 text-[12px] font-medium text-danger">
            {deleteError}
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Geofences in Scope', value: filteredGeofences.length },
            { label: 'Active Zones', value: geofences.filter((g) => g.isActive).length },
            { label: 'Disabled Zones', value: geofences.filter((g) => !g.isActive).length },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">{kpi.label}</p>
              <p className="mt-0.5 text-xl font-extrabold text-gray-900">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <Card className="sticky top-14 z-10 border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 xl:max-w-xs">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500" htmlFor="geofence-search">Search</label>
              <input
                id="geofence-search"
                className="mt-1.5 h-8 w-full rounded-lg border border-gray-300 px-3 text-[13px] text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, entity ID, or type"
                value={search}
              />
            </div>
            <div className="w-36">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500" htmlFor="geofence-type">Type</label>
              <select
                id="geofence-type"
                className="mt-1.5 h-8 w-full rounded-lg border border-gray-300 px-2.5 text-[13px] text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setTypeFilter(event.target.value as TrackingGeofence['type'] | 'All')}
                value={typeFilter}
              >
                {['All', 'Pickup', 'Drop', 'Warehouse', 'Yard', 'Customer Site', 'Checkpoint', 'Restricted Zone', 'Custom'].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500" htmlFor="geofence-status">State</label>
              <select
                id="geofence-status"
                className="mt-1.5 h-8 w-full rounded-lg border border-gray-300 px-2.5 text-[13px] text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setStatusFilter(event.target.value as 'All' | 'Active' | 'Disabled')}
                value={statusFilter}
              >
                {['All', 'Active', 'Disabled'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <Button
              className="h-8 shrink-0 text-[13px]"
              onClick={showForm && !editing ? closeForm : openCreateForm}
              variant={showForm && !editing ? 'outline' : 'default'}
            >
              {showForm && !editing ? 'Cancel' : '+ New geofence'}
            </Button>
          </div>
        </Card>

        {/* Collapsible geofence form */}
        {showForm && (
          <div ref={formRef}>
            <GeofenceForm
              draft={draft}
              errorMessage={saveError}
              editing={editing}
              isSaving={isSaving}
              onChange={setDraft}
              onSave={() => void handleSave()}
              onCancel={closeForm}
            />
          </div>
        )}

        {filteredGeofences.length === 0 ? (
          <EmptyPlaceholder
            title={geofences.length === 0 ? 'No geofences created yet' : 'No geofences match the current filters'}
            description={
              geofences.length === 0
                ? 'Create your first geofence to start triggering events for trips, vehicles, and checkpoints.'
                : 'Try adjusting the search term, type, or status filter to find the zone you are looking for.'
            }
            action={
              geofences.length === 0 ? (
                <Button size="sm" onClick={openCreateForm}>Create first geofence</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => { setSearch(''); setTypeFilter('All'); setStatusFilter('All') }}>
                  Reset filters
                </Button>
              )
            }
          />
        ) : (
          <GeofenceList
            geofences={paginatedGeofences}
            onEdit={openEditForm}
            onToggle={(geofence) => void toggleGeofenceStatus(geofence.id, !geofence.isActive)}
            onDelete={setPendingDelete}
          />
        )}
        {totalPages > 1 && (
          <PaginationStrip
            page={page}
            totalPages={totalPages}
            totalItems={filteredGeofences.length}
            pageSize={PAGE_SIZE}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
            itemLabel="geofences"
          />
        )}
      </div>
    </TrackTraceAccessBoundary>
  )
}
