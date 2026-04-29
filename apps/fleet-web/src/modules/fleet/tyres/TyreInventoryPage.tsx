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
import { TyreInventoryItem, Vehicle } from '../../../types';
import { TyreInventoryDetailPage } from './TyreInventoryDetailPage';
import { TyreInventoryFormPage } from './TyreInventoryFormPage';
import { tyreStatusTone } from './tyreValidation';

interface TyreInventoryPageProps {
  createTyre: (tyre: TyreInventoryItem) => Promise<TyreInventoryItem>;
  error: string | null;
  loading: boolean;
  navigateTo: (path: string) => void;
  route: FleetRoute;
  tyreInventory: TyreInventoryItem[];
  updateTyre: (tyre: TyreInventoryItem) => Promise<TyreInventoryItem>;
  vehicles: Vehicle[];
}

export function TyreInventoryPage({ createTyre, error, loading, navigateTo, route, tyreInventory, updateTyre, vehicles }: TyreInventoryPageProps) {
  const tyre = route.id ? tyreInventory.find((item) => item.id === route.id) : undefined;
  const basePath = `/${route.section}`;

  if (loading) return <LoadingState label="Loading tyre inventory" />;
  if (error && tyreInventory.length === 0) return <ErrorState message={error} title="Tyre inventory unavailable" />;

  if (route.mode === 'create') {
    return (
      <FleetAccessGate fallback={<EmptyState description="You do not have permission to create tyres." title="Create unavailable" />} permission={ACTION_PERMISSIONS.createTyre}>
        <TyreInventoryFormPage mode="create" onCancel={() => navigateTo(basePath)} onSubmit={async (nextTyre) => {
          const created = await createTyre(nextTyre);
          navigateTo(`${basePath}/${created.id}`);
        }} vehicles={vehicles} />
      </FleetAccessGate>
    );
  }

  if (route.mode === 'edit') {
    return (
      <FleetAccessGate fallback={<EmptyState description="You do not have permission to edit tyres." title="Edit unavailable" />} permission={ACTION_PERMISSIONS.editTyre}>
        <TyreInventoryFormPage mode="edit" onCancel={() => navigateTo(tyre ? `${basePath}/${tyre.id}` : basePath)} onSubmit={async (nextTyre) => {
          const updated = await updateTyre(nextTyre);
          navigateTo(`${basePath}/${updated.id}`);
        }} tyre={tyre} vehicles={vehicles} />
      </FleetAccessGate>
    );
  }

  if (route.mode === 'detail') {
    return <TyreInventoryDetailPage onBack={() => navigateTo(basePath)} onEdit={() => tyre && navigateTo(`${basePath}/${tyre.id}/edit`)} tyre={tyre} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        actions={<FleetAccessGate permission={ACTION_PERMISSIONS.createTyre}><Button icon={<Plus className="h-4 w-4" />} onClick={() => navigateTo(`${basePath}/create`)} variant="accent">Add Tyre</Button></FleetAccessGate>}
        subtitle="Track fitment, spare pool, retread cycles, damage, and scrap decisions."
        title="Tyre Inventory"
      />
      {error && <ErrorState message={error} title="Showing cached or demo tyre data" />}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <DataTable columns={columns} emptyMessage="No tyre inventory records found." getRowKey={(item) => item.id} onRowClick={(item) => navigateTo(`${basePath}/${item.id}`)} rows={tyreInventory} />
      </section>
    </div>
  );
}

const columns: Array<DataTableColumn<TyreInventoryItem>> = [
  { header: 'Tyre', key: 'tyre', render: (row) => <div><p className="font-bold text-text">{row.serialNo}</p><p className="text-xs text-gray-500">{row.brand} · {row.size}</p></div> },
  { header: 'Status', key: 'status', render: (row) => <StatusBadge tone={tyreStatusTone(row.status)}>{row.status}</StatusBadge> },
  { header: 'Vehicle', key: 'vehicle', render: (row) => row.vehicleRegistration ?? 'Spare pool' },
  { header: 'Tread', key: 'tread', render: (row) => `${row.treadMm} mm` },
  { header: 'Pressure', key: 'pressure', render: (row) => `${row.pressurePsi} PSI` },
  { align: 'right', header: 'KM Run', key: 'kmRun', render: (row) => row.kmRun.toLocaleString() },
];
