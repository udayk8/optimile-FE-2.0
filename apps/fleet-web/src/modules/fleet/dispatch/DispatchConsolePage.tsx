import { ClipboardCheck, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../../components/Button';
import { DataTable, DataTableColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { FilterBar } from '../../../components/FilterBar';
import { LoadingState } from '../../../components/LoadingState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { FleetRoute } from '../../../routing/fleetRoutes';
import { DispatchAssignment, FleetDriver, MaintenanceWorkOrder, Vehicle } from '../../../types';
import { DispatchPrecheckPage } from './DispatchPrecheckPage';
import { getDriverReadiness, getVehicleReadiness } from './dispatchReadiness';

interface DispatchConsolePageProps {
  createDispatchAssignment: (assignment: DispatchAssignment) => Promise<DispatchAssignment>;
  dispatchAssignments: DispatchAssignment[];
  drivers: FleetDriver[];
  error: string | null;
  loading: boolean;
  navigateTo: (path: string) => void;
  route: FleetRoute;
  vehicles: Vehicle[];
  workOrders: MaintenanceWorkOrder[];
}

export function DispatchConsolePage({ createDispatchAssignment, dispatchAssignments, drivers, error, loading, navigateTo, route, vehicles, workOrders }: DispatchConsolePageProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId);
  const basePath = `/${route.section}`;

  const vehicleRows = useMemo(() => vehicles.map((vehicle) => ({ item: vehicle, readiness: getVehicleReadiness(vehicle, workOrders) })), [vehicles, workOrders]);
  const driverRows = useMemo(() => drivers.map((driver) => ({ item: driver, readiness: getDriverReadiness(driver) })), [drivers]);
  const filteredVehicleRows = useMemo(() => filterRows(vehicleRows, vehicleSearch, (vehicle) => [vehicle.registrationNo, vehicle.location, vehicle.status, vehicle.driver?.name].join(' ')), [vehicleRows, vehicleSearch]);
  const filteredDriverRows = useMemo(() => filterRows(driverRows, driverSearch, (driver) => [driver.name, driver.baseLocation, driver.assignmentStatus, driver.licenseNo].join(' ')), [driverRows, driverSearch]);

  if (loading) return <LoadingState label="Loading dispatch console" />;
  if (error && vehicles.length === 0 && drivers.length === 0) return <ErrorState message={error} title="Dispatch data unavailable" />;

  if (route.mode === 'detail' && route.id === 'precheck') {
    return (
      <DispatchPrecheckPage
        createDispatchAssignment={createDispatchAssignment}
        driver={selectedDriver}
        onBack={() => navigateTo(basePath)}
        onComplete={() => navigateTo(basePath)}
        vehicle={selectedVehicle}
        workOrders={workOrders}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        actions={(
          <FleetAccessGate permission={ACTION_PERMISSIONS.assignDispatch}>
            <Button disabled={!selectedVehicle || !selectedDriver} icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => navigateTo(`${basePath}/precheck`)} variant="accent">Run Pre-check</Button>
          </FleetAccessGate>
        )}
        subtitle="Match dispatch-ready vehicles and drivers, resolve blockers, and confirm assignments."
        title="Dispatch Console"
      />
      {error && <ErrorState message={error} title="Showing cached or demo dispatch data" />}

      <section className="grid gap-6 xl:grid-cols-2">
        <SelectionPanel
          columns={vehicleColumns}
          emptyMessage="No vehicles found."
          getKey={(row) => row.item.id}
          onSearchChange={setVehicleSearch}
          onSelect={(row) => setSelectedVehicleId(row.item.id)}
          rows={filteredVehicleRows}
          searchValue={vehicleSearch}
          selectedId={selectedVehicleId}
          title="Available Vehicles"
        />
        <SelectionPanel
          columns={driverColumns}
          emptyMessage="No drivers found."
          getKey={(row) => row.item.id}
          onSearchChange={setDriverSearch}
          onSelect={(row) => setSelectedDriverId(row.item.id)}
          rows={filteredDriverRows}
          searchValue={driverSearch}
          selectedId={selectedDriverId}
          title="Available Drivers"
        />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-secondary">Dispatch Ledger</p>
            <h2 className="text-lg font-bold text-text">Recent Assignments</h2>
          </div>
          <Send className="h-5 w-5 text-primary" />
        </div>
        <DataTable columns={assignmentColumns} emptyMessage="No dispatch assignments yet." getRowKey={(item) => item.id} pageSize={8} rows={dispatchAssignments} />
      </section>
    </div>
  );
}

interface Row<T> {
  item: T;
  readiness: ReturnType<typeof getVehicleReadiness>;
}

function SelectionPanel<T extends { id: string }>({ columns, emptyMessage, getKey, onSearchChange, onSelect, rows, searchValue, selectedId, title }: { columns: Array<DataTableColumn<Row<T>>>; emptyMessage: string; getKey: (row: Row<T>) => string; onSearchChange: (value: string) => void; onSelect: (row: Row<T>) => void; rows: Array<Row<T>>; searchValue: string; selectedId: string; title: string }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-text">{title}</h2>
        <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200">{rows.filter((row) => row.readiness.ready).length} ready</span>
      </div>
      <div className="mb-4">
        <FilterBar onSearchChange={onSearchChange} placeholder={`Search ${title.toLowerCase()}`} searchValue={searchValue} />
      </div>
      {rows.length === 0 ? <EmptyState description={emptyMessage} title={title} /> : (
      <div className="space-y-2">
        {rows.map((row) => (
          <button className={`w-full rounded-xl border p-3 text-left transition ${getKey(row) === selectedId ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white hover:bg-gray-50'}`} key={getKey(row)} onClick={() => onSelect(row)} type="button">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
              {columns.map((column) => <div key={column.key}>{column.render(row)}</div>)}
            </div>
            {!row.readiness.ready && row.readiness.blockers[0] && (
              <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                {row.readiness.blockers[0].category}: {row.readiness.blockers[0].reason} - {row.readiness.blockers[0].suggestedAction}
              </p>
            )}
            {row.readiness.ready && row.readiness.warnings[0] && <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">{row.readiness.warnings[0]}</p>}
          </button>
        ))}
      </div>
      )}
    </section>
  );
}

function filterRows<T extends { id: string }>(rows: Array<Row<T>>, query: string, getSearchText: (item: T) => string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;
  return rows.filter((row) => getSearchText(row.item).toLowerCase().includes(normalized));
}

const vehicleColumns: Array<DataTableColumn<Row<Vehicle>>> = [
  { header: 'Vehicle', key: 'vehicle', render: (row) => <div><p className="font-bold text-text">{row.item.registrationNo}</p><p className="text-xs text-gray-500">{row.item.location}</p></div> },
  { header: 'Readiness', key: 'readiness', render: (row) => <StatusBadge tone={row.readiness.ready ? 'success' : 'danger'}>{row.readiness.ready ? 'Ready' : 'Blocked'}</StatusBadge> },
];

const driverColumns: Array<DataTableColumn<Row<FleetDriver>>> = [
  { header: 'Driver', key: 'driver', render: (row) => <div><p className="font-bold text-text">{row.item.name}</p><p className="text-xs text-gray-500">{row.item.baseLocation}</p></div> },
  { header: 'Readiness', key: 'readiness', render: (row) => <StatusBadge tone={row.readiness.ready ? 'success' : 'danger'}>{row.readiness.ready ? 'Ready' : 'Blocked'}</StatusBadge> },
];

const assignmentColumns: Array<DataTableColumn<DispatchAssignment>> = [
  { header: 'Assignment', key: 'assignment', render: (row) => <div><p className="font-bold text-text">{row.vehicleRegistration}</p><p className="text-xs text-gray-500">{row.driverName}</p></div> },
  { header: 'Route', key: 'route', render: (row) => row.routeName },
  { header: 'Start', key: 'plannedStart', render: (row) => row.plannedStart },
  { header: 'Status', key: 'status', render: (row) => <StatusBadge tone={row.status === 'Assigned' ? 'success' : row.status === 'Blocked' ? 'danger' : 'primary'}>{row.status}</StatusBadge> },
];
