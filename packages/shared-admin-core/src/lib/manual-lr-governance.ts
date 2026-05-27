import type { OrgUnit } from "@/types/access";
import type {
  ManualLRChildGovernanceRule,
  ManualLRDistributionStrategy,
  ManualLRWorkflowAction,
  ManualLRWorkflowPermissionScope,
  ManualLRWorkflowPermissions,
  ManualLRWorkflowMode,
  TenantLRConfig,
} from "@/types/master-data";

type GovernanceHierarchyLevel = {
  id: string;
  name: string;
  order: number;
  active: boolean;
};

function buildOrgUnitMap(orgUnits: OrgUnit[]) {
  return new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit]));
}

function getAncestors(orgUnitId: string, orgUnitMap: Map<string, OrgUnit>) {
  const ancestors: OrgUnit[] = [];
  let cursor = orgUnitMap.get(orgUnitId);
  while (cursor?.parentOrgUnitId) {
    const parent = orgUnitMap.get(cursor.parentOrgUnitId);
    if (!parent) {
      break;
    }
    ancestors.push(parent);
    cursor = parent;
  }
  return ancestors;
}

function getAncestorAtLevel(
  orgUnitId: string,
  hierarchyLevelId: string | null | undefined,
  orgUnitMap: Map<string, OrgUnit>,
) {
  if (!hierarchyLevelId) {
    return null;
  }
  return getAncestors(orgUnitId, orgUnitMap).find((ancestor) => ancestor.hierarchyLevelId === hierarchyLevelId) ?? null;
}

function getHierarchyPath(startOrgUnitId: string, orgUnitMap: Map<string, OrgUnit>) {
  const current = orgUnitMap.get(startOrgUnitId);
  if (!current) {
    return [];
  }
  return [current, ...getAncestors(startOrgUnitId, orgUnitMap)];
}

export function getManualLrGovernanceDefaults(config?: Partial<TenantLRConfig> | null) {
  return {
    distributionStrategy: (config?.distributionStrategy ?? "DISTRIBUTED") as ManualLRDistributionStrategy,
    workflowMode: (config?.workflowMode ?? "APPROVAL_BASED") as ManualLRWorkflowMode,
    childGovernanceRules: (config?.childGovernanceRules ?? []) as ManualLRChildGovernanceRule[],
  };
}

export function buildManualLrChildGovernanceRules(params: {
  hierarchyLevels: GovernanceHierarchyLevel[];
  ownershipLevelId: string | null | undefined;
  existingRules?: ManualLRChildGovernanceRule[];
  distributionStrategy?: ManualLRDistributionStrategy;
  workflowMode?: ManualLRWorkflowMode;
}) {
  const {
    hierarchyLevels,
    ownershipLevelId,
    existingRules = [],
    distributionStrategy = "DISTRIBUTED",
    workflowMode = "APPROVAL_BASED",
  } = params;
  const ownershipLevel = ownershipLevelId
    ? hierarchyLevels.find((level) => level.id === ownershipLevelId) ?? null
    : null;
  if (!ownershipLevel) {
    return [] as ManualLRChildGovernanceRule[];
  }

  return hierarchyLevels
    .filter((level) => level.active && level.order > ownershipLevel.order)
    .sort((a, b) => a.order - b.order)
    .map((level) => {
      const existing = existingRules.find((rule) => rule.childLevelId === level.id);
      const centralized = distributionStrategy === "CENTRALIZED";
      const approvalBased = workflowMode === "APPROVAL_BASED";
      const controlled = workflowMode === "CONTROLLED_ALLOCATION";
      return {
        childLevelId: level.id,
        canConsumeParentLr: existing?.canConsumeParentLr ?? centralized,
        childCanRequestLr: existing?.childCanRequestLr ?? approvalBased,
        childCanConsumeLr: existing?.childCanConsumeLr ?? true,
        canMaintainOwnSequence: existing?.canMaintainOwnSequence ?? false,
        canDefineChildFormat: existing?.canDefineChildFormat ?? false,
        parentCanGenerateLr: existing?.parentCanGenerateLr ?? true,
        parentCanAllocateLrToChild: existing?.parentCanAllocateLrToChild ?? !centralized,
        canAllocateChildLr: existing?.canAllocateChildLr ?? !centralized,
        canApproveChildRequests: existing?.canApproveChildRequests ?? approvalBased,
        canConfigureChildWorkflow: existing?.canConfigureChildWorkflow ?? false,
        canDelegateChildGovernance: existing?.canDelegateChildGovernance ?? false,
        inheritParentFormat: existing?.inheritParentFormat ?? true,
        allocationRequired: existing?.allocationRequired ?? !centralized,
        approvalRequired: existing?.approvalRequired ?? approvalBased,
        canTransferLr: existing?.canTransferLr ?? (controlled || approvalBased),
      };
    });
}

