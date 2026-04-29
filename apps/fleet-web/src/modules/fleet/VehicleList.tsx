import { Filter, Grid2X2, List, Plus, Search, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../components/Button';
import { DataTable, DataTableColumn } from '../../components/DataTable';
import { MeterBar } from '../../components/MeterBar';
import { StatusBadge } from '../../components/StatusBadge';
import { Vehicle } from '../../types';
import { VehicleDetailDrawer } from './VehicleDetailDrawer';

type ViewMode = 'grid' | 'table';

interface VehicleListProps {
  onCreate?: () => void;
  onVehicleSelect?: (vehicle: Vehicle) => void;
  vehicles: Vehicle[];
}

export function VehicleList({ onCreate, onVehicleSelect, vehicles }: VehicleListProps) {
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const filteredVehicles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return vehicles;

    return vehicles.filter((vehicle) =>
      [vehicle.registrationNo, vehicle.make, vehicle.model, vehicle.location, vehicle.status]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, vehicles]);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-in fade-in duration-300">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Assets</p>
          <h2 className="text-xl font-bold text-text">Vehicle Registry</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:w-72"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vehicles"
              value={query}
            />
          </div>
          <Button icon={<Filter className="h-4 w-4" />} variant="outline">Filter</Button>
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              aria-label="Grid view"
              className={`rounded-md p-2 ${viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
              onClick={() => setViewMode('grid')}
              type="button"
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              aria-label="Table view"
              className={`rounded-md p-2 ${viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
              onClick={() => setViewMode('table')}
              type="button"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          {onCreate && (
            <FleetAccessGate permission={ACTION_PERMISSIONS.createVehicle}>
              <Button icon={<Plus className="h-4 w-4" />} onClick={onCreate} variant="accent">Add Vehicle</Button>
            </FleetAccessGate>
          )}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredVehicles.map((vehicle) => (
            <button
              className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-secondary hover:shadow-md"
              key={vehicle.id}
              onClick={() => (onVehicleSelect ? onVehicleSelect(vehicle) : setSelectedVehicle(vehicle))}
              type="button"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-text">{vehicle.registrationNo}</p>
                    <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model}</p>
                  </div>
                </div>
                <StatusBadge tone={vehicle.status === 'Active' ? 'success' : vehicle.status === 'Maintenance' ? 'warning' : 'neutral'}>{vehicle.status}</StatusBadge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="font-semibold">{vehicle.location}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Driver</p>
                  <p className="truncate font-semibold">{vehicle.driver?.name ?? 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Utilization</p>
                  <p className="font-semibold">{vehicle.utilization}%</p>
                </div>
              </div>
              <MeterBar className="mt-4" tone="primary" value={vehicle.utilization} />
            </button>
          ))}
        </div>
      ) : (
        <DataTable
          columns={vehicleColumns}
          getRowKey={(vehicle) => vehicle.id}
          onRowClick={(vehicle) => (onVehicleSelect ? onVehicleSelect(vehicle) : setSelectedVehicle(vehicle))}
          pageSize={8}
          rows={filteredVehicles}
        />
      )}

      <VehicleDetailDrawer onClose={() => setSelectedVehicle(null)} vehicle={selectedVehicle} />
    </section>
  );
}

const vehicleColumns: Array<DataTableColumn<Vehicle>> = [
  {
    header: 'Vehicle',
    key: 'vehicle',
    render: (vehicle) => <div><p className="font-bold text-text">{vehicle.registrationNo}</p><p className="text-xs text-gray-500">{vehicle.make} {vehicle.model}</p></div>,
    sortable: true,
    sortValue: (vehicle) => vehicle.registrationNo,
  },
  {
    header: 'Status',
    key: 'status',
    render: (vehicle) => <StatusBadge tone={vehicle.status === 'Active' ? 'success' : vehicle.status === 'Maintenance' ? 'warning' : 'neutral'}>{vehicle.status}</StatusBadge>,
    sortable: true,
    sortValue: (vehicle) => vehicle.status,
  },
  { header: 'Location', key: 'location', render: (vehicle) => vehicle.location, sortable: true, sortValue: (vehicle) => vehicle.location },
  { header: 'Driver', key: 'driver', render: (vehicle) => vehicle.driver?.name ?? 'Unassigned', sortable: true, sortValue: (vehicle) => vehicle.driver?.name ?? '' },
  { header: 'Odometer', key: 'odometer', render: (vehicle) => `${vehicle.specs.odometerKm.toLocaleString()} km`, sortable: true, sortValue: (vehicle) => vehicle.specs.odometerKm },
  { align: 'right', header: 'Utilization', key: 'utilization', render: (vehicle) => <span className="font-bold text-secondary">{vehicle.utilization}%</span>, sortable: true, sortValue: (vehicle) => vehicle.utilization },
];
