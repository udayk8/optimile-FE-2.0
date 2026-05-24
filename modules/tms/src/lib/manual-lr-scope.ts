import type { OrgUnit } from '@tms-booking/types/access';
import { resolveManualLrConsumableOrgUnits } from '@tms-booking/shared/lib/manual-lr-governance';

export function resolveManualLrScopedOrgUnits(params: {
  orgUnits: OrgUnit[];
  assignedOrgUnitIds: string[];
  ownershipLevelId?: string | null;
  config?: unknown;
  activeOrgUnitId?: string | null;
}) {
  return resolveManualLrConsumableOrgUnits({
    orgUnits: params.orgUnits,
    assignedOrgUnitIds: params.assignedOrgUnitIds,
    activeOrgUnitId: params.activeOrgUnitId,
  });
}

