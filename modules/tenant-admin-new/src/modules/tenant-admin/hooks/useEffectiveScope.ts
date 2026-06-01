import { useMemo } from "react";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { computeEffectiveUserScope } from "@/modules/tenant-admin/lib/user-scope";

// Hook over computeEffectiveUserScope — gives any tenant-admin page the
// logged-in user's effective allowed org-unit set, ready to gate row-level
// reads. See user-scope.ts for the resolution rules.
export function useEffectiveScope() {
  const access = useTenantAccess();
  const { tenantId } = useTenantRouteContext();
  const { data: orgUnits } = useTenantOrgUnits(tenantId);
  return useMemo(
    () => computeEffectiveUserScope(access.currentTenantUser, access.activeRole, orgUnits),
    [access.currentTenantUser, access.activeRole, orgUnits],
  );
}
