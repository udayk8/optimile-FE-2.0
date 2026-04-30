import { Plus } from 'lucide-react';
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
import { FleetAlert, InventoryTransaction, MaintenanceWorkOrder, PartInventoryItem, Vehicle, WorkOrderPartUsage, WorkOrderStatus } from '../../../types';
import { buildPartFromInventoryItem, canIssueStock, getPartId } from '../procurement/inventoryStock';
import { MaintenanceWorkOrderHub } from '../MaintenanceWorkOrderHub';
import { WorkOrderDetailPage } from './WorkOrderDetailPage';
import { WorkOrderFormPage } from './WorkOrderFormPage';

interface MaintenanceManagementPageProps {
  approveWorkOrder: (id: string) => Promise<MaintenanceWorkOrder | undefined>;
  closeWorkOrder: (id: string) => Promise<MaintenanceWorkOrder | undefined>;
  createWorkOrder: (workOrder: MaintenanceWorkOrder) => Promise<MaintenanceWorkOrder>;
  error: string | null;
  alerts: FleetAlert[];
  inventoryTransactions: InventoryTransaction[];
  loading: boolean;
  navigateTo: (path: string) => void;
  partsInventory: PartInventoryItem[];
  recordInventoryTransaction: (transaction: InventoryTransaction) => Promise<InventoryTransaction>;
  route: FleetRoute;
  updateWorkOrder: (workOrder: MaintenanceWorkOrder) => Promise<MaintenanceWorkOrder>;
  updateWorkOrderStatus: (id: string, status: WorkOrderStatus) => Promise<void>;
  vehicles: Vehicle[];
  workOrders: MaintenanceWorkOrder[];
}

