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
  bankName?: string;
  branch?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountType?: "SAVINGS" | "CURRENT";
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export type VendorRateType = "PER_MT" | "PER_TRIP" | "PER_KM";

export interface TenantVendorRateCard {
  id: string;
  tenantId: string;
  tenantVendorId: string;
  contractName?: string;
  contractCode?: string;
  effectiveFromDate?: string;
  effectiveToDate?: string;
  lanes?: string;
  fromCity?: string;
  toCity?: string;
  fromLocation?: string;
  toLocation?: string;
  sourcePincode: string;
  destinationPincode: string;
  rateType: VendorRateType;
  vehicleType: string | null;
  buyingRate?: number;
  underloadRate?: number;
  overloadRate?: number | null;
  tat?: string;
  rate: number;
  status: "active" | "inactive";
  remarks?: string;
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
  bankName?: string;
  branch?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountType?: "SAVINGS" | "CURRENT";
  status: "active" | "inactive";
}

export interface TenantVendorRateCardInput {
  contractName?: string;
  contractCode?: string;
  effectiveFromDate?: string;
  effectiveToDate?: string;
  lanes?: string;
  fromCity?: string;
  toCity?: string;
  fromLocation?: string;
  toLocation?: string;
  sourcePincode: string;
  destinationPincode: string;
  rateType: VendorRateType;
  vehicleType: string | null;
  buyingRate?: number;
  underloadRate?: number;
  overloadRate?: number | null;
  tat?: string;
  rate: number;
  status: "active" | "inactive";
  remarks?: string;
}

export interface VendorRateCardImportRow {
  contractName: string;
  contractCode: string;
  effectiveFromDate: string;
  effectiveToDate: string;
  lane: string;
  fromCity: string;
  toCity: string;
  fromLocation: string;
  toLocation: string;
  sourcePincode: string;
  destinationPincode: string;
  rateType: string;
  vehicleType: string;
  buyingRate: string;
  underloadRate: string;
  overloadRate: string;
  tat: string;
  rate: string;
  remarks: string;
}

export interface VendorRateCardImportResult {
  validRows: TenantVendorRateCardInput[];
  invalidRows: Array<{
    rowNumber: number;
    row: VendorRateCardImportRow;
    errors: string[];
  }>;
}
