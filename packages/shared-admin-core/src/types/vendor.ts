import type { RateMatchingConfig } from "@/types/customer";

export interface TenantVendor {
  id: string;
  tenantId: string;
  name: string;
  legalName?: string;
  code?: string;
  gstin?: string;
  gstNumber?: string;
  /** GST rate (%) applied to this vendor's invoices, e.g. 12 or 18. */
  gstRate?: number;
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
  /** Vendor contract rate-card STRUCTURE — which dimension columns this vendor's
   *  rate card has AND what booking matches on (same engine as customers; there
   *  is no separate strategy for vendors). See shared/lib/rate-matching-config.ts. */
  rateMatchingConfig?: RateMatchingConfig;
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
  /** Configurable matching dimensions (populated only when the vendor's
   *  rateMatchingConfig includes them) — same set as customer rate cards. */
  material?: string;
  serviceType?: string;
  weightSlab?: string;
  quantitySlab?: string;
  customerGroup?: string;
  uom?: string;
  buyingRate?: number;
  underloadRate?: number;
  overloadRate?: number | null;
  tat?: string;
  rate: number;
  status: "active" | "inactive";
  remarks?: string;
  /** Auction allocation metadata — set only for rows derived from auction-won
   *  LOT/BULK contracts so booking assignment can honor the L1/L2/L3 split. */
  allocationRank?: "L1" | "L2" | "L3";
  volumeAllocationPercent?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenantVendorInput {
  name: string;
  legalName?: string;
  code?: string;
  gstin?: string;
  gstNumber?: string;
  gstRate?: number;
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
  rateMatchingConfig?: RateMatchingConfig;
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
  material?: string;
  serviceType?: string;
  weightSlab?: string;
  quantitySlab?: string;
  customerGroup?: string;
  uom?: string;
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
