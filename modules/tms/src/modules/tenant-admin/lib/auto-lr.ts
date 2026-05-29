import type { TenantLrRecord } from "@/modules/tms/booking/types";
import type { OrgUnit } from "@/types/access";
import type {
  ManualLRChildFormatMode,
  TenantLRConfig,
} from "@/types/master-data";
import { buildManualLrNumber, buildManualLrPreview, resolveManualLrFormatForOrgUnit } from "@tms-booking/modules/tenant-admin/lib/manual-lr";

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

