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
import { TyreInventoryItem, TyreJobCard } from '../../../types';
import { TyreJobCardDetailPage } from './TyreJobCardDetailPage';
import { TyreJobCardFormPage } from './TyreJobCardFormPage';

export function TyreJobCardPage({ createTyreJobCard, error, loading, navigateTo, route, tyreInventory, tyreJobCards }: { createTyreJobCard: (jobCard: TyreJobCard) => Promise<TyreJobCard>; error: string | null; loading: boolean; navigateTo: (path: string) => void; route: FleetRoute; tyreInventory: TyreInventoryItem[]; tyreJobCards: TyreJobCard[] }) {
  const jobCard = route.id ? tyreJobCards.find((item) => item.id === route.id) : undefined;
  const basePath = `/${route.section}`;
  if (loading) return <LoadingState label="Loading tyre job cards" />;
  if (error && tyreJobCards.length === 0) return <ErrorState message={error} title="Tyre job cards unavailable" />;
  if (route.mode === 'create') {
    return <FleetAccessGate fallback={<EmptyState description="You do not have permission to create tyre job cards." title="Create unavailable" />} permission={ACTION_PERMISSIONS.createTyreJobCard}><TyreJobCardFormPage onCancel={() => navigateTo(basePath)} onSubmit={async (nextJobCard) => { const created = await createTyreJobCard(nextJobCard); navigateTo(`${basePath}/${created.id}`); }} tyres={tyreInventory} /></FleetAccessGate>;
  }
  if (route.mode === 'detail') return <TyreJobCardDetailPage jobCard={jobCard} onBack={() => navigateTo(basePath)} />;
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader actions={<FleetAccessGate permission={ACTION_PERMISSIONS.createTyreJobCard}><Button icon={<Plus className="h-4 w-4" />} onClick={() => navigateTo(`${basePath}/create`)} variant="accent">Create Job Card</Button></FleetAccessGate>} subtitle="Plan tyre fitment, rotation, repair, retread, and scrap work." title="Tyre Job Cards" />
      {error && <ErrorState message={error} title="Showing cached or demo job card data" />}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><DataTable columns={columns} emptyMessage="No tyre job cards found." getRowKey={(item) => item.id} onRowClick={(item) => navigateTo(`${basePath}/${item.id}`)} rows={tyreJobCards} /></section>
    </div>
  );
}

const columns: Array<DataTableColumn<TyreJobCard>> = [
  { header: 'Job Card', key: 'title', render: (row) => <div><p className="font-bold text-text">{row.title}</p><p className="text-xs text-gray-500">{row.tyreSerialNo} · {row.vehicleRegistration ?? 'Unassigned'}</p></div> },
  { header: 'Action', key: 'action', render: (row) => row.action },
  { header: 'Assigned To', key: 'assignedTo', render: (row) => row.assignedTo },
  { header: 'Status', key: 'status', render: (row) => <StatusBadge tone={row.status === 'Completed' ? 'success' : row.status === 'In Progress' ? 'primary' : 'warning'}>{row.status}</StatusBadge> },
  { align: 'right', header: 'Cost', key: 'cost', render: (row) => `Rs ${row.estimatedCost.toLocaleString()}` },
];
