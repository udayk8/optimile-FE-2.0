import { DocumentUploadEntry, DriverDocumentType, Vehicle, VehicleDocumentType, VehicleStatus } from '../../../types';

export interface VehicleFormValues {
  capacityKg: string;
  driverLicenseNo: string;
  driverName: string;
  driverPhone: string;
  engineNo: string;
  fuelType: string;
  location: string;
  make: string;
  model: string;
  odometerKm: string;
  registrationNo: string;
  status: VehicleStatus;
  utilization: string;
  vin: string;
  year: string;
  vehicleDocs: Partial<Record<VehicleDocumentType, DocumentUploadEntry>>;
  driverDocs: Partial<Record<DriverDocumentType, DocumentUploadEntry>>;
}

export type VehicleFormErrors = Partial<Record<keyof VehicleFormValues, string>>;

export function valuesFromVehicle(vehicle?: Vehicle): VehicleFormValues {
  return {
    capacityKg: vehicle?.specs.capacityKg.toString() ?? '',
    driverLicenseNo: vehicle?.driver?.licenseNo ?? '',
    driverName: vehicle?.driver?.name ?? '',
    driverPhone: vehicle?.driver?.phone ?? '',
    engineNo: vehicle?.specs.engineNo ?? '',
    fuelType: vehicle?.specs.fuelType ?? 'Diesel',
    location: vehicle?.location ?? '',
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    odometerKm: vehicle?.specs.odometerKm.toString() ?? '0',
    registrationNo: vehicle?.registrationNo ?? '',
    status: vehicle?.status ?? 'Active',
    utilization: vehicle?.utilization.toString() ?? '0',
    vin: vehicle?.specs.vin ?? '',
    year: vehicle?.year.toString() ?? new Date().getFullYear().toString(),
    vehicleDocs: {},
    driverDocs: {},
  };
}

export function validateVehicle(values: VehicleFormValues): VehicleFormErrors {
  const errors: VehicleFormErrors = {};
  const currentYear = new Date().getFullYear();
  const year = Number(values.year);
  const utilization = Number(values.utilization);
  const capacityKg = Number(values.capacityKg);
  const odometerKm = Number(values.odometerKm);

  if (!values.registrationNo.trim()) errors.registrationNo = 'Registration number is required.';
  if (!values.make.trim()) errors.make = 'Make is required.';
  if (!values.model.trim()) errors.model = 'Model is required.';
  if (!values.location.trim()) errors.location = 'Location is required.';
  if (!values.vin.trim()) errors.vin = 'VIN is required.';
  if (!values.engineNo.trim()) errors.engineNo = 'Engine number is required.';
  if (!values.fuelType.trim()) errors.fuelType = 'Fuel type is required.';
  if (!Number.isInteger(year) || year < 1990 || year > currentYear + 1) errors.year = `Year must be between 1990 and ${currentYear + 1}.`;
  if (Number.isNaN(utilization) || utilization < 0 || utilization > 100) errors.utilization = 'Utilization must be between 0 and 100.';
  if (Number.isNaN(capacityKg) || capacityKg <= 0) errors.capacityKg = 'Capacity must be greater than 0.';
  if (Number.isNaN(odometerKm) || odometerKm < 0) errors.odometerKm = 'Odometer must be 0 or greater.';

  const phoneDigits = values.driverPhone.replace(/\D/g, '');
  if (values.driverPhone && phoneDigits.length < 10) errors.driverPhone = 'Driver phone should include at least 10 digits.';

  return errors;
}

export function toVehicle(values: VehicleFormValues, existing?: Vehicle): Vehicle {
  const hasDriver = Boolean(values.driverName.trim() || values.driverPhone.trim() || values.driverLicenseNo.trim());

  return {
    id: existing?.id ?? `veh-${Date.now()}`,
    registrationNo: values.registrationNo.trim(),
    make: values.make.trim(),
    model: values.model.trim(),
    year: Number(values.year),
    status: values.status,
    location: values.location.trim(),
    utilization: Number(values.utilization),
    driver: hasDriver
      ? {
          id: existing?.driver?.id ?? `drv-${Date.now()}`,
          licenseNo: values.driverLicenseNo.trim(),
          name: values.driverName.trim() || 'Unassigned',
          phone: values.driverPhone.trim(),
        }
      : null,
    specs: {
      capacityKg: Number(values.capacityKg),
      engineNo: values.engineNo.trim(),
      fuelType: values.fuelType.trim(),
      odometerKm: Number(values.odometerKm),
      vin: values.vin.trim(),
    },
    documents: existing?.documents ?? [],
    tyres: existing?.tyres ?? [],
  };
}
