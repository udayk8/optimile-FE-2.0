import { Plus } from 'lucide-react';
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
import { DispatchAssignment, FleetAlert, FleetDriver, MaintenanceWorkOrder, Vehicle } from '../../../types';
import { DriverDetailPage } from './DriverDetailPage';
import { DriverFormPage } from './DriverFormPage';
import { useMemo, useState } from 'react';

interface DriverManagementPageProps {
  createDriver: (driver: FleetDriver) => Promise<FleetDriver>;
  deleteDriver: (id: string) => Promise<void>;
  alerts: FleetAlert[];
  dispatchAssignments: DispatchAssignment[];
  drivers: FleetDriver[];
  error: string | null;
  loading: boolean;
  navigateTo: (path: string) => void;
  route: FleetRoute;
  updateDriver: (driver: FleetDriver) => Promise<FleetDriver>;
  vehicles: Vehicle[];
  workOrders: MaintenanceWorkOrder[];
}

export function DriverManagementPage({ alerts, createDriver, deleteDriver, dispatchAssignments, drivers, error, loading, navigateTo, route, updateDriver, vehicles, workOrders }: DriverManagementPageProps) {
  const [query, setQuery] = useState('');
  const driver = route.id ? drivers.find((item) => item.id === route.id) : undefined;
  const basePath = `/${route.section}`;

  const filteredDrivers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return drivers;
    return drivers.filter((item) => [item.name, item.phone, item.licenseNo, item.baseLocation, item.assignmentStatus].join(' ').toLowerCase().includes(normalized));
  }, [drivers, query]);

  if (loading) return <LoadingState label="Loading drivers" />;
  if (error && drivers.length === 0) return <ErrorState message={error} title="Driver data unavailable" />;

  if (route.mode === 'create') {
    return (
      <FleetAccessGate fallback={<EmptyState description="You do not have permission to create drivers." title="Create unavailable" />} permission={ACTION_PERMISSIONS.createDriver}>
        <DriverFormPage
          mode="create"
          onCancel={() => navigateTo(basePath)}
          onSubmit={async (nextDriver) => {
            const created = await createDriver(nextDriver);
            navigateTo(`${basePath}/${created.id}`);
          }}
        />
      </FleetAccessGate>
    );
  }

  if (route.mode === 'edit') {
    return (
      <FleetAccessGate fallback={<EmptyState description="You do not have permission to edit drivers." title="Edit unavailable" />} permission={ACTION_PERMISSIONS.editDriver}>
        <DriverFormPage
          driver={driver}
          mode="edit"
          onCancel={() => navigateTo(driver ? `${basePath}/${driver.id}` : basePath)}
          onSubmit={async (nextDriver) => {
            const updated = await updateDriver(nextDriver);
            navigateTo(`${basePath}/${updated.id}`);
          }}
        />
      </FleetAccessGate>
    );
  }

  if (route.mode === 'detail') {
    return (
      <DriverDetailPage
        driver={driver}
        alerts={alerts}
        dispatchAssignments={dispatchAssignments}
        navigateTo={navigateTo}
        onBack={() => navigateTo(basePath)}
        onDelete={async () => {
          if (!driver) return;
          await deleteDriver(driver.id);
          navigateTo(basePath);
        }}
        onEdit={() => driver && navigateTo(`${basePath}/${driver.id}/edit`)}
        vehicles={vehicles}
        workOrders={workOrders}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={(
          <FleetAccessGate permission={ACTION_PERMISSIONS.createDriver}>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigateTo(`${basePath}/create`)} variant="accent">Add Driver</Button>
          </FleetAccessGate>
        )}
        subtitle="Create, inspect, and maintain driver readiness records."
        title="Driver Management"
      />
      {error && <ErrorState message={error} title="Showing cached or demo driver data" />}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <FilterBar onSearchChange={setQuery} placeholder="Search drivers" searchValue={query} />
        <div className="mt-5">
          <DataTable columns={driverColumns} emptyMessage="Try a different search term or add a new driver." getRowKey={(item) => item.id} onRowClick={(item) => navigateTo(`${basePath}/${item.id}`)} pageSize={8} rows={filteredDrivers} />
        </div>
      </section>
    </div>
  );
}

const driverColumns: Array<DataTableColumn<FleetDriver>> = [
  {
    header: 'Driver',
    key: 'driver',
    render: (item) => <div><p className="font-bold text-text">{item.name}</p><p className="text-xs text-gray-500">{item.licenseClass} · {item.baseLocation}</p></div>,
    sortable: true,
    sortValue: (item) => item.name,
  },
  {
    header: 'Readiness',
    key: 'readiness',
    render: (item) => <StatusBadge tone={item.assignmentStatus === 'Available' ? 'success' : item.assignmentStatus === 'Inactive' ? 'neutral' : 'primary'}>{item.assignmentStatus}</StatusBadge>,
    sortable: true,
    sortValue: (item) => item.assignmentStatus,
  },
  { header: 'Documents', key: 'documents', render: (item) => <span>DL {item.licenseExpiryDate}<br />Medical {item.medicalExpiryDate}</span>, sortable: true, sortValue: (item) => item.licenseExpiryDate },
  { align: 'right', header: 'Score', key: 'score', render: (item) => <span className="font-bold text-text">{item.behaviorScore}/100</span>, sortable: true, sortValue: (item) => item.behaviorScore },
  { header: 'Protected PII', key: 'pii', render: (item) => <span>{item.aadhaarMasked}<br />{item.bankAccountMasked}</span> },
];
