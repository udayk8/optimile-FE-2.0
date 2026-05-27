import type { OrgUnit, UserRecord } from "@/types/access";

export function formatRoleUserPlaceSummary(
  users: UserRecord[],
  orgUnits: OrgUnit[],
  options?: {
    maxUsers?: number;
    maxPlacesPerUser?: number;
  },
) {
  const maxUsers = options?.maxUsers ?? 2;
  const maxPlacesPerUser = options?.maxPlacesPerUser ?? 2;
  if (!users.length) {
    return "No assigned users";
  }
  const orgUnitMap = new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit.name]));
  const orgUnitRecordMap = new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit]));
  const buildOrgUnitPath = (orgUnitId: string) => {
    const segments: string[] = [];
    let current = orgUnitRecordMap.get(orgUnitId) ?? null;
    while (current) {
      segments.unshift(current.name);
      current = current.parentOrgUnitId ? orgUnitRecordMap.get(current.parentOrgUnitId) ?? null : null;
    }
    return segments.reverse().join(" > ");
  };
  const visibleUsers = users.slice(0, Math.max(1, maxUsers));
  const segments = visibleUsers.map((user) => {
    const placeNames = user.orgUnitIds
      .slice(0, Math.max(1, maxPlacesPerUser))
      .map((orgUnitId) => buildOrgUnitPath(orgUnitId) || orgUnitMap.get(orgUnitId) || orgUnitId);
    const placesLabel = placeNames.length ? placeNames.join(", ") : "Tenant Level";
    return `${user.name} - ${placesLabel}`;
  });
  const remainingUsers = users.length - visibleUsers.length;
  return remainingUsers > 0 ? `${segments.join(" | ")} +${remainingUsers} more` : segments.join(" | ");
}