export function resolveManualLrConsumableOrgUnits(params: {
  orgUnits: OrgUnit[];
  assignedOrgUnitIds: string[];
  activeOrgUnitId?: string | null;
  config?: Pick<TenantLRConfig, "ownershipLevelId" | "distributionStrategy" | "workflowMode" | "childGovernanceRules"> | null;
}) {
  const { orgUnits, assignedOrgUnitIds, activeOrgUnitId, config } = params;
  const orgUnitMap = buildOrgUnitMap(orgUnits);
  const governance = getManualLrGovernanceDefaults(config);
  const matches = new Map<string, OrgUnit>();

  if (!assignedOrgUnitIds.length) {
    return [] as OrgUnit[];
  }

  assignedOrgUnitIds.forEach((assignedOrgUnitId) => {
    const assignedOrgUnit = orgUnitMap.get(assignedOrgUnitId);
    if (!assignedOrgUnit) {
      return;
    }
    matches.set(assignedOrgUnit.id, assignedOrgUnit);

    const ownershipOrgUnit = getAncestorAtLevel(
      assignedOrgUnit.id,
      config?.ownershipLevelId ?? null,
      orgUnitMap,
    );

    if (!ownershipOrgUnit && !config?.ownershipLevelId) {
      matches.set(assignedOrgUnit.id, assignedOrgUnit);
      return;
    }

    if (!ownershipOrgUnit) {
      return;
    }

    const path = getHierarchyPath(assignedOrgUnit.id, orgUnitMap);
    const childRulesByLevel = new Map(
      governance.childGovernanceRules.map((rule) => [rule.childLevelId, rule]),
    );

    path.forEach((candidate) => {
      if (candidate.id === assignedOrgUnit.id) {
        matches.set(candidate.id, candidate);
        return;
      }
      const rule = childRulesByLevel.get(assignedOrgUnit.hierarchyLevelId);
      const centralized = governance.distributionStrategy === "CENTRALIZED";
      const hybrid = governance.distributionStrategy === "HYBRID";
      if (centralized || (hybrid && rule?.canConsumeParentLr) || rule?.canConsumeParentLr) {
        matches.set(candidate.id, candidate);
      }
    });

    if (
      governance.distributionStrategy === "CENTRALIZED" ||
      governance.workflowMode === "DIRECT_USAGE"
    ) {
      matches.set(ownershipOrgUnit.id, ownershipOrgUnit);
    }
  });

  const resolved = Array.from(matches.values());
  if (!activeOrgUnitId) {
    return resolved;
  }
  const activeOrgUnit = orgUnitMap.get(activeOrgUnitId);
  if (!activeOrgUnit) {
    return resolved;
  }
  const activePathIds = new Set(getHierarchyPath(activeOrgUnit.id, orgUnitMap).map((item) => item.id).concat(activeOrgUnit.id));
  return resolved.filter((orgUnit) => orgUnit.id === activeOrgUnit.id || activePathIds.has(orgUnit.id));
}

