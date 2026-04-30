import { Edit, PackagePlus, Send, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FleetAccessGate } from '@shared-auth';
import { useFleetAuth } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { Button } from '../../../components/Button';
import { DataTable, DataTableColumn } from '../../../components/DataTable';
import { DetailTabs } from '../../../components/DetailTabs';
import { EmptyState } from '../../../components/EmptyState';
import { InfoGrid, InfoItem } from '../../../components/InfoGrid';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { InventoryStockStatus, InventoryTransaction, MaintenanceWorkOrder, PartInventoryItem, PartStatus } from '../../../types';
import { getWorkOrdersByPart } from '../fleetRelationships';
import { buildPartFromInventoryItem, getInventoryStockStatus } from './inventoryStock';
import { StockTransactionModal } from './StockTransactionModal';

export function InventoryDetailPage({ inventoryTransactions, item, navigateTo, onAdjustStock, onBack, onEdit, onRaisePR, onStockInward, onTransactionModalClose, partsInventory, recordInventoryTransaction, transactionMode, workOrders }: { inventoryTransactions: InventoryTransaction[]; item?: PartInventoryItem; navigateTo: (path: string) => void; onAdjustStock: () => void; onBack: () => void; onEdit: () => void; onRaisePR: () => Promise<void>; onStockInward: () => void; onTransactionModalClose: () => void; partsInventory: PartInventoryItem[]; recordInventoryTransaction: (transaction: InventoryTransaction) => Promise<InventoryTransaction>; transactionMode: 'inward' | 'adjustment' | null; workOrders: MaintenanceWorkOrder[] }) {
  const [activeTab, setActiveTab] = useState('overview');
  const { can } = useFleetAuth();
  const part = useMemo(() => item ? buildPartFromInventoryItem(item, inventoryTransactions) : undefined, [inventoryTransactions, item]);
  const partTransactions = useMemo(() => {
    if (!part) return [];
    return inventoryTransactions.filter((transaction) => transaction.partId === part.partId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [inventoryTransactions, part]);
  const workOrderUsage = useMemo(() => {
    if (!part) return [];
    return getWorkOrdersByPart(workOrders, part.partId);
  }, [part, workOrders]);

  if (!item || !part) return <EmptyState description="The requested inventory item could not be found." title="Inventory item not found" />;

  const stockStatus = getInventoryStockStatus(part);
  const tabs = [
    { id: 'overview', label: 'Overview', content: <OverviewTab item={item} part={part} stockStatus={stockStatus} /> },
    ...(can(ACTION_PERMISSIONS.viewInventoryTransactions) ? [{ id: 'history', label: 'Stock History', content: <StockHistoryTab navigateTo={navigateTo} transactions={partTransactions} /> }] : []),
    { id: 'usage', label: 'Work Order Usage', content: <WorkOrderUsageTab navigateTo={navigateTo} part={part} workOrders={workOrderUsage} /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Breadcrumbs items={[{ label: 'Inventory', onClick: onBack }, { label: part.partName }]} />
      <PageHeader
        actions={(
          <>
            <Button onClick={onBack} variant="outline">Back</Button>
            <FleetAccessGate permission={ACTION_PERMISSIONS.stockInInventory}><Button icon={<PackagePlus className="h-4 w-4" />} onClick={onStockInward} variant="outline">Stock In</Button></FleetAccessGate>
            <FleetAccessGate permission={ACTION_PERMISSIONS.adjustInventory}><Button icon={<SlidersHorizontal className="h-4 w-4" />} onClick={onAdjustStock} variant="outline">Adjust</Button></FleetAccessGate>
            <FleetAccessGate permission={ACTION_PERMISSIONS.editInventoryItem}><Button icon={<Edit className="h-4 w-4" />} onClick={onEdit} variant="primary">Edit</Button></FleetAccessGate>
            <FleetAccessGate permission={ACTION_PERMISSIONS.raisePurchaseRequest}><Button disabled={item.status === 'PR Raised'} icon={<Send className="h-4 w-4" />} onClick={() => void onRaisePR()} variant="accent">Raise PR</Button></FleetAccessGate>
          </>
        )}
        subtitle={part.partNumber ?? part.partId}
        title={part.partName}
      />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text">Part Detail</h2>
            <p className="mt-1 text-sm text-gray-500">Stock is shown from transaction-backed movement data when transactions exist.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={stockStatusTone(stockStatus)}>{stockStatus}</StatusBadge>
            <StatusBadge tone={partStatusTone(part.status)}>{part.status}</StatusBadge>
          </div>
        </div>

        <div className="mt-5">
          <DetailTabs activeTab={activeTab} onChange={setActiveTab} tabs={tabs} />
        </div>
      </section>
      <StockTransactionModal
        inventoryTransactions={inventoryTransactions}
        key={`${transactionMode ?? 'closed'}-${part.partId}`}
        mode={transactionMode ?? 'inward'}
        onClose={onTransactionModalClose}
        onSubmit={recordInventoryTransaction}
        open={transactionMode !== null}
        partsInventory={partsInventory}
        selectedPartId={part.partId}
      />
    </div>
  );
}

function OverviewTab({ item, part, stockStatus }: { item: PartInventoryItem; part: ReturnType<typeof buildPartFromInventoryItem>; stockStatus: InventoryStockStatus }) {
  return (
    <InfoGrid columns="sm:grid-cols-2 xl:grid-cols-3">
      <InfoItem label="Category" value={part.category} />
      <InfoItem label="Unit" value={part.unit} />
      <InfoItem label="Current Stock" value={part.currentStock.toLocaleString()} />
      <InfoItem label="Minimum Stock" value={part.minimumStockLevel.toLocaleString()} />
      <InfoItem label="Stock Status" value={stockStatus} />
      <InfoItem label="Part Status" value={part.status} />
      <InfoItem label="Vendor" value={part.vendorName ?? 'Not mapped'} />
      <InfoItem label="Unit Cost" value={`Rs ${(part.unitCost ?? 0).toLocaleString()}`} />
      <InfoItem label="Linked Work Order" value={item.linkedWorkOrderId ?? 'None'} />
    </InfoGrid>
  );
}

function StockHistoryTab({ navigateTo, transactions }: { navigateTo: (path: string) => void; transactions: InventoryTransaction[] }) {
  if (transactions.length === 0) return <EmptyState description="No stock movement has been recorded for this part. Use Stock In or Adjustment to create the first audited movement." title="No stock history" />;

  return (
    <DataTable columns={transactionColumns(navigateTo)} getRowKey={(transaction) => transaction.transactionId} onRowClick={(transaction) => navigateTo(`/inventory-transactions/${transaction.transactionId}`)} pageSize={8} rows={transactions} />
  );
}

function WorkOrderUsageTab({ navigateTo, part, workOrders }: { navigateTo: (path: string) => void; part: ReturnType<typeof buildPartFromInventoryItem>; workOrders: MaintenanceWorkOrder[] }) {
  if (workOrders.length === 0) return <EmptyState action={<Button onClick={() => navigateTo('/maintenance/create')} variant="accent">Create Work Order</Button>} description="This part is not linked to any work orders yet. Usage appears after a work order requests, issues, or consumes it." title="No work order usage" />;

  return (
    <DataTable columns={workOrderColumns(part)} getRowKey={(workOrder) => workOrder.id} onRowClick={(workOrder) => navigateTo(`/maintenance/${workOrder.id}`)} pageSize={8} rows={workOrders} />
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function stockStatusTone(status: InventoryStockStatus) {
  if (status === 'In Stock') return 'success';
  if (status === 'Low Stock') return 'warning';
  if (status === 'Inactive') return 'neutral';
  return 'danger';
}

function partStatusTone(status: PartStatus) {
  return status === 'Active' ? 'success' : 'neutral';
}

function transactionTone(type: InventoryTransaction['type']) {
  if (type === 'INWARD' || type === 'RETURN' || type === 'REVERSAL') return 'success';
  if (type === 'ADJUSTMENT') return 'warning';
  return 'danger';
}

function transactionActionLabel(type: InventoryTransaction['type']) {
  if (type === 'INWARD') return 'Added';
  if (type === 'OUTWARD') return 'Used';
  if (type === 'ADJUSTMENT') return 'Adjusted';
  if (type === 'RETURN') return 'Returned';
  return 'Reversed';
}

function transactionColumns(navigateTo: (path: string) => void): Array<DataTableColumn<InventoryTransaction>> {
  return [
  { header: 'Date', key: 'date', render: (transaction) => formatDateTime(transaction.timestamp), sortable: true, sortValue: (transaction) => transaction.timestamp },
  { header: 'Action', key: 'type', render: (transaction) => <StatusBadge tone={transactionTone(transaction.type)}>{transactionActionLabel(transaction.type)}</StatusBadge>, sortable: true, sortValue: (transaction) => transaction.type },
  { header: 'Reference', key: 'reference', render: (transaction) => transaction.referenceType === 'Work Order' && transaction.referenceId ? <button className="font-bold text-primary" onClick={() => navigateTo(`/maintenance/${transaction.referenceId}`)} type="button">{transaction.referenceId}</button> : `${transaction.referenceType}${transaction.referenceId ? ` · ${transaction.referenceId}` : ''}`, sortable: true, sortValue: (transaction) => transaction.referenceId ?? transaction.referenceType },
  { header: 'Performed By', key: 'performedBy', render: (transaction) => transaction.performedBy, sortable: true, sortValue: (transaction) => transaction.performedBy },
  { align: 'right', header: 'Quantity', key: 'quantity', render: (transaction) => <span className="font-bold text-text">{transaction.quantity.toLocaleString()}</span>, sortable: true, sortValue: (transaction) => transaction.quantity },
  ];
}

function workOrderColumns(part: ReturnType<typeof buildPartFromInventoryItem>): Array<DataTableColumn<MaintenanceWorkOrder>> {
  return [
    { header: 'Work Order', key: 'workOrder', render: (workOrder) => <div><p className="font-bold text-text">{workOrder.title}</p><p className="text-xs text-gray-500">{workOrder.id} · {workOrder.vehicleRegistration}</p></div>, sortable: true, sortValue: (workOrder) => workOrder.title },
    { header: 'Status', key: 'status', render: (workOrder) => <StatusBadge tone={workOrder.status === 'Completed' ? 'success' : workOrder.status === 'In Progress' ? 'primary' : 'neutral'}>{workOrder.status}</StatusBadge>, sortable: true, sortValue: (workOrder) => workOrder.status },
    { header: 'Technician', key: 'technician', render: (workOrder) => workOrder.technician, sortable: true, sortValue: (workOrder) => workOrder.technician },
    {
      align: 'right',
      header: 'Quantity',
      key: 'quantity',
      render: (workOrder) => {
        const usage = workOrder.partsUsed?.find((partUsage) => partUsage.partId === part.partId || partUsage.partNumber === part.partNumber);
        return <span className="font-bold text-text">{(usage?.quantity ?? 0).toLocaleString()}</span>;
      },
      sortable: true,
      sortValue: (workOrder) => workOrder.partsUsed?.find((partUsage) => partUsage.partId === part.partId || partUsage.partNumber === part.partNumber)?.quantity ?? 0,
    },
  ];
}
