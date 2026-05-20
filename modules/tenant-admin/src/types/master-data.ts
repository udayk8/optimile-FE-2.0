export interface TenantVehicleType {
  id: string;
  tenantId: string;
  typeCode: string;
  capacity: string;
  dimensions: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface TenantVehicleTypeInput {
  typeCode: string;
  capacity: string;
  dimensions: string;
  status: "active" | "inactive";
}

export interface TenantMaterial {
  id: string;
  tenantId: string;
  materialCode: string;
  description: string;
  uom: string;
  quantityUOM?: string;
  defaultWeightUOM?: string;
  conversionValue?: number | null;
  mappedCustomerIds: string[];
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface TenantMaterialInput {
  materialCode: string;
  description: string;
  uom: string;
  quantityUOM?: string;
  defaultWeightUOM?: string;
  conversionValue?: number | null;
  mappedCustomerIds: string[];
  status: "active" | "inactive";
}

export type TenantUOMCategory = "QUANTITY" | "WEIGHT";

export interface TenantUOMDefinition {
  id: string;
  tenantId: string;
  category: TenantUOMCategory;
  code: string;
  label: string;
  isCustom?: boolean;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface TenantUOMDefinitionInput {
  category: TenantUOMCategory;
  code: string;
  label: string;
  isCustom?: boolean;
  status: "active" | "inactive";
}

export interface TenantUOMMapping {
  id: string;
  tenantId: string;
  quantityUOM: string;
  weightUOM: string;
  conversionValue: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface TenantUOMMappingInput {
  quantityUOM: string;
  weightUOM: string;
  conversionValue: number;
  status: "active" | "inactive";
}

export type LRType = "AUTO" | "MANUAL" | "PRE_GENERATED" | "VENDOR";
export type LRConfigScopeType = "TENANT" | "HIERARCHY" | "CUSTOMER";
export type LRAllocationStrategy = "FLAT" | "HIERARCHICAL";
export type LRYearFormat = "NONE" | "YY" | "YYYY";
export type LRPoolSource = "RANGE" | "LIST" | "CSV";
export type LRPoolOwnershipType = "TENANT" | "CUSTOMER" | "VENDOR";
export type LRAllocationFlowMode = "FLAT" | "HIERARCHY";
export type LRAllocationRequestFlow = "CHILD_TO_PARENT";
export type LRAllocationApprovalFlow = "PARENT_APPROVES";
export type LRConsumptionLevel = "TENANT" | "DISPATCH" | "OPS_MANAGER" | "CUSTOM";

export interface LRAllocationFlowLevel {
  levelId: string;
  canAllocateQuota: boolean;
  allocateToLevelIds: string[];
  canRequestQuota: boolean;
  canApproveRequests: boolean;
  canConsumeLR: boolean;
}

export interface LRAllocationFlowConfig {
  mode: LRAllocationFlowMode;
  requestFlow: LRAllocationRequestFlow;
  approvalFlow: LRAllocationApprovalFlow;
  consumptionLevel: LRConsumptionLevel;
  customConsumptionLevelId?: string | null;
  levels: LRAllocationFlowLevel[];
}

export interface TenantLRConfig {
  id: string;
  tenantId: string;
  scopeType?: LRConfigScopeType;
  scopeOrgUnitIds?: string[];
  poolOwnershipType?: LRPoolOwnershipType;
  customerId?: string | null;
  vendorId?: string | null;
  lrType: LRType;
  allocationStrategy?: LRAllocationStrategy;
  prefix: string;
  yearFormat?: LRYearFormat;
  zeroPaddingLength?: number;
  poolSource?: LRPoolSource;
  poolRangeStart?: string;
  poolRangeEnd?: string;
  poolEntries?: string;
  poolAvailableCount?: number;
  poolUsedCount?: number;
  locationOrgUnitId?: string;
  locationCounter?: number;
  allocationFlow?: LRAllocationFlowConfig;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface TenantLRConfigInput {
  scopeType: LRConfigScopeType;
  scopeOrgUnitIds: string[];
  poolOwnershipType?: LRPoolOwnershipType;
  customerId: string | null;
  vendorId?: string | null;
  lrType: LRType;
  allocationStrategy: LRAllocationStrategy;
  prefix: string;
  yearFormat: LRYearFormat;
  zeroPaddingLength: number;
  poolSource: LRPoolSource;
  poolRangeStart: string;
  poolRangeEnd: string;
  poolEntries: string;
  poolAvailableCount: number;
  poolUsedCount: number;
  locationOrgUnitId?: string;
  locationCounter?: number;
  allocationFlow?: LRAllocationFlowConfig;
  status: "active" | "inactive";
}
