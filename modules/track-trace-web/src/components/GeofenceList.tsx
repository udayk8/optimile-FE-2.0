import { Button, Card, DataTable } from '@shared-ui'
import type { TrackingGeofence } from '../types/geofence.types'

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${isActive ? 'bg-success/10 text-success' : 'bg-secondary/10 text-secondary'}`}>
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
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-[14px] font-semibold text-text">Geofence list</h3>
        <p className="text-[12px] text-gray-500">Operational geofences linked to trips, checkpoints, customers, and restricted zones.</p>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 p-4 md:hidden">
        {geofences.map((row) => (
          <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[14px] font-semibold text-text">{row.name}</p>
                <p className="text-[12px] text-gray-500">{row.type}</p>
              </div>
              <StatusBadge isActive={row.isActive} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Radius</p>
                <p className="mt-0.5 text-[13px] font-semibold text-text">{row.radiusMeters} m</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Coordinates</p>
                <p className="mt-0.5 text-[13px] font-semibold text-text">{row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2 sm:col-span-2">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Linked entity</p>
                <p className="mt-0.5 text-[13px] font-semibold text-text">{row.linkedEntityId}</p>
                <p className="text-[12px] text-gray-500">{row.linkedEntityType}</p>
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
