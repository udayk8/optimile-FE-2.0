import { useMemo } from "react";
import { useSessionContext } from "@/shared/auth/session-context";
import { useTenantRoles } from "@/modules/tenant-admin/hooks/useTenantRoles";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import { useTenantOrgTypes } from "@/modules/tenant-admin/hooks/useTenantOrgTypes";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantLRConfigs } from "@/modules/tenant-admin/hooks/useTenantMasterData";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { resolveManualLrScopedOrgUnits } from "@/shared/lib/manual-lr-scope";
import { describeManualLrConsumablePools, resolveManualLrWorkflowPermissions } from "@/shared/lib/manual-lr-governance";
import type { ManualLRWorkflowAction, TenantLRConfig } from "@/types/master-data";

const actionToPagePermission: Record<
  ManualLRWorkflowAction,
  { pageCode: string; action: string }
> = {
  UPLOAD_LR: { pageCode: "CREATE_UPLOAD_LR", action: "UPLOAD_LR" },
  ALLOCATE_LR: { pageCode: "LR_ALLOCATION", action: "ALLOCATE_LR" },
  REQUEST_LR: { pageCode: "LR_REQUESTS", action: "REQUEST_LR" },
  APPROVE_LR: { pageCode: "LR_APPROVALS", action: "APPROVE_LR" },
  TRANSFER_LR: { pageCode: "LR_TRANSFER", action: "TRANSFER_LR" },
  CONSUME_LR: { pageCode: "LR_CONSUMPTION", action: "GENERATE_LR" },
  VOID_LR: { pageCode: "LR_VOID", action: "VOID_LR" },
  VIEW_AUDIT: { pageCode: "LR_AUDIT", action: "VIEW_AUDIT" },
};

