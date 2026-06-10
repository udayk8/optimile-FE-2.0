export interface TenantVehicleType {
  id: string;
  tenantId: string;
  typeCode: string;
  typeName?: string;
  bodyType?: string;
  wheels?: string;
  capacityValue?: string;
  capacityUnit?: string;
  length?: string;
  width?: string;
  height?: string;
  dimensionUnit?: string;
  capacity: string;
  dimensions: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface TenantVehicleTypeInput {
  typeCode: string;
  typeName?: string;
  bodyType?: string;
  wheels?: string;
  capacityValue?: string;
  capacityUnit?: string;
  length?: string;
  width?: string;
  height?: string;
  dimensionUnit?: string;
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
export type LRConsumptionLevel = "TENANT" | "REGION" | "BRANCH" | "DISPATCH_UNIT" | "USER" | "CUSTOM";
export type LRCustomerAllocationScope = "ALL" | "SELECTED";
export type ManualLRNumberingPolicy = "STRICT_FORMAT" | "FLEXIBLE_PHYSICAL_BOOK";
export type ManualLRCustomerPolicy =
  | "NOT_CUSTOMER_SPECIFIC"
  | "OPTIONAL_CUSTOMER_TAGGING"
  | "STRICT_CUSTOMER_SPECIFIC_CONSUMPTION";
export type ManualLRDistributionStrategy = "CENTRALIZED" | "DISTRIBUTED" | "HYBRID";
export type ManualLRWorkflowMode = "DIRECT_USAGE" | "CONTROLLED_ALLOCATION" | "APPROVAL_BASED";
// Root behaviour when an approver (ultimately the Company Root) does not hold
// enough LR stock to fully satisfy a request. Used by the hierarchy request
// escalation flow. Defaults to AUTO_GENERATE when unset.
export type ManualLRInsufficientStockPolicy = "REJECT" | "ASK" | "AUTO_GENERATE";
export type ManualLRChildFormatMode =
  | "GLOBAL_PARENT_FORMAT"
  | "PARENT_PREFIX_CHILD_SUFFIX"
  | "FULL_CHILD_FORMAT";
export type ManualLRWorkflowAction =
  | "UPLOAD_LR"
  | "ALLOCATE_LR"
  | "REQUEST_LR"
  | "APPROVE_LR"
  | "TRANSFER_LR"
  | "CONSUME_LR"
  | "VOID_LR"
  | "VIEW_AUDIT";

export type ManualLRWorkflowPermissions = Record<ManualLRWorkflowAction, string[]>;

export interface ManualLRWorkflowPermissionScope {
  scopeLevelId?: string | null;
  scopeOrgUnitId?: string | null;
  managedLevelId?: string | null;
  permissions: Partial<ManualLRWorkflowPermissions>;
}

export interface ManualLRChildGovernanceRule {
  childLevelId: string;
  canConsumeParentLr: boolean;
  childCanRequestLr?: boolean;
  childCanConsumeLr?: boolean;
  canMaintainOwnSequence: boolean;
  canDefineChildFormat: boolean;
  parentCanGenerateLr?: boolean;
  parentCanAllocateLrToChild?: boolean;
  canAllocateChildLr?: boolean;
  canApproveChildRequests?: boolean;
  canConfigureChildWorkflow?: boolean;
  canDelegateChildGovernance?: boolean;
  inheritParentFormat: boolean;
  formatMode?: ManualLRChildFormatMode;
  allocationRequired: boolean;
  approvalRequired: boolean;
  canTransferLr: boolean;
}

export interface ManualLRPlaceFormatOverride {
  orgUnitId: string;
  prefix: string;
  yearFormat?: LRYearFormat;
  numberSeparator?: string;
  zeroPaddingLength?: number;
  numberingPolicy?: ManualLRNumberingPolicy;
}

export interface LRAllocationFlowLevel {
  levelId: string;
  canAllocateQuota: boolean;
  allocateToLevelIds: string[];
  canAllocateToCustomer?: boolean;
  customerScope?: LRCustomerAllocationScope;
  customerIds?: string[];
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
  numberSeparator?: string;
  yearFormat?: LRYearFormat;
  zeroPaddingLength?: number;
  customerOwnershipEnabled?: boolean;
  poolSource?: LRPoolSource;
  ownershipLevelId?: string | null;
  distributionStrategy?: ManualLRDistributionStrategy;
  workflowMode?: ManualLRWorkflowMode;
  insufficientStockPolicy?: ManualLRInsufficientStockPolicy;
  numberingPolicy?: ManualLRNumberingPolicy;
  customerLrPolicy?: ManualLRCustomerPolicy;
  allowCustomerFallback?: boolean;
  workflowPermissions?: Partial<ManualLRWorkflowPermissions>;
  workflowPermissionScopes?: ManualLRWorkflowPermissionScope[];
  childGovernanceRules?: ManualLRChildGovernanceRule[];
  placeFormatOverrides?: ManualLRPlaceFormatOverride[];
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
  numberSeparator: string;
  yearFormat: LRYearFormat;
  zeroPaddingLength: number;
  customerOwnershipEnabled: boolean;
  poolSource: LRPoolSource;
  ownershipLevelId?: string | null;
  distributionStrategy?: ManualLRDistributionStrategy;
  workflowMode?: ManualLRWorkflowMode;
  insufficientStockPolicy?: ManualLRInsufficientStockPolicy;
  numberingPolicy?: ManualLRNumberingPolicy;
  customerLrPolicy?: ManualLRCustomerPolicy;
  allowCustomerFallback?: boolean;
  workflowPermissions?: Partial<ManualLRWorkflowPermissions>;
  workflowPermissionScopes?: ManualLRWorkflowPermissionScope[];
  childGovernanceRules?: ManualLRChildGovernanceRule[];
  placeFormatOverrides?: ManualLRPlaceFormatOverride[];
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
