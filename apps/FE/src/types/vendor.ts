export interface TenantVendor {
  id: string;
  tenantId: string;
  name: string;
  legalName?: string;
  code?: string;
  gstin?: string;
  gstNumber?: string;
  pan?: string;
  address?: string;
  vendorType?: string;
  contactPerson?: string;
  phone?: string;
  contactNumber?: string;
  email?: string;
  serviceableLocations?: string[];
  supportedVehicleTypes?: string[];
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export type VendorRateType = "PER_MT" | "PER_TRIP";

export interface TenantVendorRateCard {
  id: string;
  tenantId: string;
  tenantVendorId: string;
  sourcePincode: string;
  destinationPincode: string;
  rateType: VendorRateType;
  vehicleType: string | null;
  rate: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface TenantVendorInput {
  name: string;
  legalName?: string;
  code?: string;
  gstin?: string;
  gstNumber?: string;
  pan?: string;
  address?: string;
  vendorType?: string;
  contactPerson?: string;
  phone?: string;
  contactNumber?: string;
  email?: string;
  serviceableLocations?: string[];
  supportedVehicleTypes?: string[];
  status: "active" | "inactive";
}

export interface TenantVendorRateCardInput {
  sourcePincode: string;
  destinationPincode: string;
  rateType: VendorRateType;
  vehicleType: string | null;
  rate: number;
  status: "active" | "inactive";
}

export interface VendorRateCardImportRow {
  sourcePincode: string;
  destinationPincode: string;
  rateType: string;
  vehicleType: string;
  rate: string;
}

export interface VendorRateCardImportResult {
  validRows: TenantVendorRateCardInput[];
  invalidRows: Array<{
    rowNumber: number;
    row: VendorRateCardImportRow;
    errors: string[];
  }>;
}
