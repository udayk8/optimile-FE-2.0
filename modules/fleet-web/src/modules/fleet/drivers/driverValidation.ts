import { AssignmentStatus, DocumentUploadEntry, DriverDocumentType, FleetDriver } from '../../../types';

export interface DriverFormValues {
  aadhaarMasked: string;
  assignmentStatus: AssignmentStatus;
  bankAccountMasked: string;
  baseLocation: string;
  behaviorScore: string;
  coachingStatus: FleetDriver['coachingStatus'];
  licenseClass: string;
  licenseExpiryDate: string;
  licenseNo: string;
  medicalExpiryDate: string;
  name: string;
  phone: string;
  driverDocs: Partial<Record<DriverDocumentType, DocumentUploadEntry>>;
}

export type DriverFormErrors = Partial<Record<keyof DriverFormValues, string>>;

export function valuesFromDriver(driver?: FleetDriver): DriverFormValues {
  return {
    aadhaarMasked: driver?.aadhaarMasked ?? '',
    assignmentStatus: driver?.assignmentStatus ?? 'Available',
    bankAccountMasked: driver?.bankAccountMasked ?? '',
    baseLocation: driver?.baseLocation ?? '',
    behaviorScore: driver?.behaviorScore.toString() ?? '75',
    coachingStatus: driver?.coachingStatus ?? 'None',
    licenseClass: driver?.licenseClass ?? '',
    licenseExpiryDate: driver?.licenseExpiryDate ?? '',
    licenseNo: driver?.licenseNo ?? '',
    medicalExpiryDate: driver?.medicalExpiryDate ?? '',
    name: driver?.name ?? '',
    phone: driver?.phone ?? '',
    driverDocs: {},
  };
}

export function validateDriver(values: DriverFormValues): DriverFormErrors {
  const errors: DriverFormErrors = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const score = Number(values.behaviorScore);

  if (!values.name.trim()) errors.name = 'Full name is required.';
  if (!values.phone.trim()) errors.phone = 'Mobile number is required.';
  if (values.phone && values.phone.replace(/\D/g, '').length < 10) errors.phone = 'Mobile number should include at least 10 digits.';
  if (!values.licenseNo.trim()) errors.licenseNo = 'License number is required.';
  if (!values.licenseClass.trim()) errors.licenseClass = 'License class is required.';
  if (!values.baseLocation.trim()) errors.baseLocation = 'Base location is required.';
  if (!values.licenseExpiryDate) errors.licenseExpiryDate = 'License expiry date is required.';
  if (!values.medicalExpiryDate) errors.medicalExpiryDate = 'Medical expiry date is required.';
  if (values.licenseExpiryDate && new Date(values.licenseExpiryDate) < today) errors.licenseExpiryDate = 'License expiry must be today or future.';
  if (values.medicalExpiryDate && new Date(values.medicalExpiryDate) < today) errors.medicalExpiryDate = 'Medical expiry must be today or future.';
  if (Number.isNaN(score) || score < 0 || score > 100) errors.behaviorScore = 'Behavior score must be between 0 and 100.';
  if (/\d{8,}/.test(values.aadhaarMasked.replace(/-/g, ''))) errors.aadhaarMasked = 'Aadhaar should be masked.';
  if (/\d{8,}/.test(values.bankAccountMasked.replace(/-/g, ''))) errors.bankAccountMasked = 'Bank account should be masked.';

  return errors;
}

export function toDriver(values: DriverFormValues, existing?: FleetDriver): FleetDriver {
  return {
    id: existing?.id ?? `drv-${Date.now()}`,
    aadhaarMasked: values.aadhaarMasked.trim() || 'XXXX-XXXX-0000',
    assignmentStatus: values.assignmentStatus,
    bankAccountMasked: values.bankAccountMasked.trim() || 'XXXXXX0000',
    baseLocation: values.baseLocation.trim(),
    behaviorScore: Number(values.behaviorScore),
    coachingStatus: values.coachingStatus,
    licenseClass: values.licenseClass.trim(),
    licenseExpiryDate: values.licenseExpiryDate,
    licenseNo: values.licenseNo.trim(),
    medicalExpiryDate: values.medicalExpiryDate,
    name: values.name.trim(),
    phone: values.phone.trim(),
  };
}
