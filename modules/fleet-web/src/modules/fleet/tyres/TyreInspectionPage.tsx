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
import { TyreInspection, TyreInventoryItem } from '../../../types';
import { TyreInspectionDetailPage } from './TyreInspectionDetailPage';
import { TyreInspectionFormPage } from './TyreInspectionFormPage';

interface TyreInspectionPageProps {
  createTyreInspection: (inspection: TyreInspection) => Promise<TyreInspection>;
  error: string | null;
  loading: boolean;
  navigateTo: (path: string) => void;
  route: FleetRoute;
  tyreInspections: TyreInspection[];
  tyreInventory: TyreInventoryItem[];
}

export function TyreInspectionPage({ createTyreInspection, error, loading, navigateTo, route, tyreInspections, tyreInventory }: TyreInspectionPageProps) {
  const inspection = route.id ? tyreInspections.find((item) => item.id === route.id) : undefined;
  const basePath = `/${route.section}`;
  if (loading) return <LoadingState label="Loading tyre inspections" />;
  if (error && tyreInspections.length === 0) return <ErrorState message={error} title="Tyre inspections unavailable" />;
  if (route.mode === 'create') {
    return <FleetAccessGate fallback={<EmptyState description="You do not have permission to create inspections." title="Create unavailable" />} permission={ACTION_PERMISSIONS.createTyreInspection}><TyreInspectionFormPage onCancel={() => navigateTo(basePath)} onSubmit={async (nextInspection) => { const created = await createTyreInspection(nextInspection); navigateTo(`${basePath}/${created.id}`); }} tyres={tyreInventory} /></FleetAccessGate>;
  }
  if (route.mode === 'detail') return <TyreInspectionDetailPage inspection={inspection} onBack={() => navigateTo(basePath)} />;
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<FleetAccessGate permission={ACTION_PERMISSIONS.createTyreInspection}><Button icon={<Plus className="h-4 w-4" />} onClick={() => navigateTo(`${basePath}/create`)} variant="accent">Add Inspection</Button></FleetAccessGate>} subtitle="Record tyre pressure, tread depth, inspector notes, and pass/fail outcome." title="Tyre Inspections" />
      {error && <ErrorState message={error} title="Showing cached or demo inspection data" />}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><DataTable columns={columns} emptyMessage="No tyre inspections found." getRowKey={(item) => item.id} onRowClick={(item) => navigateTo(`${basePath}/${item.id}`)} rows={tyreInspections} /></section>
    </div>
  );
}

const columns: Array<DataTableColumn<TyreInspection>> = [
  { header: 'Tyre', key: 'tyre', render: (row) => <div><p className="font-bold text-text">{row.tyreSerialNo}</p><p className="text-xs text-gray-500">{row.vehicleRegistration ?? 'Unassigned'}</p></div> },
  { header: 'Inspector', key: 'inspector', render: (row) => row.inspector },
  { header: 'Date', key: 'date', render: (row) => row.inspectionDate },
  { header: 'Status', key: 'status', render: (row) => <StatusBadge tone={row.status === 'Passed' ? 'success' : row.status === 'Watch' ? 'warning' : 'danger'}>{row.status}</StatusBadge> },
  { align: 'right', header: 'Tread', key: 'tread', render: (row) => `${row.treadMm} mm` },
];