export function MaintenanceManagementPage({
  alerts,
  approveWorkOrder,
  closeWorkOrder,
  createWorkOrder,
  error,
  inventoryTransactions,
  loading,
  navigateTo,
  partsInventory,
  recordInventoryTransaction,
  route,
  updateWorkOrder,
  updateWorkOrderStatus,
  vehicles,
  workOrders,
}: MaintenanceManagementPageProps) {
  const [searchValue, setSearchValue] = useState('');
  const workOrder = route.id ? workOrders.find((item) => item.id === route.id) : undefined;
  const basePath = `/${route.section}`;

  const filteredWorkOrders = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return workOrders;
    return workOrders.filter((item) => [
      item.title,
      item.vehicleRegistration,
      item.technician,
      item.priority,
      item.status,
      item.approvalRequired,
    ].filter(Boolean).some((value) => value?.toLowerCase().includes(query)));
  }, [searchValue, workOrders]);

  if (loading) return <LoadingState label="Loading work orders" />;
  if (error && workOrders.length === 0) return <ErrorState message={error} title="Maintenance data unavailable" />;

  if (route.mode === 'create') {
    return (
      <FleetAccessGate fallback={<EmptyState description="You do not have permission to create work orders." title="Create unavailable" />} permission={ACTION_PERMISSIONS.createWorkOrder}>
        <WorkOrderFormPage
          mode="create"
          onCancel={() => navigateTo(basePath)}
          onSubmit={async (nextWorkOrder) => {
            const created = await createWorkOrder(nextWorkOrder);
            navigateTo(`${basePath}/${created.id}`);
          }}
          inventoryTransactions={inventoryTransactions}
          partsInventory={partsInventory}
          vehicles={vehicles}
        />
      </FleetAccessGate>
    );
  }

  if (route.mode === 'edit') {
    return (
      <FleetAccessGate fallback={<EmptyState description="You do not have permission to edit work orders." title="Edit unavailable" />} permission={ACTION_PERMISSIONS.updateWorkOrder}>
        <WorkOrderFormPage
          mode="edit"
          onCancel={() => navigateTo(workOrder ? `${basePath}/${workOrder.id}` : basePath)}
          onSubmit={async (nextWorkOrder) => {
            const updated = await updateWorkOrder(nextWorkOrder);
            navigateTo(`${basePath}/${updated.id}`);
          }}
          inventoryTransactions={inventoryTransactions}
          partsInventory={partsInventory}
          vehicles={vehicles}
          workOrder={workOrder}
        />
      </FleetAccessGate>
    );
  }

  if (route.mode === 'detail') {
    const issuePart = async (partUsage: WorkOrderPartUsage) => {
      if (!workOrder) return;
      const inventoryItem = partsInventory.find((part) => getPartId(part) === partUsage.partId || part.partNumber === partUsage.partNumber);
      if (!inventoryItem) throw new Error('Inventory part could not be found.');
      const part = buildPartFromInventoryItem(inventoryItem, inventoryTransactions);
      if (part.status === 'Inactive') throw new Error('Inactive parts cannot be issued.');
      const availability = canIssueStock({ currentStock: part.currentStock, quantity: partUsage.quantity });
      if (!availability.allowed) throw new Error(availability.reason ?? 'Requested quantity exceeds available stock.');
      const transaction = await recordInventoryTransaction({
        transactionId: `txn-${Date.now()}`,
        partId: part.partId,
        quantity: partUsage.quantity,
        type: 'OUTWARD',
        referenceType: 'Work Order',
        referenceId: workOrder.id,
        performedBy: workOrder.technician,
        timestamp: new Date().toISOString(),
        remarks: `Issued to ${workOrder.title}`,
      });
      const updatedParts = (workOrder.partsUsed ?? []).map((part) => part.id === partUsage.id ? {
        ...part,
        inventoryTransactionIds: [...(part.inventoryTransactionIds ?? []), transaction.transactionId],
        issuedQuantity: partUsage.quantity,
        partId: partUsage.partId ?? getPartId(inventoryItem),
        status: 'Issued' as const,
      } : part);
      await updateWorkOrder({ ...workOrder, partsUsed: updatedParts, status: workOrder.status === 'Open' ? 'In Progress' : workOrder.status });
    };

    const consumePart = async (partUsage: WorkOrderPartUsage) => {
      if (!workOrder) return;
      const updatedParts = (workOrder.partsUsed ?? []).map((part) => part.id === partUsage.id ? {
        ...part,
        consumedQuantity: part.issuedQuantity ?? part.quantity,
        status: 'Consumed' as const,
      } : part);
      await updateWorkOrder({ ...workOrder, partsUsed: updatedParts });
    };

    const returnPart = async (partUsage: WorkOrderPartUsage) => {
      if (!workOrder) return;
      const inventoryItem = partsInventory.find((part) => getPartId(part) === partUsage.partId || part.partNumber === partUsage.partNumber);
      if (!inventoryItem) throw new Error('Inventory part could not be found.');
      const part = buildPartFromInventoryItem(inventoryItem, inventoryTransactions);
      const returnQuantity = partUsage.issuedQuantity ?? partUsage.consumedQuantity ?? partUsage.quantity;
      const transaction = await recordInventoryTransaction({
        transactionId: `txn-${Date.now()}`,
        partId: part.partId,
        quantity: returnQuantity,
        type: 'RETURN',
        referenceType: 'Work Order',
        referenceId: workOrder.id,
        performedBy: workOrder.technician,
        timestamp: new Date().toISOString(),
        remarks: `Returned from ${workOrder.title}`,
      });
      const updatedParts = (workOrder.partsUsed ?? []).map((partUsageItem) => partUsageItem.id === partUsage.id ? {
        ...partUsageItem,
        inventoryTransactionIds: [...(partUsageItem.inventoryTransactionIds ?? []), transaction.transactionId],
        returnedQuantity: returnQuantity,
        status: 'Returned' as const,
      } : partUsageItem);
      await updateWorkOrder({ ...workOrder, partsUsed: updatedParts });
    };

    return (
      <WorkOrderDetailPage
        onApprove={async () => {
          if (!workOrder) return;
          await approveWorkOrder(workOrder.id);
        }}
        onBack={() => navigateTo(basePath)}
        onCloseWorkOrder={async () => {
          if (!workOrder) return;
          const consumedParts = (workOrder.partsUsed ?? []).map((part) => part.status === 'Issued' ? { ...part, consumedQuantity: part.issuedQuantity ?? part.quantity, status: 'Consumed' as const } : part);
          if (consumedParts.some((part, index) => part !== workOrder.partsUsed?.[index])) {
            await updateWorkOrder({ ...workOrder, closedAt: new Date().toISOString().slice(0, 10), partsUsed: consumedParts, status: 'Completed' });
            return;
          }
          await closeWorkOrder(workOrder.id);
        }}
        onConsumePart={consumePart}
        onEdit={() => workOrder && navigateTo(`${basePath}/${workOrder.id}/edit`)}
        onIssuePart={issuePart}
        alerts={alerts}
        inventoryTransactions={inventoryTransactions}
        navigateTo={navigateTo}
        onReturnPart={returnPart}
        partsInventory={partsInventory}
        vehicles={vehicles}
        workOrder={workOrder}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        actions={(
          <FleetAccessGate permission={ACTION_PERMISSIONS.createWorkOrder}>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigateTo(`${basePath}/create`)} variant="accent">Create Work Order</Button>
          </FleetAccessGate>
        )}
        subtitle="Track workshop throughput, technician assignments, approvals, spare usage, and repair costs."
        title={route.section === 'garage-mgmt' ? 'Garage Management' : 'Maintenance Work Orders'}
      />
      {error && <ErrorState message={error} title="Showing cached or demo maintenance data" />}

      <MaintenanceWorkOrderHub
        onOrderSelect={(selected) => navigateTo(`${basePath}/${selected.id}`)}
        onStatusChange={updateWorkOrderStatus}
        workOrders={filteredWorkOrders}
      />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <FilterBar
            onSearchChange={setSearchValue}
            placeholder="Search work orders"
            searchValue={searchValue}
          />
        </div>
        <DataTable
          columns={columns}
          emptyMessage="No work orders match the selected search."
          getRowKey={(item) => item.id}
          onRowClick={(selected) => navigateTo(`${basePath}/${selected.id}`)}
          rows={filteredWorkOrders}
        />
      </section>
    </div>
  );
}

const columns: Array<DataTableColumn<MaintenanceWorkOrder>> = [
  {
    header: 'Work Order',
    key: 'title',
    render: (row) => (
      <div>
        <p className="font-bold text-text">{row.title}</p>
        <p className="text-xs font-semibold text-secondary">{row.vehicleRegistration}</p>
      </div>
    ),
  },
  { header: 'Technician', key: 'technician', render: (row) => row.technician },
  {
    header: 'Status',
    key: 'status',
    render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>,
  },
  {
    header: 'Approval',
    key: 'approval',
    render: (row) => <StatusBadge tone={row.approvalStatus === 'Approved' ? 'success' : row.approvalStatus === 'Not Required' ? 'neutral' : 'warning'}>{row.approvalStatus ?? 'Pending'}</StatusBadge>,
  },
  {
    align: 'right',
    header: 'Cost',
    key: 'cost',
    render: (row) => `Rs ${(row.estimatedCost ?? 0).toLocaleString()}`,
  },
];

function statusTone(status: MaintenanceWorkOrder['status']) {
  if (status === 'Completed') return 'success';
  if (status === 'Pending Inspection') return 'warning';
  if (status === 'In Progress') return 'primary';
  return 'neutral';
}
