import type { TenantLrAllocationRequestRecord, TenantLrRecord } from "@/modules/tms/booking/types";
import type { OrgUnit } from "@/types/access";
import type {
  ManualLRChildFormatMode,
  TenantLRConfig,
} from "@/types/master-data";
import { buildManualLrNumber, buildManualLrPreview, resolveManualLrFormatForOrgUnit } from "@/modules/tenant-admin/lib/manual-lr";

export const autoLrTabDefinitions = [
  { key: "governance", label: "Governance" },
  { key: "sequence", label: "Sequence Rules" },
  { key: "allocation", label: "Allocation Rights" },
  { key: "requests", label: "Requests" },
  { key: "audit", label: "Generation Audit" },
  { key: "runtime", label: "Runtime Preview" },
] as const;

export type AutoLrTabKey = (typeof autoLrTabDefinitions)[number]["key"];

export function buildAutoLrConfigInput(config: Partial<TenantLRConfig> | null | undefined) {
  return {
    scopeType: config?.scopeType ?? "TENANT",
    scopeOrgUnitIds: config?.scopeOrgUnitIds ?? [],
    poolOwnershipType: config?.poolOwnershipType ?? "TENANT",
    customerId: config?.customerId ?? null,
    vendorId: config?.vendorId ?? null,
    lrType: "AUTO" as const,
    allocationStrategy: config?.scopeType === "HIERARCHY" ? "HIERARCHICAL" as const : "FLAT" as const,
    prefix: config?.prefix ?? "AUTO",
    numberSeparator: config?.numberSeparator ?? "-",
    yearFormat: config?.yearFormat ?? "YYYY",
    zeroPaddingLength: config?.zeroPaddingLength ?? 6,
    customerOwnershipEnabled: false,
    poolSource: "LIST" as const,
    ownershipLevelId: config?.ownershipLevelId ?? null,
    distributionStrategy: config?.distributionStrategy ?? "DISTRIBUTED",
    workflowMode: config?.workflowMode ?? "APPROVAL_BASED",
    numberingPolicy: config?.numberingPolicy ?? "STRICT_FORMAT",
    customerLrPolicy: config?.customerLrPolicy ?? "NOT_CUSTOMER_SPECIFIC",
    allowCustomerFallback: config?.allowCustomerFallback ?? true,
    workflowPermissions: config?.workflowPermissions ?? {},
    workflowPermissionScopes: config?.workflowPermissionScopes ?? [],
    childGovernanceRules: config?.childGovernanceRules ?? [],
    placeFormatOverrides: config?.placeFormatOverrides ?? [],
    poolRangeStart: "",
    poolRangeEnd: "",
    poolEntries: "",
    poolAvailableCount: 0,
    poolUsedCount: 0,
    locationOrgUnitId: config?.locationOrgUnitId ?? "",
    locationCounter: config?.locationCounter ?? 0,
    allocationFlow: config?.allocationFlow,
    status: config?.status ?? "active",
  };
}

export function buildAutoLrRuntimePreview(params: {
  config: TenantLRConfig;
  orgUnitId: string | null | undefined;
  orgUnits: OrgUnit[];
  generatedRecords: TenantLrRecord[];
}) {
  const { config, orgUnitId, orgUnits, generatedRecords } = params;
  const resolvedFormat = resolveManualLrFormatForOrgUnit(config, orgUnitId, orgUnits);
  const nextSequence =
    generatedRecords
      .map((record) => {
        const match = record.lrNumber.match(/(\d+)(?!.*\d)/);
        return match ? Number(match[1]) : 0;
      })
      .reduce((max, value) => Math.max(max, value), 0) + 1;
  return {
    formatPreview: buildManualLrPreview(resolvedFormat),
    nextNumber: buildManualLrNumber(resolvedFormat, nextSequence),
  };
}

export interface AutoLrPlaceInventory {
  approvedCount: number;
  generatedCount: number;
  availableCount: number;
  lastGenerated: string | null;
  nextNumber: string;
  formatPreview: string;
  approverOrgUnitId: string | null;
}

// Count/quota inventory for ONE place, DERIVED (no separate storage):
//   available = Σ approvedCount of APPROVED requests owned by the place
//               − number of AUTO LR already generated for the place.
// Generated AUTO LR records carry orgUnitId (set at generation time).
export function computeAutoLrPlaceInventory(params: {
  config: TenantLRConfig;
  placeId: string | null;
  orgUnits: OrgUnit[];
  requests: TenantLrAllocationRequestRecord[];
  generatedRecords: TenantLrRecord[];
}): AutoLrPlaceInventory {
  const { config, placeId, orgUnits, requests, generatedRecords } = params;
  const approved = requests.filter(
    (request) => request.status === "APPROVED" && (request.sourceOrgUnitId ?? null) === (placeId ?? null),
  );
  const approvedCount = approved.reduce((sum, request) => sum + (request.approvedCount || 0), 0);
  const placeGenerated = generatedRecords.filter((record) => (record.orgUnitId ?? null) === (placeId ?? null));
  const generatedCount = placeGenerated.length;
  const availableCount = Math.max(0, approvedCount - generatedCount);
  const resolvedFormat = resolveManualLrFormatForOrgUnit(config, placeId, orgUnits);
  const lastSequence = placeGenerated
    .map((record) => {
      const match = record.lrNumber.match(/(\d+)(?!.*\d)/);
      return match ? Number(match[1]) : 0;
    })
    .reduce((max, value) => Math.max(max, value), 0);
  const sortedNumbers = placeGenerated.map((record) => record.lrNumber).sort();
  const latestApproved = approved
    .slice()
    .sort((left, right) => (left.decidedAt ?? left.updatedAt).localeCompare(right.decidedAt ?? right.updatedAt));
  return {
    approvedCount,
    generatedCount,
    availableCount,
    lastGenerated: sortedNumbers.length ? sortedNumbers[sortedNumbers.length - 1] : null,
    nextNumber: buildManualLrNumber(resolvedFormat, lastSequence + 1),
    formatPreview: buildManualLrPreview(resolvedFormat),
    approverOrgUnitId: latestApproved.length ? latestApproved[latestApproved.length - 1].targetOrgUnitId ?? null : null,
  };
}

export function buildAutoChildStrategyCards(childLevelLabel: string) {
  return [
    {
      mode: "GLOBAL_PARENT_FORMAT" as const satisfies ManualLRChildFormatMode,
      title: `${childLevelLabel} uses parent format`,
      description: `${childLevelLabel} generates using the parent sequence pattern.`,
      example: "ELAUTO-000001",
    },
    {
      mode: "PARENT_PREFIX_CHILD_SUFFIX" as const satisfies ManualLRChildFormatMode,
      title: `${childLevelLabel} uses parent prefix + child code`,
      description: `${childLevelLabel} extends the parent prefix at runtime.`,
      example: "ELAUTO-SOUTH-000001",
    },
    {
      mode: "FULL_CHILD_FORMAT" as const satisfies ManualLRChildFormatMode,
      title: `Each ${childLevelLabel} has separate format`,
      description: `${childLevelLabel} becomes the first independent sequence authority.`,
      example: "SOUTH-000001",
    },
  ];
}
