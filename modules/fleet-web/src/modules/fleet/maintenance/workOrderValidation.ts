import { InventoryTransaction, MaintenanceWorkOrder, PartInventoryItem, Vehicle, WorkOrderPartUsage, WorkOrderStatus } from '../../../types';
import { buildPartFromInventoryItem, canIssueStock, getPartId } from '../procurement/inventoryStock';

export interface WorkOrderFormValues {
  approvalRequired: NonNullable<MaintenanceWorkOrder['approvalRequired']> | '';
  dueDate: string;
  laborCost: string;
  odometerKm: string;
  partId: string;
  partName: string;
  partNumber: string;
  partQuantity: string;
  partUnitCost: string;
  priority: MaintenanceWorkOrder['priority'];
  status: WorkOrderStatus;
  taxAmount: string;
  technician: string;
  title: string;
  vehicleId: string;
}

export type WorkOrderFormErrors = Partial<Record<keyof WorkOrderFormValues, string>>;

const today = new Date().toISOString().slice(0, 10);

export function valuesFromWorkOrder(workOrder?: MaintenanceWorkOrder): WorkOrderFormValues {
  const firstPart = workOrder?.partsUsed?.[0];

  return {
    approvalRequired: workOrder?.approvalRequired ?? 'Garage Manager',
    dueDate: workOrder?.dueDate ?? today,
    laborCost: workOrder?.laborCost?.toString() ?? '',
    odometerKm: workOrder?.odometerKm?.toString() ?? '',
    partId: firstPart?.partId ?? '',
    partName: firstPart?.partName ?? '',
    partNumber: firstPart?.partNumber ?? '',
    partQuantity: firstPart?.quantity.toString() ?? '',
    partUnitCost: firstPart?.unitCost.toString() ?? '',
    priority: workOrder?.priority ?? 'Medium',
    status: workOrder?.status ?? 'Open',
    taxAmount: workOrder?.taxAmount?.toString() ?? '',
    technician: workOrder?.technician ?? '',
    title: workOrder?.title ?? '',
    vehicleId: workOrder?.vehicleId ?? '',
  };
}

export function validateWorkOrder(values: WorkOrderFormValues, partsInventory: PartInventoryItem[] = [], inventoryTransactions: InventoryTransaction[] = []): WorkOrderFormErrors {
  const errors: WorkOrderFormErrors = {};
  const laborCost = Number(values.laborCost || 0);
  const taxAmount = Number(values.taxAmount || 0);
  const odometerKm = Number(values.odometerKm || 0);
  const partQuantity = Number(values.partQuantity || 0);
  const partUnitCost = Number(values.partUnitCost || 0);

  if (!values.vehicleId) errors.vehicleId = 'Vehicle is required.';
  if (!values.title.trim()) errors.title = 'Work order title is required.';
  if (!values.technician.trim()) errors.technician = 'Technician assignment is required.';
  if (!values.dueDate) errors.dueDate = 'Due date is required.';
  if (values.status !== 'Completed' && values.dueDate < today) errors.dueDate = 'Due date cannot be in the past for active work.';
  if (values.odometerKm && (Number.isNaN(odometerKm) || odometerKm < 0)) errors.odometerKm = 'Odometer must be zero or higher.';
  if (values.laborCost && (Number.isNaN(laborCost) || laborCost < 0)) errors.laborCost = 'Labor cost must be zero or higher.';
  if (values.taxAmount && (Number.isNaN(taxAmount) || taxAmount < 0)) errors.taxAmount = 'Tax amount must be zero or higher.';

  const selectedItem = partsInventory.find((part) => getPartId(part) === values.partId);
  const selectedPart = selectedItem ? buildPartFromInventoryItem(selectedItem, inventoryTransactions) : undefined;
  const anyPartField = Boolean(values.partId || values.partName || values.partNumber || values.partQuantity || values.partUnitCost);
  if (anyPartField) {
    if (!values.partId) errors.partId = 'Part is required when adding spare usage.';
    if (!selectedItem) errors.partId = 'Selected part could not be found.';
    if (selectedPart?.status === 'Inactive') errors.partId = 'Inactive parts cannot be requested.';
    if (!values.partQuantity || Number.isNaN(partQuantity) || partQuantity <= 0) errors.partQuantity = 'Quantity must be greater than zero.';
    if (selectedPart && partQuantity > 0) {
      const availability = canIssueStock({ currentStock: selectedPart.currentStock, quantity: partQuantity });
      if (!availability.allowed) errors.partQuantity = availability.reason ?? 'Requested quantity exceeds available stock.';
    }
    if (values.partUnitCost && (Number.isNaN(partUnitCost) || partUnitCost < 0)) errors.partUnitCost = 'Unit cost must be zero or higher.';
  }

  return errors;
}

export function toWorkOrder(values: WorkOrderFormValues, vehicles: Vehicle[], partsInventory: PartInventoryItem[] = [], existing?: MaintenanceWorkOrder): MaintenanceWorkOrder {
  const vehicle = vehicles.find((item) => item.id === values.vehicleId);
  const partsUsed = buildPartsUsed(values, partsInventory, existing);
  const partsTotal = partsUsed.reduce((total, part) => total + part.quantity * part.unitCost, 0);
  const laborCost = Number(values.laborCost || 0);
  const taxAmount = Number(values.taxAmount || 0);

  return {
    id: existing?.id ?? `wo-${Date.now()}`,
    vehicleId: values.vehicleId,
    vehicleRegistration: vehicle?.registrationNo ?? existing?.vehicleRegistration ?? 'Unassigned',
    title: values.title.trim(),
    priority: values.priority,
    status: values.status,
    dueDate: values.dueDate,
    technician: values.technician.trim(),
    approvalRequired: values.approvalRequired || undefined,
    approvalStatus: existing?.approvalStatus ?? (values.approvalRequired ? 'Pending' : 'Not Required'),
    approvedAt: existing?.approvedAt,
    approvedBy: existing?.approvedBy,
    closedAt: values.status === 'Completed' ? existing?.closedAt ?? new Date().toISOString().slice(0, 10) : undefined,
    estimatedCost: laborCost + partsTotal + taxAmount,
    laborCost,
    missingPartId: existing?.missingPartId,
    odometerKm: values.odometerKm ? Number(values.odometerKm) : undefined,
    partsUsed,
    taxAmount,
  };
}

function buildPartsUsed(values: WorkOrderFormValues, partsInventory: PartInventoryItem[], existing?: MaintenanceWorkOrder): WorkOrderPartUsage[] {
  if (!values.partId && !values.partQuantity) return [];
  const item = partsInventory.find((part) => getPartId(part) === values.partId);
  if (!item) return existing?.partsUsed ?? [];
  const existingPart = existing?.partsUsed?.find((part) => part.partId === values.partId || part.partNumber === item.partNumber);

  return [{
    id: existingPart?.id ?? `wop-${Date.now()}`,
    consumedQuantity: existingPart?.consumedQuantity,
    inventoryTransactionIds: existingPart?.inventoryTransactionIds,
    issuedQuantity: existingPart?.issuedQuantity,
    partId: getPartId(item),
    partName: item.partName,
    partNumber: item.partNumber,
    quantity: Number(values.partQuantity || 0),
    returnedQuantity: existingPart?.returnedQuantity,
    status: existingPart?.status ?? 'Requested',
    unitCost: item.unitCost ?? Number(values.partUnitCost || 0),
  }];
}
