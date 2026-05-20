import { Button, Card, DataTable } from '@shared-ui'
import type { TrackingGeofence } from '../types/geofence.types'

export function GeofenceList({
  geofences,
  onEdit,
  onToggle,
  onDelete,
}: {
  geofences: TrackingGeofence[]
  onEdit: (geofence: TrackingGeofence) => void
  onToggle: (geofence: TrackingGeofence) => void
  onDelete: (geofence: TrackingGeofence) => void
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-gray-200 px-5 py-4">
        <h3 className="text-lg font-bold text-text">Geofence list</h3>
        <p className="mt-1 text-sm text-gray-600">Operational geofences linked to trips, checkpoints, customers, and restricted zones.</p>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {geofences.map((row) => (
          <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-extrabold text-text">{row.name}</p>
                <p className="mt-1 text-xs font-semibold text-gray-500">{row.type}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.isActive ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-600'}`}>
                {row.isActive ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Radius</p>
                <p className="mt-1 text-sm font-semibold text-text">{row.radiusMeters} m</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Linked entity</p>
                <p className="mt-1 text-sm font-semibold text-text">{row.linkedEntityType}</p>
                <p className="text-xs text-gray-500">{row.linkedEntityId}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(row)}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => onToggle(row)}>
                {row.isActive ? 'Disable' : 'Enable'}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete(row)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:block">
      <DataTable
        className="rounded-none border-0"
        rows={geofences}
        getRowKey={(row) => row.id}
        columns={[
          { key: 'name', header: 'Name', render: (row) => row.name },
          { key: 'type', header: 'Type', render: (row) => row.type },
          { key: 'radiusMeters', header: 'Radius', render: (row) => `${row.radiusMeters} m` },
          { key: 'linkedEntityType', header: 'Linked Entity', render: (row) => `${row.linkedEntityType} · ${row.linkedEntityId}` },
          { key: 'state', header: 'State', render: (row) => (row.isActive ? 'Active' : 'Disabled') },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(row)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => onToggle(row)}>
                  {row.isActive ? 'Disable' : 'Enable'}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(row)}>Delete</Button>
              </div>
            ),
          },
        ]}
      />
      </div>
    </Card>
  )
}
