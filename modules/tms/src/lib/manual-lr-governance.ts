import type { OrgUnit } from '@tms-booking/types/access';

export function resolveManualLrConsumableOrgUnits(params: {
  orgUnits: OrgUnit[];
  assignedOrgUnitIds: string[];
  activeOrgUnitId?: string | null;
}) {
  const { orgUnits, assignedOrgUnitIds, activeOrgUnitId } = params;
  const scoped = orgUnits.filter((orgUnit) => assignedOrgUnitIds.includes(orgUnit.id));
  if (!activeOrgUnitId) {
    return scoped;
  }
  return scoped.filter((orgUnit) => orgUnit.id === activeOrgUnitId || orgUnit.parentOrgUnitId === activeOrgUnitId);
}

