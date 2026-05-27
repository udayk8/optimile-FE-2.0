import type { TenantLrPoolRecord } from "@/modules/tms/booking/types";
import type { OrgUnit, RoleDefinition } from "@/types/access";
import type {
  ManualLRChildGovernanceRule,
  ManualLRChildFormatMode,
  ManualLRCustomerPolicy,
  ManualLRDistributionStrategy,
  ManualLRNumberingPolicy,
  ManualLRPlaceFormatOverride,
  ManualLRWorkflowPermissionScope,
  ManualLRWorkflowMode,
  ManualLRWorkflowAction,
  ManualLRWorkflowPermissions,
  TenantLRConfig,
} from "@/types/master-data";

export const manualLrWorkflowActions: ManualLRWorkflowAction[] = [
  "UPLOAD_LR",
  "ALLOCATE_LR",
  "REQUEST_LR",
  "APPROVE_LR",
  "TRANSFER_LR",
  "CONSUME_LR",
  "VOID_LR",
  "VIEW_AUDIT",
];

export const manualLrWorkflowLabels: Record<ManualLRWorkflowAction, string> = {
  UPLOAD_LR: "Upload LR",
  ALLOCATE_LR: "Allocate LR",
  REQUEST_LR: "Request LR",
  APPROVE_LR: "Approve LR",
  TRANSFER_LR: "Transfer LR",
  CONSUME_LR: "Consume LR",
  VOID_LR: "Void / Lost / Damaged",
  VIEW_AUDIT: "View Audit",
};

export const manualLrDistributionStrategyLabels: Record<ManualLRDistributionStrategy, string> = {
  CENTRALIZED: "Centralized",
  DISTRIBUTED: "Distributed",
  HYBRID: "Hybrid",
};

export const manualLrWorkflowModeLabels: Record<ManualLRWorkflowMode, string> = {
  DIRECT_USAGE: "Direct Usage",
  CONTROLLED_ALLOCATION: "Controlled Allocation",
  APPROVAL_BASED: "Approval Based",
};

export const manualLrTabDefinitions = [
  { key: "dashboard", label: "Manual LR Dashboard", pageCode: "LR_DASHBOARD", action: null },
  { key: "inventory", label: "LR Inventory / Number List", pageCode: "LR_NUMBER_LIST", action: null },
  { key: "reserved", label: "Pre-generated LR / Customer LR", pageCode: "LR_NUMBER_LIST", action: "UPLOAD_LR" },
  { key: "upload", label: "Upload / Create LR", pageCode: "CREATE_UPLOAD_LR", action: "UPLOAD_LR" },
  { key: "allocation", label: "Allocation", pageCode: "LR_ALLOCATION", action: "ALLOCATE_LR" },
  { key: "requests", label: "Requests", pageCode: "LR_REQUESTS", action: "REQUEST_LR" },
  { key: "approvals", label: "Approvals", pageCode: "LR_APPROVALS", action: "APPROVE_LR" },
  { key: "transfer", label: "Transfer", pageCode: "LR_TRANSFER", action: "TRANSFER_LR" },
  { key: "consumption", label: "Consumption / Booking Usage", pageCode: "LR_CONSUMPTION", action: "CONSUME_LR" },
  { key: "void", label: "Void / Damaged / Lost", pageCode: "LR_VOID", action: "VOID_LR" },
  { key: "audit", label: "Audit Trail", pageCode: "LR_AUDIT", action: "VIEW_AUDIT" },
] as const;

export type ManualLrTabKey = (typeof manualLrTabDefinitions)[number]["key"];

export function ensureManualWorkflowPermissions(
  input?: Partial<ManualLRWorkflowPermissions>,
): ManualLRWorkflowPermissions {
  return {
    UPLOAD_LR: [...(input?.UPLOAD_LR ?? [])],
    ALLOCATE_LR: [...(input?.ALLOCATE_LR ?? [])],
    REQUEST_LR: [...(input?.REQUEST_LR ?? [])],
    APPROVE_LR: [...(input?.APPROVE_LR ?? [])],
    TRANSFER_LR: [...(input?.TRANSFER_LR ?? [])],
    CONSUME_LR: [...(input?.CONSUME_LR ?? [])],
    VOID_LR: [...(input?.VOID_LR ?? [])],
    VIEW_AUDIT: [...(input?.VIEW_AUDIT ?? [])],
  };
}

export function normalizeManualWorkflowScopes(
  scopes?: ManualLRWorkflowPermissionScope[],
): ManualLRWorkflowPermissionScope[] {
  return (scopes ?? [])
    .filter((scope) => scope.scopeOrgUnitId || scope.scopeLevelId || scope.managedLevelId)
    .map((scope) => ({
      scopeLevelId: scope.scopeLevelId ?? null,
      scopeOrgUnitId: scope.scopeOrgUnitId ?? null,
      managedLevelId: scope.managedLevelId ?? null,
      permissions: ensureManualWorkflowPermissions(scope.permissions),
    }));
}

