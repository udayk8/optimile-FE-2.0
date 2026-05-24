export type CustomerSetupStatus =
  | "BASIC_COMPLETED"
  | "ADDRESS_PENDING"
  | "RATE_CARD_PENDING"
  | "FULLY_CONFIGURED";

export interface CustomerSetupProgress {
  basicDetailsCompleted?: boolean;
  contactsCompleted?: boolean;
  creditBillingCompleted?: boolean;
  contractsCompleted?: boolean;
  preferencesCompleted?: boolean;
}

export type CustomerAddressTag = "Billing" | "Warehouse" | "Consignor" | "Consignee";
export type CustomerOperationalAddressType = "PRIMARY" | "ADDITIONAL" | "EMERGENCY";

export interface CustomerAddressMasterEntry {
  id: string;
  addressCode?: string;
  type: CustomerAddressTag[];
  consigneeId?: string;
  consigneeName?: string;
  operationalAddressType?: CustomerOperationalAddressType;
  addressUsage?: "ORIGIN" | "DESTINATION" | "BOTH";
  contactCode?: string;
  name: string;
  addressLabel?: string;
  fullAddress?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country?: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  gstin?: string;
  contactPerson?: string;
  contactNumber?: string;
  emailId?: string;
  isActive?: boolean;
  isTemporary?: boolean;
  remarks?: string;
}

export interface CustomerUOMOverride {
  id: string;
  quantityUOM: string;
  weightUOM: string;
  conversionValue: number;
  status?: "active" | "inactive";
}

export type CustomerRateMatchingBasis =
  | "LANE_TO_LANE"
  | "CITY_TO_CITY"
  | "PINCODE_TO_PINCODE"
  | "ADDRESS_TO_ADDRESS";

