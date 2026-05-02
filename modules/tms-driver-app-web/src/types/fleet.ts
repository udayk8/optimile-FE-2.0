export type VehicleOwnershipType = "OWN" | "VENDOR";
export type VehicleFuelType = "DIESEL" | "PETROL" | "CNG" | "LNG" | "ELECTRIC";
export type DrugTestStatus = "CLEAR" | "PENDING" | "FAILED";

export interface TenantVehicle {
  id: string;
  tenantId: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: string;
  vehicleTypeId: string;
  fuelType: VehicleFuelType;
  ownershipType: VehicleOwnershipType;
  vendorId?: string | null;
  chassisNo?: string;
  insurance: {
    number: string;
    expiry: string;
  };
  fitness: {
    number: string;
    expiry: string;
  };
  puc: {
    number: string;
    expiry: string;
  };
  permit: {
    type: string;
    expiry: string;
  };
  odometer: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantVehicleInput {
  registrationNumber: string;
  make: string;
  model: string;
  year: string;
  vehicleTypeId: string;
  fuelType: VehicleFuelType;
  ownershipType: VehicleOwnershipType;
  vendorId?: string | null;
  chassisNo?: string;
  insurance: {
    number: string;
    expiry: string;
  };
  fitness: {
    number: string;
    expiry: string;
  };
  puc: {
    number: string;
    expiry: string;
  };
  permit: {
    type: string;
    expiry: string;
  };
  odometer: string;
  isActive: boolean;
}

export interface TenantDriver {
  id: string;
  tenantId: string;
  name: string;
  dob: string;
  photoUrl?: string | null;
  phone: string;
  address: string;
  bloodGroup: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
  medicalExpiry: string;
  drugTestStatus: DrugTestStatus;
  endorsements: string[];
  assignedVehicleId?: string | null;
  vendorId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantDriverInput {
  name: string;
  dob: string;
  photoUrl?: string | null;
  phone: string;
  address: string;
  bloodGroup: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
  medicalExpiry: string;
  drugTestStatus: DrugTestStatus;
  endorsements: string[];
  assignedVehicleId?: string | null;
  vendorId?: string | null;
  isActive: boolean;
}
