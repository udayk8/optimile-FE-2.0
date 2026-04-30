import { Plus } from 'lucide-react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Button } from '../../../components/Button';
import { DataTable, DataTableColumn } from '../../../components/DataTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { FleetRoute } from '../../../routing/fleetRoutes';
import { BatteryAsset, Vehicle } from '../../../types';
import { BatteryDetailPage } from './BatteryDetailPage';
import { BatteryFormPage } from './BatteryFormPage';
import { batteryStatusTone } from './batteryValidation';

interface BatteryManagementPageProps {
  batteries: BatteryAsset[];
  createBattery: (battery: BatteryAsset) => Promise<BatteryAsset>;
  error: string | null;
  loading: boolean;
  navigateTo: (path: string) => void;
  route: FleetRoute;
  updateBattery: (battery: BatteryAsset) => Promise<BatteryAsset>;
  vehicles: Vehicle[];
}

export function BatteryManagementPage({ batteries, createBattery, error, loading, navigateTo, route, updateBattery, vehicles }: BatteryManagementPageProps) {
  const battery = route.id ? batteries.find((item) => item.id === route.id) : undefined;
  const basePath = `/${route.section}`;

  if (loading) return <LoadingState label="Loading batteries" />;
  if (error && batteries.length === 0) return <ErrorState message={error} title="Battery data unavailable" />;

  if (route.mode === 'create') {
    return (
      <FleetAccessGate fallback={<EmptyState description="You do not have permission to create batteries." title="Create unavailable" />} permission={ACTION_PERMISSIONS.createBattery}>
        <BatteryFormPage mode="create" onCancel={() => navigateTo(basePath)} onSubmit={async (nextBattery) => {
          const created = await createBattery(nextBattery);
          navigateTo(`${basePath}/${created.id}`);
        }} vehicles={vehicles} />
      </FleetAccessGate>
    );
  }

  if (route.mode === 'edit') {
    return (
      <FleetAccessGate fallback={<EmptyState description="You do not have permission to edit batteries." title="Edit unavailable" />} permission={ACTION_PERMISSIONS.editBattery}>
        <BatteryFormPage battery={battery} mode="edit" onCancel={() => navigateTo(battery ? `${basePath}/${battery.id}` : basePath)} onSubmit={async (nextBattery) => {
          const updated = await updateBattery(nextBattery);
          navigateTo(`${basePath}/${updated.id}`);
        }} vehicles={vehicles} />
      </FleetAccessGate>
    );
  }

  if (route.mode === 'detail') {
    return <BatteryDetailPage battery={battery} onBack={() => navigateTo(basePath)} onEdit={() => battery && navigateTo(`${basePath}/${battery.id}/edit`)} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        actions={<FleetAccessGate permission={ACTION_PERMISSIONS.createBattery}><Button icon={<Plus className="h-4 w-4" />} onClick={() => navigateTo(`${basePath}/create`)} variant="accent">Add Battery</Button></FleetAccessGate>}
        subtitle="Track battery health, warranty, inspection history, replacement planning, and vehicle assignment."
        title="Battery Management"
      />
      {error && <ErrorState message={error} title="Showing cached or demo battery data" />}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <DataTable columns={columns} emptyMessage="No battery assets found." getRowKey={(item) => item.id} onRowClick={(item) => navigateTo(`${basePath}/${item.id}`)} rows={batteries} />
      </section>
    </div>
  );
}

const columns: Array<DataTableColumn<BatteryAsset>> = [
  { header: 'Battery', key: 'battery', render: (row) => <div><p className="font-bold text-text">{row.serialNo}</p><p className="text-xs text-gray-500">{row.brand} · {row.chemistry}</p></div> },
  { header: 'Status', key: 'status', render: (row) => <StatusBadge tone={batteryStatusTone(row.status)}>{row.status}</StatusBadge> },
  { header: 'Vehicle', key: 'vehicle', render: (row) => row.vehicleRegistration ?? 'Unassigned' },
  { header: 'Health', key: 'health', render: (row) => `${row.healthPercent}%` },
  { header: 'Voltage', key: 'voltage', render: (row) => `${row.voltage} V` },
  { align: 'right', header: 'Replacement Due', key: 'replacementDueDate', render: (row) => row.replacementDueDate },
];