export function buildManualLrPreview(config: Pick<TenantLRConfig, "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength">) {
  const separator = config.numberSeparator?.trim() || "-";
  const segments = [config.prefix.trim().toUpperCase() || "LR"];
  if (config.yearFormat === "YY") {
    segments.push("26");
  } else if (config.yearFormat === "YYYY") {
    segments.push("2026");
  }
  segments.push(String(1).padStart(Math.max(config.zeroPaddingLength ?? 6, 1), "0"));
  return segments.join(separator);
}

export function resolveManualLrFormat(
  config: Pick<
    TenantLRConfig,
    "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength" | "numberingPolicy" | "placeFormatOverrides"
  >,
  orgUnitId?: string | null,
) {
  const override =
    orgUnitId
      ? (config.placeFormatOverrides ?? []).find((item) => item.orgUnitId === orgUnitId) ?? null
      : null;
  return {
    prefix: override?.prefix ?? config.prefix,
    yearFormat: override?.yearFormat ?? config.yearFormat,
    numberSeparator: override?.numberSeparator ?? config.numberSeparator,
    zeroPaddingLength: override?.zeroPaddingLength ?? config.zeroPaddingLength,
    numberingPolicy: override?.numberingPolicy ?? config.numberingPolicy,
  };
}

export function resolveManualLrFormatForOrgUnit(
  config: Pick<
    TenantLRConfig,
    "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength" | "numberingPolicy" | "placeFormatOverrides" | "childGovernanceRules"
  >,
  orgUnitId: string | null | undefined,
  orgUnits: OrgUnit[],
) {
  const rootFormat = {
    prefix: config.prefix,
    yearFormat: config.yearFormat,
    numberSeparator: config.numberSeparator,
    zeroPaddingLength: config.zeroPaddingLength,
    numberingPolicy: config.numberingPolicy,
  };
  if (!orgUnitId) {
    return rootFormat;
  }
  const orgUnitMap = new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit]));
  const lineage: OrgUnit[] = [];
  let cursor = orgUnitMap.get(orgUnitId) ?? null;
  while (cursor) {
    lineage.unshift(cursor);
    cursor = cursor.parentOrgUnitId ? orgUnitMap.get(cursor.parentOrgUnitId) ?? null : null;
  }
  let currentFormat = rootFormat;
  for (const orgUnit of lineage) {
    const rule = (config.childGovernanceRules ?? []).find((item) => item.childLevelId === orgUnit.hierarchyLevelId) ?? null;
    const override = (config.placeFormatOverrides ?? []).find((item) => item.orgUnitId === orgUnit.id) ?? null;
    if (!rule) {
      continue;
    }
    if (rule.formatMode === "GLOBAL_PARENT_FORMAT") {
      continue;
    }
    if (rule.formatMode === "PARENT_PREFIX_CHILD_SUFFIX") {
      const rawCode = (override?.prefix ?? orgUnit.name).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      currentFormat = {
        ...currentFormat,
        prefix: `${currentFormat.prefix}${rawCode}`,
      };
      continue;
    }
    currentFormat = {
      prefix: override?.prefix ?? orgUnit.name.trim().toUpperCase().replace(/\s+/g, "-"),
      yearFormat: override?.yearFormat ?? currentFormat.yearFormat,
      numberSeparator: override?.numberSeparator ?? currentFormat.numberSeparator,
      zeroPaddingLength: override?.zeroPaddingLength ?? currentFormat.zeroPaddingLength,
      numberingPolicy: override?.numberingPolicy ?? currentFormat.numberingPolicy,
    };
  }
  return currentFormat;
}

export function buildManualLrRegex(config: Pick<TenantLRConfig, "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength">) {
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const separator = escape(config.numberSeparator?.trim() || "-");
  const prefix = escape(config.prefix.trim().toUpperCase() || "LR");
  const year =
    config.yearFormat === "YY"
      ? `${separator}\\d{2}`
      : config.yearFormat === "YYYY"
        ? `${separator}\\d{4}`
        : "";
  const digits = `\\d{${Math.max(config.zeroPaddingLength ?? 6, 1)}}`;
  return new RegExp(`^${prefix}${year}${separator}${digits}$`, "i");
}

export function buildManualLrNumber(
  config: Pick<TenantLRConfig, "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength">,
  sequenceNumber: number,
) {
  const separator = config.numberSeparator?.trim() || "-";
  const parts = [config.prefix.trim().toUpperCase() || "LR"];
  if (config.yearFormat === "YY") {
    parts.push(String(new Date().getFullYear()).slice(-2));
  } else if (config.yearFormat === "YYYY") {
    parts.push(String(new Date().getFullYear()));
  }
  parts.push(String(sequenceNumber).padStart(Math.max(config.zeroPaddingLength ?? 6, 1), "0"));
  return parts.join(separator);
}

export function parseManualLrInput(value: string) {
  return value
    .split(/[\r\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, entries) => entries.indexOf(entry) === index);
}

export function getNextManualLrSequence(pools: TenantLrPoolRecord[]) {
  return pools.reduce((maxValue, pool) => {
    const match = pool.lrNumber.match(/(\d+)(?!.*\d)/);
    return Math.max(maxValue, match ? Number(match[1]) : 0);
  }, 0);
}

