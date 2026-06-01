import type { OrgUnit, RoleDefinition, UserRecord } from "@/types/access";
import { isTenantAdminRole } from "@/modules/tenant-admin/lib/tenant-modules";

// Effective data scope for a logged-in tenant user. This is the single source
// of truth for "what places can this user see data from?". List pages should
// run their data through `isInScope` rather than re-deriving scope locally.
//
// Resolution rules:
//   - role.dataScope === "ALL_TENANT" → tenant-wide (Company Root). No
//     filtering; user sees every record under the tenant.
//   - otherwise → user.orgUnitIds plus every descendant of those org units.
//     A Branch user therefore sees their branch and sub-branches; a Region
//     user sees their region and every branch under it.
//
// Note: a record can only be filtered by place if it carries an org-unit
// linkage (UserRecord.orgUnitIds, OrgUnit.id, OrgUnit.parentOrgUnitId).
// Entities without that linkage (booking / customer / vendor today) need
// to gain one before this helper can gate them — see `recordOrgUnitIds`.
export interface EffectiveUserScope {
  /** True when the role is dataScope=ALL_TENANT (Company Root). */
  isCompanyRoot: boolean;
  /** Every org unit the user can see — direct + descendants. */
  allowedOrgUnitIds: Set<string>;
  /** Direct org-unit assignments from the user record. */
  directOrgUnitIds: string[];
  /** Role scope value (raw). */
  dataScope: RoleDefinition["dataScope"] | undefined;
}

export function computeEffectiveUserScope(
  user: UserRecord | null,
  role: RoleDefinition | null,
  orgUnits: OrgUnit[],
): EffectiveUserScope {
  const dataScope = role?.dataScope;
  // Company Root short-circuit. Three ways a user is Company Root:
  //   1. role.dataScope === "ALL_TENANT" (the canonical signal).
  //   2. role is the system Tenant Admin role — that role's seed sometimes
  //      lacks an explicit dataScope but conceptually IS company-wide.
  //   3. session has no resolvable user (no role to scope against) — fail
  //      open so the demo / admin views don't go dark.
  const isTenantAdmin = role ? isTenantAdminRole(role) : false;
  if (dataScope === "ALL_TENANT" || isTenantAdmin || !user || !role) {
    return {
      isCompanyRoot: true,
      allowedOrgUnitIds: new Set(orgUnits.map((unit) => unit.id)),
      directOrgUnitIds: user?.orgUnitIds ?? [],
      dataScope,
    };
  }

  const seed = user.orgUnitIds ?? [];
  const childrenOf = new Map<string, OrgUnit[]>();
  orgUnits.forEach((unit) => {
    if (!unit.parentOrgUnitId) return;
    const list = childrenOf.get(unit.parentOrgUnitId) ?? [];
    list.push(unit);
    childrenOf.set(unit.parentOrgUnitId, list);
  });

  const allowed = new Set<string>();
  const queue = [...seed];
  while (queue.length) {
    const id = queue.shift();
    if (!id || allowed.has(id)) continue;
    allowed.add(id);
    (childrenOf.get(id) ?? []).forEach((child) => queue.push(child.id));
  }

  return {
    isCompanyRoot: false,
    allowedOrgUnitIds: allowed,
    directOrgUnitIds: seed,
    dataScope,
  };
}

// Convenience: does a record's org-unit linkage intersect the user's allowed
// set? Returns true when the user is Company Root or when at least one of
// the record's units sits inside the allowed set.
export function isRecordInScope(
  scope: EffectiveUserScope,
  recordOrgUnitIds: string[] | null | undefined,
): boolean {
  if (scope.isCompanyRoot) return true;
  if (!recordOrgUnitIds || recordOrgUnitIds.length === 0) return false;
  return recordOrgUnitIds.some((id) => scope.allowedOrgUnitIds.has(id));
}
