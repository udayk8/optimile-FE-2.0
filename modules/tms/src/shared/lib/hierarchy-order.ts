import type { OrgUnit, RoleDefinition, UserRecord } from "@/types/access";

type SortableLevel = {
  id: string;
  order: number;
};

const rolePriority: Record<string, number> = {
  "tenant admin / ceo": 0,
  "system coordinator": 1,
  "operations head / coo": 2,
  "regional manager": 3,
  "operations manager": 4,
  "dispatch supervisor": 5,
  "ground supervisor": 6,
};

function buildLevelOrderMap(levels: SortableLevel[]) {
  return new Map(levels.map((level) => [level.id, level.order]));
}

export function sortOrgUnitsByHierarchy(orgUnits: OrgUnit[], levels: SortableLevel[]) {
  const levelOrderMap = buildLevelOrderMap(levels);
  return [...orgUnits].sort((left, right) => {
    const leftOrder = levelOrderMap.get(left.hierarchyLevelId) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = levelOrderMap.get(right.hierarchyLevelId) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.name.localeCompare(right.name);
  });
}

export function sortRolesByHierarchy(
  roles: RoleDefinition[],
  levels: SortableLevel[],
) {
  const levelOrderMap = buildLevelOrderMap(levels);
  return [...roles].sort((left, right) => {
    const leftPriority = rolePriority[left.name.trim().toLowerCase()] ?? 99;
    const rightPriority = rolePriority[right.name.trim().toLowerCase()] ?? 99;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    const leftTenantWide = left.dataScope === "ALL_TENANT" ? 0 : 1;
    const rightTenantWide = right.dataScope === "ALL_TENANT" ? 0 : 1;
    if (leftTenantWide !== rightTenantWide) {
      return leftTenantWide - rightTenantWide;
    }
    const leftOrder = levelOrderMap.get(left.hierarchyLevelId) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = levelOrderMap.get(right.hierarchyLevelId) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.name.localeCompare(right.name);
  });
}

export function sortUsersByHierarchy(
  users: UserRecord[],
  orgUnits: OrgUnit[],
  levels: SortableLevel[],
) {
  const orgUnitMap = new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit]));
  const levelOrderMap = buildLevelOrderMap(levels);
  return [...users].sort((left, right) => {
    const leftOrgUnit = left.orgUnitIds[0] ? orgUnitMap.get(left.orgUnitIds[0]) : null;
    const rightOrgUnit = right.orgUnitIds[0] ? orgUnitMap.get(right.orgUnitIds[0]) : null;
    const leftOrder = leftOrgUnit ? (levelOrderMap.get(leftOrgUnit.hierarchyLevelId) ?? Number.MAX_SAFE_INTEGER) : -1;
    const rightOrder = rightOrgUnit ? (levelOrderMap.get(rightOrgUnit.hierarchyLevelId) ?? Number.MAX_SAFE_INTEGER) : -1;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    const leftPlace = leftOrgUnit?.name ?? "";
    const rightPlace = rightOrgUnit?.name ?? "";
    if (leftPlace !== rightPlace) {
      return leftPlace.localeCompare(rightPlace);
    }
    return left.name.localeCompare(right.name);
  });
}