export function getManualLrUiStatus(pool: Pick<TenantLrPoolRecord, "status" | "bookingId" | "voidReason">) {
  if (pool.status === "USED") {
    return "CONSUMED";
  }
  return pool.status;
}

export function getManualLrStatusTone(status: string) {
  if (status === "AVAILABLE") {
    return "success";
  }
  if (status === "USED" || status === "CONSUMED" || status === "ALLOCATED" || status === "TRANSFERRED") {
    return "accent";
  }
  if (status === "REQUESTED" || status === "APPROVAL_PENDING" || status === "TRANSFER_PENDING") {
    return "warning";
  }
  return "danger";
}

export function buildManualLrConfigInput(config: Partial<TenantLRConfig> | null | undefined) {
  return {
    scopeType: config?.scopeType ?? "TENANT",
    scopeOrgUnitIds: config?.scopeOrgUnitIds ?? [],
    poolOwnershipType: config?.poolOwnershipType ?? "TENANT",
    customerId: config?.customerId ?? null,
    vendorId: config?.vendorId ?? null,
    lrType: "MANUAL" as const,
    allocationStrategy: config?.scopeType === "HIERARCHY" ? "HIERARCHICAL" as const : "FLAT" as const,
    prefix: config?.prefix ?? "LR",
    numberSeparator: config?.numberSeparator ?? "-",
    yearFormat: config?.yearFormat ?? "YYYY",
    zeroPaddingLength: config?.zeroPaddingLength ?? 6,
    customerOwnershipEnabled: false,
    poolSource: config?.poolSource ?? "LIST",
    ownershipLevelId: config?.ownershipLevelId ?? null,
    distributionStrategy: config?.distributionStrategy ?? "DISTRIBUTED",
    workflowMode: config?.workflowMode ?? "APPROVAL_BASED",
    numberingPolicy: (config?.numberingPolicy ?? "STRICT_FORMAT") as ManualLRNumberingPolicy,
    customerLrPolicy: (config?.customerLrPolicy ?? "NOT_CUSTOMER_SPECIFIC") as ManualLRCustomerPolicy,
    allowCustomerFallback: config?.allowCustomerFallback ?? true,
    workflowPermissions: ensureManualWorkflowPermissions(config?.workflowPermissions),
    workflowPermissionScopes: normalizeManualWorkflowScopes(config?.workflowPermissionScopes),
    childGovernanceRules: (config?.childGovernanceRules ?? []).map((rule: ManualLRChildGovernanceRule) => ({
      childLevelId: rule.childLevelId,
      canConsumeParentLr: rule.canConsumeParentLr ?? false,
      childCanRequestLr: rule.childCanRequestLr ?? false,
      childCanConsumeLr: rule.childCanConsumeLr ?? true,
      canMaintainOwnSequence: rule.canMaintainOwnSequence ?? false,
      canDefineChildFormat: rule.canDefineChildFormat ?? false,
      parentCanGenerateLr: rule.parentCanGenerateLr ?? true,
      parentCanAllocateLrToChild: rule.parentCanAllocateLrToChild ?? false,
      canAllocateChildLr: rule.canAllocateChildLr ?? false,
      canApproveChildRequests: rule.canApproveChildRequests ?? false,
      canConfigureChildWorkflow: rule.canConfigureChildWorkflow ?? false,
      canDelegateChildGovernance: rule.canDelegateChildGovernance ?? false,
      inheritParentFormat: rule.inheritParentFormat ?? true,
      formatMode: (rule.formatMode ?? "GLOBAL_PARENT_FORMAT") as ManualLRChildFormatMode,
      allocationRequired: rule.allocationRequired ?? false,
      approvalRequired: rule.approvalRequired ?? false,
      canTransferLr: rule.canTransferLr ?? false,
    })),
    placeFormatOverrides: (config?.placeFormatOverrides ?? []).map((override: ManualLRPlaceFormatOverride) => ({
      orgUnitId: override.orgUnitId,
      prefix: override.prefix,
      yearFormat: override.yearFormat,
      numberSeparator: override.numberSeparator,
      zeroPaddingLength: override.zeroPaddingLength,
      numberingPolicy: override.numberingPolicy,
    })),
    poolRangeStart: config?.poolRangeStart ?? "",
    poolRangeEnd: config?.poolRangeEnd ?? "",
    poolEntries: config?.poolEntries ?? "",
    poolAvailableCount: config?.poolAvailableCount ?? 0,
    poolUsedCount: config?.poolUsedCount ?? 0,
    locationOrgUnitId: config?.locationOrgUnitId ?? "",
    locationCounter: config?.locationCounter ?? 0,
    allocationFlow: config?.allocationFlow,
    status: config?.status ?? "active",
  };
}

export function roleNamesForWorkflow(roleIds: string[], roleMap: Map<string, RoleDefinition>) {
  return roleIds
    .map((roleId) => roleMap.get(roleId)?.name ?? null)
    .filter((name): name is string => Boolean(name))
    .join(", ");
}