export function describeManualLrConsumablePools(params: {
  availableActiveOrgUnits: OrgUnit[];
  activeOrgUnitId?: string | null;
  config?: Pick<TenantLRConfig, "distributionStrategy" | "workflowMode"> | null;
}) {
  const { availableActiveOrgUnits, activeOrgUnitId, config } = params;
  const activeUnit = availableActiveOrgUnits.find((orgUnit) => orgUnit.id === activeOrgUnitId) ?? null;
  const poolLabels = availableActiveOrgUnits.map((orgUnit) => {
    if (activeUnit?.id === orgUnit.id) {
      return `${orgUnit.name} LR`;
    }
    return `${orgUnit.name} inherited LR`;
  });
  return {
    poolLabels,
    distributionStrategy: config?.distributionStrategy ?? "DISTRIBUTED",
    workflowMode: config?.workflowMode ?? "APPROVAL_BASED",
  };
}

export function resolveManualLrWorkflowPermissions(params: {
  config?: Pick<TenantLRConfig, "workflowPermissions" | "workflowPermissionScopes"> | null;
  activeOrgUnitId?: string | null;
  orgUnits: OrgUnit[];
  managedLevelId?: string | null;
}) {
  const { config, activeOrgUnitId, orgUnits, managedLevelId } = params;
  const base = {
    UPLOAD_LR: [...(config?.workflowPermissions?.UPLOAD_LR ?? [])],
    ALLOCATE_LR: [...(config?.workflowPermissions?.ALLOCATE_LR ?? [])],
    REQUEST_LR: [...(config?.workflowPermissions?.REQUEST_LR ?? [])],
    APPROVE_LR: [...(config?.workflowPermissions?.APPROVE_LR ?? [])],
    TRANSFER_LR: [...(config?.workflowPermissions?.TRANSFER_LR ?? [])],
    CONSUME_LR: [...(config?.workflowPermissions?.CONSUME_LR ?? [])],
    VOID_LR: [...(config?.workflowPermissions?.VOID_LR ?? [])],
    VIEW_AUDIT: [...(config?.workflowPermissions?.VIEW_AUDIT ?? [])],
  } satisfies ManualLRWorkflowPermissions;
  if (!config?.workflowPermissionScopes?.length || !activeOrgUnitId) {
    return base;
  }

  const orgUnitMap = buildOrgUnitMap(orgUnits);
  const path = [activeOrgUnitId, ...getAncestors(activeOrgUnitId, orgUnitMap).map((item) => item.id)];
  const scopedMatch =
    path
      .map((orgUnitId) =>
        config.workflowPermissionScopes?.find(
          (scope) =>
            scope.scopeOrgUnitId === orgUnitId &&
            (!managedLevelId || !scope.managedLevelId || scope.managedLevelId === managedLevelId),
        ) ?? null,
      )
      .find(Boolean) ?? null;

  if (!scopedMatch) {
    return base;
  }

  const merged = { ...base };
  (Object.keys(base) as ManualLRWorkflowAction[]).forEach((action) => {
    const scopedRoles = scopedMatch.permissions?.[action] ?? [];
    if (scopedRoles.length) {
      merged[action] = Array.from(new Set(scopedRoles));
    }
  });
  return merged;
}

export function upsertManualLrWorkflowPermissionScope(params: {
  scopes?: ManualLRWorkflowPermissionScope[];
  nextScope: ManualLRWorkflowPermissionScope;
}) {
  const { scopes = [], nextScope } = params;
  const next = scopes.filter(
    (scope) =>
      !(
        scope.scopeOrgUnitId === (nextScope.scopeOrgUnitId ?? null) &&
        scope.scopeLevelId === (nextScope.scopeLevelId ?? null) &&
        scope.managedLevelId === (nextScope.managedLevelId ?? null)
      ),
  );
  next.push(nextScope);
  return next;
}