export function useManualLrContext() {
  const { tenant } = useTenantRouteContext();
  const { session, setSession } = useSessionContext();
  const access = useTenantAccess("/tenant/:tenantId/lr");
  const { data: roles } = useTenantRoles(tenant.id);
  const { data: users } = useTenantUsers(tenant.id);
  const { data: orgUnits } = useTenantOrgUnits(tenant.id);
  const { data: hierarchyLevels } = useTenantOrgTypes(tenant.id);
  const { data: lrConfigs } = useTenantLRConfigs(tenant.id);

  const activeConfig = useMemo(
    () =>
      lrConfigs.find((config) => config.lrType === "MANUAL" && config.status === "active") ??
      lrConfigs.find((config) => config.lrType === "MANUAL") ??
      null,
    [lrConfigs],
  );
  const currentUser = useMemo(
    () => users.find((user) => user.name === session.actorName || user.email === session.actorName) ?? null,
    [session.actorName, users],
  );
  const currentRole = useMemo(
    () => access.activeRole ?? roles.find((role) => role.id === currentUser?.roleId) ?? null,
    [access.activeRole, currentUser?.roleId, roles],
  );
  const assignedOrgUnits = useMemo(
    () => orgUnits.filter((orgUnit) => currentUser?.orgUnitIds.includes(orgUnit.id)),
    [currentUser?.orgUnitIds, orgUnits],
  );
  const assignedLevelId = currentRole?.hierarchyLevelId ?? assignedOrgUnits[0]?.hierarchyLevelId ?? null;
  const assignedLevel = hierarchyLevels.find((level) => level.id === assignedLevelId) ?? null;
  const hierarchyLevelMap = useMemo(
    () => new Map(hierarchyLevels.map((level) => [level.id, level])),
    [hierarchyLevels],
  );
  const availableActiveOrgUnits = useMemo(
    () =>
      resolveManualLrScopedOrgUnits({
        orgUnits,
        assignedOrgUnitIds: currentUser?.orgUnitIds ?? [],
        ownershipLevelId: activeConfig?.ownershipLevelId ?? null,
        config: activeConfig,
        activeOrgUnitId: session.activeTenantOrgUnitId,
      }),
    [activeConfig, currentUser?.orgUnitIds, orgUnits, session.activeTenantOrgUnitId],
  );
  const activeOrgUnit =
    availableActiveOrgUnits.find((orgUnit) => orgUnit.id === session.activeTenantOrgUnitId) ??
    availableActiveOrgUnits[0] ??
    null;
  const managedLevelId = useMemo(() => {
    if (!assignedLevel) {
      return activeConfig?.ownershipLevelId ?? null;
    }
    const nextLevel =
      hierarchyLevels
        .filter((level) => level.active)
        .sort((a, b) => a.order - b.order)
        .find((level) => level.order > assignedLevel.order) ?? null;
    return nextLevel?.id ?? null;
  }, [activeConfig?.ownershipLevelId, assignedLevel, hierarchyLevels]);
  const currentLevelGovernanceRule = useMemo(
    () =>
      assignedLevel
        ? activeConfig?.childGovernanceRules?.find((rule) => rule.childLevelId === assignedLevel.id) ?? null
        : null,
    [activeConfig?.childGovernanceRules, assignedLevel],
  );
  const managedChildGovernanceRule = useMemo(
    () =>
      managedLevelId
        ? activeConfig?.childGovernanceRules?.find((rule) => rule.childLevelId === managedLevelId) ?? null
        : null,
    [activeConfig?.childGovernanceRules, managedLevelId],
  );
  const effectiveWorkflowPermissions = useMemo(
    () =>
      resolveManualLrWorkflowPermissions({
        config: activeConfig,
        activeOrgUnitId: activeOrgUnit?.id ?? null,
        orgUnits,
        managedLevelId,
      }),
    [activeConfig, activeOrgUnit?.id, managedLevelId, orgUnits],
  );

  function setActiveOrgUnit(orgUnitId: string | null) {
    setSession({
      ...session,
      tenantId: tenant.id,
      activeTenantOrgUnitId: orgUnitId,
    });
  }

  function canRunWorkflowAction(action: ManualLRWorkflowAction, configOverride?: TenantLRConfig | null) {
    const config = configOverride ?? activeConfig;
    if (!config || !currentRole) {
      return false;
    }
    const allowedRoles = effectiveWorkflowPermissions[action] ?? [];
    const allowedByWorkflow = !allowedRoles.length || allowedRoles.includes(currentRole.id);
    const pagePermission = actionToPagePermission[action];
    const hasWorkspaceAccess = access.canViewPage("LR_DASHBOARD");
    const allowedByPageAction =
      access.canViewPage(pagePermission.pageCode) &&
      access.getActionsForPage(pagePermission.pageCode).includes(pagePermission.action as never);
    const governedByConfig = resolveGovernedWorkflowAction({
      action,
      currentLevelGovernanceRule,
      managedChildGovernanceRule,
      // Tenant root is either no assigned level OR the active place being the
      // top of the hierarchy (Company Root has no parent). This lets a Company
      // Root / CEO user generate/consume directly. Region/Branch users (whose
      // active place has a parent) are unaffected.
      isTenantRoot: !assignedLevel || Boolean(activeOrgUnit && !activeOrgUnit.parentOrgUnitId),
    });
    const allowedByGovernance = governedByConfig ?? allowedByWorkflow;
    return allowedByGovernance && (allowedByPageAction || hasWorkspaceAccess);
  }

  const consumablePoolContext = describeManualLrConsumablePools({
    availableActiveOrgUnits,
    activeOrgUnitId: activeOrgUnit?.id ?? null,
    config: activeConfig,
  });

  return {
    access,
    activeConfig,
    currentUser,
    currentRole,
    assignedLevel,
    hierarchyLevelMap,
    assignedOrgUnits,
    availableActiveOrgUnits,
    activeOrgUnit,
    managedLevelId,
    currentLevelGovernanceRule,
    managedChildGovernanceRule,
    effectiveWorkflowPermissions,
    consumablePoolContext,
    setActiveOrgUnit,
    canRunWorkflowAction,
  };
}

function resolveGovernedWorkflowAction(params: {
  action: ManualLRWorkflowAction;
  currentLevelGovernanceRule: NonNullable<TenantLRConfig["childGovernanceRules"]>[number] | null;
  managedChildGovernanceRule: NonNullable<TenantLRConfig["childGovernanceRules"]>[number] | null;
  isTenantRoot: boolean;
}) {
  const { action, currentLevelGovernanceRule, managedChildGovernanceRule, isTenantRoot } = params;
  if (action === "UPLOAD_LR") {
    return managedChildGovernanceRule?.parentCanGenerateLr ?? (isTenantRoot ? true : null);
  }
  if (action === "ALLOCATE_LR") {
    return managedChildGovernanceRule?.parentCanAllocateLrToChild ?? (isTenantRoot ? true : null);
  }
  if (action === "APPROVE_LR") {
    return managedChildGovernanceRule?.canApproveChildRequests ?? (isTenantRoot ? true : null);
  }
  if (action === "REQUEST_LR") {
    return currentLevelGovernanceRule?.childCanRequestLr ?? null;
  }
  if (action === "CONSUME_LR") {
    return currentLevelGovernanceRule?.childCanConsumeLr ?? (isTenantRoot ? true : null);
  }
  return null;
}
