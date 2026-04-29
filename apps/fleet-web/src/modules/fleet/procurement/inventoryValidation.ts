import { PartInventoryItem, PartStatus, PartStockStatus } from '../../../types';
import { getInventoryItemStockStatus } from './inventoryStock';

export interface InventoryFormValues {
  category: string;
  minimumStockLevel: string;
  partName: string;
  partNumber: string;
  partStatus: PartStatus;
  unit: string;
  unitCost: string;
  vendorName: string;
}

export type InventoryFormErrors = Partial<Record<keyof InventoryFormValues, string>>;

export function valuesFromInventoryItem(item?: PartInventoryItem): InventoryFormValues {
  return {
    category: item?.category ?? '',
    minimumStockLevel: (item?.minimumStockLevel ?? item?.reorderPoint ?? 0).toString(),
    partName: item?.partName ?? '',
    partNumber: item?.partNumber ?? '',
    partStatus: item?.partStatus ?? 'Active',
    unit: item?.unit ?? 'unit',
    unitCost: item?.unitCost?.toString() ?? '0',
    vendorName: item?.vendorName ?? '',
  };
}

export function validateInventoryItem(values: InventoryFormValues): InventoryFormErrors {
  const errors: InventoryFormErrors = {};
  if (!values.partName.trim()) errors.partName = 'Part name is required.';
  if (!values.partNumber.trim()) errors.partNumber = 'Part number is required.';
  if (!values.unit.trim()) errors.unit = 'Unit is required.';
  if (Number(values.minimumStockLevel) < 0) errors.minimumStockLevel = 'Minimum stock cannot be negative.';
  if (Number(values.unitCost) < 0) errors.unitCost = 'Unit cost cannot be negative.';
  return errors;
}

export function toInventoryItem(values: InventoryFormValues, existing?: PartInventoryItem): PartInventoryItem {
  const id = existing?.id ?? `part-${Date.now()}`;
  const stockOnHand = existing?.stockOnHand ?? 0;
  const minimumStockLevel = Number(values.minimumStockLevel || 0);
  const status = getInventoryItemStockStatus({
    ...(existing ?? {
      id: `part-${Date.now()}`,
      partName: values.partName.trim(),
      partNumber: values.partNumber.trim(),
      reorderPoint: minimumStockLevel,
      status: 'Out of Stock',
      stockOnHand,
    }),
    minimumStockLevel,
    partStatus: values.partStatus,
    reorderPoint: minimumStockLevel,
    stockOnHand,
  }, stockOnHand);

  return {
    id,
    category: values.category.trim() || undefined,
    currentStock: existing?.currentStock ?? stockOnHand,
    linkedWorkOrderId: existing?.linkedWorkOrderId,
    minimumStockLevel,
    partName: values.partName.trim(),
    partNumber: values.partNumber.trim(),
    partStatus: values.partStatus,
    partId: existing?.partId ?? id,
    reorderPoint: minimumStockLevel,
    status: status === 'Out of Stock' ? 'Out of Stock' : status === 'Low Stock' ? 'Low Stock' : existing?.status === 'PR Raised' ? 'PR Raised' : 'In Stock',
    stockOnHand,
    unit: values.unit.trim(),
    unitCost: Number(values.unitCost || 0),
    urgency: existing?.urgency,
    vendorId: existing?.vendorId,
    vendorName: values.vendorName.trim() || undefined,
  };
}

export function inventoryStatusTone(status: PartStockStatus) {
  if (status === 'In Stock') return 'success';
  if (status === 'Low Stock' || status === 'PR Raised') return 'warning';
  return 'danger';
}
