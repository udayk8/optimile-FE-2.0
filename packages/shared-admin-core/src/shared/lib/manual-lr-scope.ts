import type { OrgUnit } from "@/types/access";
import type { TenantLRConfig } from "@/types/master-data";
import { resolveManualLrConsumableOrgUnits } from "@/shared/lib/manual-lr-governance";

function buildOrgUnitMap(orgUnits: OrgUnit[]) {
  return new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit]));
}

function collectAncestorAtLevel(
  startOrgUnit: OrgUnit,
  ownershipLevelId: string,
  orgUnitMap: Map<string, OrgUnit>,
) {
  let cursor: OrgUnit | undefined = startOrgUnit;
  while (cursor?.parentOrgUnitId) {
    const parent = orgUnitMap.get(cursor.parentOrgUnitId);
    if (!parent) {
      return null;
    }
    if (parent.hierarchyLevelId === ownershipLevelId) {
      return parent;
    }
    cursor = parent;
  }
  return null;
}

function collectDescendantsAtLevel(
  startOrgUnitId: string,
  ownershipLevelId: string,
  orgUnits: OrgUnit[],
  orgUnitMap: Map<string, OrgUnit>,
) {
  const matches: OrgUnit[] = [];
  orgUnits.forEach((candidate) => {
    if (candidate.hierarchyLevelId !== ownershipLevelId) {
      return;
    }
    let cursor: OrgUnit | undefined = candidate;
    while (cursor?.parentOrgUnitId) {
      const parent = orgUnitMap.get(cursor.parentOrgUnitId);
      if (!parent) {
        break;
      }
      if (parent.id === startOrgUnitId) {
        matches.push(candidate);
        break;
      }
      cursor = parent;
    }
  });
  return matches;
}

export function resolveManualLrScopedOrgUnits(params: {
  orgUnits: OrgUnit[];
  assignedOrgUnitIds: string[];
  ownershipLevelId: string | null | undefined;
  config?: Pick<TenantLRConfig, "ownershipLevelId" | "distributionStrategy" | "workflowMode" | "childGovernanceRules"> | null;
  activeOrgUnitId?: string | null;
}) {
  const { orgUnits, assignedOrgUnitIds, ownershipLevelId, config, activeOrgUnitId } = params;
  if (config) {
    return resolveManualLrConsumableOrgUnits({
      orgUnits,
      assignedOrgUnitIds,
      activeOrgUnitId,
      config: {
        ownershipLevelId: config.ownershipLevelId ?? ownershipLevelId ?? null,
        distributionStrategy: config.distributionStrategy,
        workflowMode: config.workflowMode,
        childGovernanceRules: config.childGovernanceRules,
      },
    });
  }
  const assignedOrgUnits = orgUnits.filter((orgUnit) => assignedOrgUnitIds.includes(orgUnit.id));
  if (!ownershipLevelId) {
    return assignedOrgUnits;
  }

  const orgUnitMap = buildOrgUnitMap(orgUnits);
  const matches = new Map<string, OrgUnit>();

  assignedOrgUnits.forEach((assignedOrgUnit) => {
    if (assignedOrgUnit.hierarchyLevelId === ownershipLevelId) {
      matches.set(assignedOrgUnit.id, assignedOrgUnit);
      return;
    }

    const ancestor = collectAncestorAtLevel(assignedOrgUnit, ownershipLevelId, orgUnitMap);
    if (ancestor) {
      matches.set(ancestor.id, ancestor);
    }

    collectDescendantsAtLevel(assignedOrgUnit.id, ownershipLevelId, orgUnits, orgUnitMap).forEach((orgUnit) => {
      matches.set(orgUnit.id, orgUnit);
    });
  });

  return Array.from(matches.values());
}
