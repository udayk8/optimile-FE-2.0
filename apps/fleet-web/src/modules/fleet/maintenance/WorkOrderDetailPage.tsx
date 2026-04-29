import { CheckCircle2, Edit, LockKeyhole, PackageCheck, PackageOpen, RotateCcw, Wrench } from 'lucide-react';
import { useState } from 'react';
import { FleetAccessGate } from '@shared-auth';
import { ACTION_PERMISSIONS } from '@shared-auth/modulePermissions';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { Button } from '../../../components/Button';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { DataTable, DataTableColumn } from '../../../components/DataTable';
import { DetailTabs } from '../../../components/DetailTabs';
import { EmptyState } from '../../../components/EmptyState';
import { InfoGrid, InfoItem } from '../../../components/InfoGrid';
import { PageHeader } from '../../../components/PageHeader';
import { StatusBadge } from '../../../components/StatusBadge';
import { FleetAlert, InventoryTransaction, MaintenanceWorkOrder, PartInventoryItem, Vehicle, WorkOrderPartUsage } from '../../../types';
import { getAlertsByEntity, getTransactionsByWorkOrder } from '../fleetRelationships';

interface WorkOrderDetailPageProps {
  alerts: FleetAlert[];
  inventoryTransactions: InventoryTransaction[];
  navigateTo: (path: string) => void;
  onApprove: () => Promise<void>;
  onBack: () => void;
  onCloseWorkOrder: () => Promise<void>;
  onConsumePart: (part: WorkOrderPartUsage) => Promise<void>;
  onEdit: () => void;
  onIssuePart: (part: WorkOrderPartUsage) => Promise<void>;
  onReturnPart: (part: WorkOrderPartUsage) => Promise<void>;
  partsInventory: PartInventoryItem[];
  vehicles: Vehicle[];
  workOrder?: MaintenanceWorkOrder;
}

