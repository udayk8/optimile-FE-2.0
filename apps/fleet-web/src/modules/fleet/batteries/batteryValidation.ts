import { BatteryAsset, BatteryStatus, Vehicle } from '../../../types';

export type BatteryFormValues = Record<
  'brand' | 'capacityAh' | 'healthPercent' | 'lastInspectionDate' | 'position' | 'purchaseDate' | 'replacementDueDate' | 'serialNo' | 'vehicleId' | 'voltage' | 'warrantyExpiryDate',
  string
> & {
  chemistry: BatteryAsset['chemistry'];
  status: BatteryStatus;
};

export type BatteryFormErrors = Partial<Record<keyof BatteryFormValues, string>>;

const today = new Date().toISOString().slice(0, 10);

export function valuesFromBattery(battery?: BatteryAsset): BatteryFormValues {
  return {
    brand: battery?.brand ?? '',
    capacityAh: battery?.capacityAh.toString() ?? '150',
    chemistry: battery?.chemistry ?? 'Lead Acid',
    healthPercent: battery?.healthPercent.toString() ?? '90',
    lastInspectionDate: battery?.lastInspectionDate ?? today,
    position: battery?.position ?? '',
    purchaseDate: battery?.purchaseDate ?? today,
    replacementDueDate: battery?.replacementDueDate ?? today,
    serialNo: battery?.serialNo ?? '',
    status: battery?.status ?? 'Healthy',
    vehicleId: battery?.vehicleId ?? '',
    voltage: battery?.voltage.toString() ?? '24',
    warrantyExpiryDate: battery?.warrantyExpiryDate ?? today,
  };
}

export function validateBattery(values: BatteryFormValues): BatteryFormErrors {
  const errors: BatteryFormErrors = {};
  const health = Number(values.healthPercent);
  if (!values.serialNo.trim()) errors.serialNo = 'Serial number is required.';
  if (!values.brand.trim()) errors.brand = 'Brand is required.';
  if (Number(values.capacityAh) <= 0) errors.capacityAh = 'Capacity must be greater than zero.';
  if (Number(values.voltage) <= 0) errors.voltage = 'Voltage must be greater than zero.';
  if (Number.isNaN(health) || health < 0 || health > 100) errors.healthPercent = 'Health must be between 0 and 100.';
  if (!values.purchaseDate) errors.purchaseDate = 'Purchase date is required.';
  if (!values.warrantyExpiryDate) errors.warrantyExpiryDate = 'Warranty expiry is required.';
  if (!values.lastInspectionDate) errors.lastInspectionDate = 'Last inspection date is required.';
  if (!values.replacementDueDate) errors.replacementDueDate = 'Replacement due date is required.';
  return errors;
}

export function toBattery(values: BatteryFormValues, vehicles: Vehicle[], existing?: BatteryAsset): BatteryAsset {
  const vehicle = vehicles.find((item) => item.id === values.vehicleId);
  const inspection = {
    id: `bti-${Date.now()}`,
    healthPercent: Number(values.healthPercent || 0),
    inspectedAt: values.lastInspectionDate,
    inspector: 'Fleet Workshop',
    notes: 'Captured from battery asset form.',
    voltage: Number(values.voltage || 0),
  };

  return {
    id: existing?.id ?? `bat-${Date.now()}`,
    brand: values.brand.trim(),
    capacityAh: Number(values.capacityAh || 0),
    chemistry: values.chemistry,
    healthPercent: Number(values.healthPercent || 0),
    inspections: existing ? existing.inspections : [inspection],
    lastInspectionDate: values.lastInspectionDate,
    position: values.position.trim() || undefined,
    purchaseDate: values.purchaseDate,
    replacementDueDate: values.replacementDueDate,
    replacements: existing?.replacements ?? [],
    serialNo: values.serialNo.trim(),
    status: values.status,
    vehicleId: vehicle?.id,
    vehicleRegistration: vehicle?.registrationNo,
    voltage: Number(values.voltage || 0),
    warrantyExpiryDate: values.warrantyExpiryDate,
  };
}

export function batteryStatusTone(status: BatteryStatus) {
  if (status === 'Healthy') return 'success';
  if (status === 'Weak' || status === 'Needs Charge') return 'warning';
  if (status === 'Replace') return 'danger';
  return 'neutral';
}
