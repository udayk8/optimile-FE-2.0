import { TyreHealth, TyreInspection, TyreInventoryItem, TyreInventoryStatus, TyreJobCard, Vehicle } from '../../../types';

export type TyreFormValues = Record<'brand' | 'kmRun' | 'position' | 'pressurePsi' | 'purchaseDate' | 'retreadCount' | 'serialNo' | 'size' | 'treadMm' | 'vehicleId', string> & {
  health: TyreHealth;
  status: TyreInventoryStatus;
};

export type FormErrors<T> = Partial<Record<keyof T, string>>;

const today = new Date().toISOString().slice(0, 10);

export function tyreValuesFromItem(item?: TyreInventoryItem): TyreFormValues {
  return {
    brand: item?.brand ?? '',
    health: item?.health ?? 'Good',
    kmRun: item?.kmRun.toString() ?? '0',
    position: item?.position ?? '',
    pressurePsi: item?.pressurePsi.toString() ?? '100',
    purchaseDate: item?.purchaseDate ?? today,
    retreadCount: item?.retreadCount.toString() ?? '0',
    serialNo: item?.serialNo ?? '',
    size: item?.size ?? '',
    status: item?.status ?? 'Spare',
    treadMm: item?.treadMm.toString() ?? '12',
    vehicleId: item?.vehicleId ?? '',
  };
}

export function validateTyre(values: TyreFormValues): FormErrors<TyreFormValues> {
  const errors: FormErrors<TyreFormValues> = {};
  if (!values.serialNo.trim()) errors.serialNo = 'Serial number is required.';
  if (!values.brand.trim()) errors.brand = 'Brand is required.';
  if (!values.size.trim()) errors.size = 'Size is required.';
  if (!values.purchaseDate) errors.purchaseDate = 'Purchase date is required.';
  if (Number(values.kmRun) < 0) errors.kmRun = 'KM run cannot be negative.';
  if (Number(values.treadMm) < 0) errors.treadMm = 'Tread must be zero or higher.';
  if (Number(values.pressurePsi) < 0) errors.pressurePsi = 'Pressure must be zero or higher.';
  if (Number(values.retreadCount) < 0) errors.retreadCount = 'Retread count cannot be negative.';
  return errors;
}

export function toTyre(values: TyreFormValues, vehicles: Vehicle[], existing?: TyreInventoryItem): TyreInventoryItem {
  const vehicle = vehicles.find((item) => item.id === values.vehicleId);
  return {
    id: existing?.id ?? `tyre-${Date.now()}`,
    brand: values.brand.trim(),
    health: values.health,
    kmRun: Number(values.kmRun || 0),
    position: values.position.trim() || undefined,
    pressurePsi: Number(values.pressurePsi || 0),
    purchaseDate: values.purchaseDate,
    retreadCount: Number(values.retreadCount || 0),
    serialNo: values.serialNo.trim(),
    size: values.size.trim(),
    status: values.status,
    treadMm: Number(values.treadMm || 0),
    vehicleId: vehicle?.id,
    vehicleRegistration: vehicle?.registrationNo,
  };
}

export interface InspectionFormValues {
  inspectionDate: string;
  inspector: string;
  notes: string;
  pressurePsi: string;
  status: TyreInspection['status'];
  treadMm: string;
  tyreId: string;
}

export function validateInspection(values: InspectionFormValues): FormErrors<InspectionFormValues> {
  const errors: FormErrors<InspectionFormValues> = {};
  if (!values.tyreId) errors.tyreId = 'Tyre is required.';
  if (!values.inspector.trim()) errors.inspector = 'Inspector is required.';
  if (!values.inspectionDate) errors.inspectionDate = 'Inspection date is required.';
  if (Number(values.pressurePsi) < 0) errors.pressurePsi = 'Pressure must be zero or higher.';
  if (Number(values.treadMm) < 0) errors.treadMm = 'Tread must be zero or higher.';
  return errors;
}

export function toInspection(values: InspectionFormValues, tyres: TyreInventoryItem[]): TyreInspection {
  const tyre = tyres.find((item) => item.id === values.tyreId);
  return {
    id: `tin-${Date.now()}`,
    inspectionDate: values.inspectionDate,
    inspector: values.inspector.trim(),
    notes: values.notes.trim(),
    pressurePsi: Number(values.pressurePsi || 0),
    status: values.status,
    treadMm: Number(values.treadMm || 0),
    tyreId: values.tyreId,
    tyreSerialNo: tyre?.serialNo ?? 'Unknown',
    vehicleRegistration: tyre?.vehicleRegistration,
  };
}

export interface JobCardFormValues {
  action: TyreJobCard['action'];
  assignedTo: string;
  dueDate: string;
  estimatedCost: string;
  status: TyreJobCard['status'];
  title: string;
  tyreId: string;
}

export function validateJobCard(values: JobCardFormValues): FormErrors<JobCardFormValues> {
  const errors: FormErrors<JobCardFormValues> = {};
  if (!values.tyreId) errors.tyreId = 'Tyre is required.';
  if (!values.title.trim()) errors.title = 'Title is required.';
  if (!values.assignedTo.trim()) errors.assignedTo = 'Assignee is required.';
  if (!values.dueDate) errors.dueDate = 'Due date is required.';
  if (Number(values.estimatedCost) < 0) errors.estimatedCost = 'Cost cannot be negative.';
  return errors;
}

export function toJobCard(values: JobCardFormValues, tyres: TyreInventoryItem[]): TyreJobCard {
  const tyre = tyres.find((item) => item.id === values.tyreId);
  return {
    id: `tjc-${Date.now()}`,
    action: values.action,
    assignedTo: values.assignedTo.trim(),
    dueDate: values.dueDate,
    estimatedCost: Number(values.estimatedCost || 0),
    status: values.status,
    title: values.title.trim(),
    tyreId: values.tyreId,
    tyreSerialNo: tyre?.serialNo ?? 'Unknown',
    vehicleRegistration: tyre?.vehicleRegistration,
  };
}

export function tyreStatusTone(status: TyreInventoryStatus) {
  if (status === 'Fitted') return 'success';
  if (status === 'Spare') return 'primary';
  if (status === 'Retread') return 'warning';
  return 'danger';
}