export function WorkOrderDetailPage({ alerts, inventoryTransactions, navigateTo, onApprove, onBack, onCloseWorkOrder, onConsumePart, onEdit, onIssuePart, onReturnPart, partsInventory, vehicles, workOrder }: WorkOrderDetailPageProps) {
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [partError, setPartError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('summary');

  if (!workOrder) {
    return <EmptyState description="The requested work order could not be found." title="Work order not found" />;
  }

  const cost = getCostSummary(workOrder);
  const vehicle = vehicles.find((item) => item.id === workOrder.vehicleId);
  const relatedAlerts = getAlertsByEntity(alerts, 'WorkOrder', workOrder.id);
  const linkedTransactions = getTransactionsByWorkOrder(inventoryTransactions, workOrder.id);
  const canApprove = workOrder.approvalStatus !== 'Approved' && workOrder.approvalStatus !== 'Not Required';
  const canClose = workOrder.status !== 'Completed';

  const approve = async () => {
    setBusy(true);
    await onApprove();
    setBusy(false);
    setApprovalOpen(false);
  };

  const close = async () => {
    setBusy(true);
    await onCloseWorkOrder();
    setBusy(false);
    setCloseOpen(false);
  };

  const issuePart = async (part: WorkOrderPartUsage) => {
    setBusy(true);
    setPartError(null);
    try {
      await onIssuePart(part);
    } catch (error) {
      setPartError(error instanceof Error ? error.message : 'Unable to issue part.');
    } finally {
      setBusy(false);
    }
  };

  const consumePart = async (part: WorkOrderPartUsage) => {
    setBusy(true);
    setPartError(null);
    try {
      await onConsumePart(part);
    } catch (error) {
      setPartError(error instanceof Error ? error.message : 'Unable to consume part.');
    } finally {
      setBusy(false);
    }
  };

  const returnPart = async (part: WorkOrderPartUsage) => {
    setBusy(true);
    setPartError(null);
    try {
      await onReturnPart(part);
    } catch (error) {
      setPartError(error instanceof Error ? error.message : 'Unable to return part.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Breadcrumbs items={[{ label: 'Maintenance', onClick: onBack }, { label: workOrder.title }]} />
      <PageHeader
        actions={(
          <>
            <Button onClick={onBack} variant="outline">Back</Button>
            <FleetAccessGate permission={ACTION_PERMISSIONS.updateWorkOrder}>
              <Button icon={<Edit className="h-4 w-4" />} onClick={onEdit} variant="primary">Edit</Button>
            </FleetAccessGate>
            {canApprove && (
              <FleetAccessGate permission={ACTION_PERMISSIONS.approveWorkOrder}>
                <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setApprovalOpen(true)} variant="outline">Approve</Button>
              </FleetAccessGate>
            )}
            {canClose && (
              <FleetAccessGate permission={ACTION_PERMISSIONS.closeWorkOrder}>
                <Button icon={<LockKeyhole className="h-4 w-4" />} onClick={() => setCloseOpen(true)} variant="accent">Close</Button>
              </FleetAccessGate>
            )}
          </>
        )}
        subtitle={`${workOrder.vehicleRegistration} · ${workOrder.technician}`}
        title={workOrder.title}
      />

      <DetailTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: 'summary',
            label: 'Summary',
            content: (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-text">Maintenance Status</h2>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={statusTone(workOrder.status)}>{workOrder.status}</StatusBadge>
                    <StatusBadge tone={priorityTone(workOrder.priority)}>{workOrder.priority}</StatusBadge>
                  </div>
                </div>
                <InfoGrid>
                  <InfoItem label="Vehicle" value={<button className="font-bold text-primary" disabled={!vehicle} onClick={() => vehicle && navigateTo(`/vehicle-management/${vehicle.id}`)} type="button">{workOrder.vehicleRegistration}</button>} />
                  <InfoItem label="Due Date" value={workOrder.dueDate} />
                  <InfoItem label="Odometer" value={workOrder.odometerKm ? `${workOrder.odometerKm.toLocaleString()} km` : 'Not captured'} />
                  <InfoItem label="Approval" value={workOrder.approvalStatus ?? 'Pending'} />
                  <InfoItem label="Closed At" value={workOrder.closedAt ?? 'Open'} />
                </InfoGrid>
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-text">{workOrder.technician}</p>
                      <p className="mt-1 text-sm text-gray-500">{workOrder.approvalRequired ? `${workOrder.approvalRequired} approval required` : 'No approval required'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: 'parts',
            label: 'Parts Used',
            content: (
              <div>
                {partError && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{partError}</div>}
                <DataTable columns={partColumns({ busy, consumePart, issuePart, navigateTo, partsInventory, returnPart })} emptyMessage="No parts are attached to this work order. Edit the work order to request parts before issuing inventory." getRowKey={(part) => part.id} rows={workOrder.partsUsed ?? []} />
              </div>
            ),
          },
          {
            id: 'cost',
            label: 'Cost',
            content: (
              <div className="max-w-xl space-y-4">
                <CostLine label="Parts" value={cost.parts} />
                <CostLine label="Labor" value={cost.labor} />
                <CostLine label="Tax / Misc" value={cost.tax} />
                <div className="border-t border-gray-200 pt-4">
                  <CostLine label="Estimated Total" strong value={cost.total} />
                </div>
              </div>
            ),
          },
          {
            id: 'timeline',
            label: 'Timeline',
            content: (
              <div className="space-y-5">
                <InfoGrid columns="sm:grid-cols-2 xl:grid-cols-3">
                  <InfoItem label="Approval" value={workOrder.approvedAt ?? 'Pending'} />
                  <InfoItem label="Approved By" value={workOrder.approvedBy ?? 'Pending'} />
                  <InfoItem label="Closed At" value={workOrder.closedAt ?? 'Open'} />
                </InfoGrid>
                {linkedTransactions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Linked Transactions</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {linkedTransactions.map((transaction) => (
                        <button className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-primary" key={transaction.transactionId} onClick={() => navigateTo(`/inventory-transactions/${transaction.transactionId}`)} type="button">
                          {transaction.transactionId}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {relatedAlerts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Related Alerts</h3>
                    <div className="mt-3 space-y-2">
                      {relatedAlerts.map((alert) => (
                        <button className="w-full rounded-xl border border-warning/20 bg-warning/5 p-3 text-left font-bold text-text" key={alert.id} onClick={() => navigateTo(`/exception-center/${alert.id}`)} type="button">
                          {alert.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      <ConfirmModal
        confirmLabel={busy ? 'Approving...' : 'Approve'}
        description={`Approve ${workOrder.title}? This will record approval and release the work order for execution.`}
        onClose={() => setApprovalOpen(false)}
        onConfirm={() => void approve()}
        open={approvalOpen}
        title="Approve work order"
      />
      <ConfirmModal
        confirmLabel={busy ? 'Closing...' : 'Close'}
        description={`Close ${workOrder.title}? This marks the maintenance work as completed.`}
        onClose={() => setCloseOpen(false)}
        onConfirm={() => void close()}
        open={closeOpen}
        title="Close work order"
      />
    </div>
  );
}

function CostLine({ label, strong = false, value }: { label: string; strong?: boolean; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-sm ${strong ? 'font-bold text-text' : 'font-semibold text-gray-600'}`}>{label}</span>
      <span className={`${strong ? 'text-xl' : 'text-sm'} font-extrabold text-text`}>Rs {value.toLocaleString()}</span>
    </div>
  );
}

function getCostSummary(workOrder: MaintenanceWorkOrder) {
  const parts = (workOrder.partsUsed ?? []).reduce((total, part) => total + part.quantity * part.unitCost, 0);
  const labor = workOrder.laborCost ?? 0;
  const tax = workOrder.taxAmount ?? 0;
  return { labor, parts, tax, total: workOrder.estimatedCost ?? labor + parts + tax };
}

function priorityTone(priority: MaintenanceWorkOrder['priority']) {
  if (priority === 'High') return 'danger';
  if (priority === 'Medium') return 'warning';
  return 'success';
}

function statusTone(status: MaintenanceWorkOrder['status']) {
  if (status === 'Completed') return 'success';
  if (status === 'Pending Inspection') return 'warning';
  if (status === 'In Progress') return 'primary';
  return 'neutral';
}

function partStateTone(status: WorkOrderPartUsage['status']) {
  if (status === 'Consumed') return 'success';
  if (status === 'Issued' || status === 'Reserved') return 'primary';
  if (status === 'Returned' || status === 'Reversed') return 'warning';
  return 'neutral';
}

function partColumns({ busy, consumePart, issuePart, navigateTo, partsInventory, returnPart }: { busy: boolean; consumePart: (part: WorkOrderPartUsage) => Promise<void>; issuePart: (part: WorkOrderPartUsage) => Promise<void>; navigateTo: (path: string) => void; partsInventory: PartInventoryItem[]; returnPart: (part: WorkOrderPartUsage) => Promise<void>; }): Array<DataTableColumn<WorkOrderPartUsage>> {
  return [
    {
      header: 'Part',
      key: 'part',
      render: (part) => {
        const inventoryItem = partsInventory.find((item) => item.partId === part.partId || item.id === part.partId || item.partNumber === part.partNumber);
        return <button className="text-left" disabled={!inventoryItem} onClick={() => inventoryItem && navigateTo(`/inventory/${inventoryItem.id}`)} type="button"><p className="font-bold text-primary">{part.partName}</p><p className="text-xs text-gray-500">{part.partNumber}</p></button>;
      },
      sortable: true,
      sortValue: (part) => part.partName,
    },
    { header: 'State', key: 'state', render: (part) => <StatusBadge tone={partStateTone(part.status)}>{part.status ?? 'Requested'}</StatusBadge>, sortable: true, sortValue: (part) => part.status ?? 'Requested' },
    { header: 'Qty', key: 'qty', render: (part) => part.quantity, sortable: true, sortValue: (part) => part.quantity },
    { header: 'Transactions', key: 'transactions', render: (part) => (part.inventoryTransactionIds ?? []).length === 0 ? <span className="text-xs font-semibold text-gray-500">None</span> : <div className="flex flex-wrap gap-1">{part.inventoryTransactionIds?.map((id) => <button className="text-xs font-bold text-primary" key={id} onClick={() => navigateTo(`/inventory-transactions/${id}`)} type="button">{id}</button>)}</div> },
    { align: 'right', header: 'Amount', key: 'amount', render: (part) => <span className="font-bold text-text">Rs {(part.quantity * part.unitCost).toLocaleString()}</span>, sortable: true, sortValue: (part) => part.quantity * part.unitCost },
    {
      align: 'right',
      header: 'Actions',
      key: 'actions',
      render: (part) => (
        <div className="flex justify-end gap-2">
          {(!part.status || part.status === 'Requested') && (
            <FleetAccessGate permission={ACTION_PERMISSIONS.issueInventory}>
              <Button className="h-9 px-3" disabled={busy} icon={<PackageOpen className="h-4 w-4" />} onClick={() => void issuePart(part)} variant="secondary">Issue</Button>
            </FleetAccessGate>
          )}
          {part.status === 'Issued' && (
            <FleetAccessGate permission={ACTION_PERMISSIONS.issueInventory}>
              <Button className="h-9 px-3" disabled={busy} icon={<PackageCheck className="h-4 w-4" />} onClick={() => void consumePart(part)} variant="accent">Consume</Button>
            </FleetAccessGate>
          )}
          {(part.status === 'Issued' || part.status === 'Consumed') && (
            <FleetAccessGate permission={ACTION_PERMISSIONS.adjustInventory}>
              <Button className="h-9 px-3" disabled={busy} icon={<RotateCcw className="h-4 w-4" />} onClick={() => void returnPart(part)} variant="secondary">Return</Button>
            </FleetAccessGate>
          )}
        </div>
      ),
    },
  ];
}