export interface TenantCustomer {
  id: string;
  tenantId: string;
  name: string;
  legalName?: string;
  tier?: string;
  code?: string;
  billingAddress?: string;
  relationshipManager?: string;
  internalAccountOwner?: string;
  gstin?: string;
  gstNumber?: string;
  pan?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  primaryContactDesignation?: string;
  accountsContactName?: string;
  accountsContactEmail?: string;
  accountsContactPhone?: string;
  accountsContactDesignation?: string;
  logisticsContactName?: string;
  logisticsContactEmail?: string;
  logisticsContactPhone?: string;
  logisticsContactDesignation?: string;
  creditLimit?: number | null;
  creditDays?: number | null;
  currentOutstanding?: number | null;
  gstChargeType?: string;
  tdsApplicable?: boolean;
  invoiceFormat?: string;
  preferredVehicleTypes?: string[];
  communicationChannel?: string;
  defaultPaymentMode?: string;
  allowAutoBooking?: boolean;
  rateMatchingBasis?: CustomerRateMatchingBasis;
  addresses?: CustomerAddressMasterEntry[];
  uomOverrides?: CustomerUOMOverride[];
  setupStatus?: CustomerSetupStatus;
  setupProgress?: CustomerSetupProgress;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface TenantCustomerAddress {
  id: string;
  tenantId: string;
  tenantCustomerId: string;
  customerId?: string;
  addressCode?: string;
  addressType: "consignor" | "consignee" | "both";
  addressTypes?: CustomerAddressTag[];
  consigneeId?: string;
  consigneeName?: string;
  operationalAddressType?: CustomerOperationalAddressType;
  addressUsage?: "ORIGIN" | "DESTINATION" | "BOTH";
  addressName: string;
  addressLabel?: string;
  fullAddress?: string;
  contactCode?: string;
  gstin?: string;
  contactPersonName?: string;
  contactPerson?: string;
  phone?: string;
  contactNumber?: string;
  email?: string;
  emailId?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  status: "active" | "inactive";
  isTemporary?: boolean;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export type CustomerRateType = "PER_KM" | "FIXED" | "PER_TON" | "PER_MT" | "PER_TRIP";

export interface TenantCustomerRateCard {
  id: string;
  tenantId: string;
  tenantCustomerId: string;
  lanes?: string;
  fromCity?: string;
  toCity?: string;
  fromLocation?: string;
  toLocation?: string;
  sourcePincode: string;
  destinationPincode: string;
  rateType: CustomerRateType;
  vehicleType: string | null;
  underloadRate?: number;
  overloadRate?: number | null;
  tat?: string;
  baseRate?: number;
  rate: number;
  minLoad?: number | null;
  maxLoad?: number | null;
  transitTime?: string;
  effectiveFromDate?: string;
  effectiveToDate?: string;
  remarks?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface TenantCustomerInput {
  name: string;
  legalName?: string;
  tier?: string;
  code?: string;
  billingAddress?: string;
  relationshipManager?: string;
  internalAccountOwner?: string;
  gstin?: string;
  gstNumber?: string;
  pan?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  primaryContactDesignation?: string;
  accountsContactName?: string;
  accountsContactEmail?: string;
  accountsContactPhone?: string;
  accountsContactDesignation?: string;
  logisticsContactName?: string;
  logisticsContactEmail?: string;
  logisticsContactPhone?: string;
  logisticsContactDesignation?: string;
  creditLimit?: number | null;
  creditDays?: number | null;
  currentOutstanding?: number | null;
  gstChargeType?: string;
  tdsApplicable?: boolean;
  invoiceFormat?: string;
  preferredVehicleTypes?: string[];
  communicationChannel?: string;
  defaultPaymentMode?: string;
  allowAutoBooking?: boolean;
  rateMatchingBasis?: CustomerRateMatchingBasis;
  addresses?: CustomerAddressMasterEntry[];
  uomOverrides?: CustomerUOMOverride[];
  setupStatus?: CustomerSetupStatus;
  setupProgress?: CustomerSetupProgress;
  status: "active" | "inactive";
}

export interface TenantCustomerAddressInput {
  customerId?: string;
  addressCode?: string;
  addressType: TenantCustomerAddress["addressType"];
  addressTypes?: CustomerAddressTag[];
  consigneeId?: string;
  consigneeName?: string;
  operationalAddressType?: CustomerOperationalAddressType;
  addressUsage?: "ORIGIN" | "DESTINATION" | "BOTH";
  addressName: string;
  addressLabel?: string;
  fullAddress?: string;
  contactCode?: string;
  gstin?: string;
  contactPersonName?: string;
  contactPerson?: string;
  phone?: string;
  contactNumber?: string;
  email?: string;
  emailId?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  status: "active" | "inactive";
  isTemporary?: boolean;
  remarks?: string;
}

export interface TenantCustomerRateCardInput {
  lanes?: string;
  fromCity?: string;
  toCity?: string;
  fromLocation?: string;
  toLocation?: string;
  sourcePincode: string;
  destinationPincode: string;
  rateType: CustomerRateType;
  vehicleType: string | null;
  underloadRate?: number;
  overloadRate?: number | null;
  tat?: string;
  baseRate?: number;
  rate: number;
  minLoad?: number | null;
  maxLoad?: number | null;
  transitTime?: string;
  effectiveFromDate?: string;
  effectiveToDate?: string;
  remarks?: string;
  status: "active" | "inactive";
}

export interface RateCardImportRow {
  lane: string;
  fromCity: string;
  toCity: string;
  fromLocation: string;
  toLocation: string;
  fromPincode: string;
  toPincode: string;
  vehicleType: string;
  rateType: string;
  underloadRate: string;
  overloadRate: string;
  tat: string;
  effectiveFromDate: string;
  effectiveToDate: string;
  remarks: string;
}

export interface RateCardImportResult {
  validRows: TenantCustomerRateCardInput[];
  invalidRows: Array<{
    rowNumber: number;
    row: RateCardImportRow;
    errors: string[];
  }>;
}

export interface AddressImportRow {
  addressType: string;
  addressName: string;
  contactCode: string;
  contactPersonName: string;
  phone: string;
  emailId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstin: string;
}

export interface AddressImportResult {
  validRows: Array<Omit<CustomerAddressMasterEntry, "addressCode">>;
  invalidRows: Array<{
    rowNumber: number;
    row: AddressImportRow;
    errors: string[];
  }>;
}
