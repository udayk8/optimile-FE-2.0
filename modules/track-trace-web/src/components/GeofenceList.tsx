import { Button, Card, DataTable } from '@shared-ui'
import type { TrackingGeofence } from '../types/geofence.types'

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? 'bg-success/10 text-success' : 'bg-secondary/10 text-secondary'}`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

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

      {/* Mobile cards */}
      <div className="space-y-3 p-4 md:hidden">
        {geofences.map((row) => (
          <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-extrabold text-text">{row.name}</p>
                <p className="mt-1 text-xs font-semibold text-gray-500">{row.type}</p>
              </div>
              <StatusBadge isActive={row.isActive} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Radius</p>
                <p className="mt-1 text-sm font-semibold text-text">{row.radiusMeters} m</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Coordinates</p>
                <p className="mt-1 text-sm font-semibold text-text">{row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-3 sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Linked entity</p>
                <p className="mt-1 text-sm font-semibold text-text">{row.linkedEntityId}</p>
                <p className="text-xs text-gray-500">{row.linkedEntityType}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(row)}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => onToggle(row)}>
                {row.isActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete(row)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <DataTable
          className="rounded-none border-0"
          rows={geofences}
          getRowKey={(row) => row.id}
          columns={[
            { key: 'name', header: 'Name', render: (row) => row.name },
            { key: 'type', header: 'Type', render: (row) => row.type },
            { key: 'radiusMeters', header: 'Radius', render: (row) => `${row.radiusMeters} m` },
            { key: 'coordinates', header: 'Coordinates', render: (row) => `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}` },
            { key: 'linkedEntityType', header: 'Linked Entity', render: (row) => `${row.linkedEntityType} · ${row.linkedEntityId}` },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusBadge isActive={row.isActive} />,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(row)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => onToggle(row)}>
                    {row.isActive ? 'Deactivate' : 'Activate'}
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
