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
  | "CITY_TO_CITY"
  | "PINCODE_TO_PINCODE"
  | "ADDRESS_TO_ADDRESS"
  | "HYBRID";

/**
 * Configurable rate-matching dimensions. A customer's contract is matched on
 * any combination of these (origin→destination is City, Location, or Pincode
 * pairs — there is no Lane concept). Pair dimensions are single keys that
 * contribute two columns each, so "from" can never exist without its "to".
 * See shared/lib/rate-matching-config.ts for the engine.
 */
export type RateMatchingFieldKey =
  | "CITY_PAIR"
  | "LOCATION_PAIR"
  | "PINCODE_PAIR"
  | "VEHICLE_TYPE"
  | "MATERIAL"
  | "SERVICE_TYPE"
  | "WEIGHT_SLAB"
  | "QUANTITY_SLAB"
  | "CUSTOMER_GROUP"
  | "UOM";

export type RateMatchingConfig = RateMatchingFieldKey[];

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
  /** Legacy single-mode basis. Retained for back-compat; derived into
   *  {@link rateMatchingConfig} when the new config is absent. */
  rateMatchingBasis?: CustomerRateMatchingBasis;
  /** RATE CARD STRUCTURE — which dimension columns this customer's rate card has
   *  (drives the grid, add-rate form, template and upload validation). */
  rateMatchingConfig?: RateMatchingConfig;
  /** RATE CALCULATION STRATEGY — the subset of {@link rateMatchingConfig} that
   *  booking searches on to auto-calculate freight. Lives in Preferences and may
   *  only reference dimensions present in the structure. Empty ⇒ match on all. */
  rateCalculationStrategy?: RateMatchingConfig;
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
  fromCity?: string;
  toCity?: string;
  fromLocation?: string;
  toLocation?: string;
  sourcePincode: string;
  destinationPincode: string;
  rateType: CustomerRateType;
  vehicleType: string | null;
  /** Configurable matching dimensions (populated only when the customer's
   *  rate-matching config includes them). */
  material?: string;
  serviceType?: string;
  weightSlab?: string;
  quantitySlab?: string;
  customerGroup?: string;
  uom?: string;
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
  /** Legacy single-mode basis. Retained for back-compat; derived into
   *  {@link rateMatchingConfig} when the new config is absent. */
  rateMatchingBasis?: CustomerRateMatchingBasis;
  /** RATE CARD STRUCTURE — which dimension columns this customer's rate card has. */
  rateMatchingConfig?: RateMatchingConfig;
  /** RATE CALCULATION STRATEGY — subset of {@link rateMatchingConfig} booking
   *  searches on to auto-calculate freight (configured in Preferences). */
  rateCalculationStrategy?: RateMatchingConfig;
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
  fromCity?: string;
  toCity?: string;
  fromLocation?: string;
  toLocation?: string;
  sourcePincode: string;
  destinationPincode: string;
  rateType: CustomerRateType;
  vehicleType: string | null;
  /** Configurable matching dimensions (populated only when the customer's
   *  rate-matching config includes them). */
  material?: string;
  serviceType?: string;
  weightSlab?: string;
  quantitySlab?: string;
  customerGroup?: string;
  uom?: string;
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
  fromCity: string;
  toCity: string;
  fromLocation: string;
  toLocation: string;
  fromPincode: string;
  toPincode: string;
  vehicleType: string;
  material: string;
  serviceType: string;
  weightSlab: string;
  quantitySlab: string;
  customerGroup: string;
  uom: string;
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
