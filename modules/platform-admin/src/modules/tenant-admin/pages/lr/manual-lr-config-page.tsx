import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/components/common/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import {
  TenantEmptyState,
  TenantPanel,
} from "@/modules/tenant-admin/components/tenant-primitives";
import { useSessionContext } from "@/shared/auth/session-context";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { useTenantLRConfigs } from "@/modules/tenant-admin/hooks/useTenantMasterData";
import { useTenantOrgTypes } from "@/modules/tenant-admin/hooks/useTenantOrgTypes";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import {
  buildManualLrConfigInput,
  buildManualLrPreview,
  ensureManualWorkflowPermissions,
  normalizeManualWorkflowScopes,
} from "@/modules/tenant-admin/lib/manual-lr";
import { useAppStore } from "@/shared/store/useAppStore";
import type {
  ManualLRCustomerPolicy,
  ManualLRChildFormatMode,
  ManualLRDistributionStrategy,
  ManualLRNumberingPolicy,
  ManualLRWorkflowPermissionScope,
  ManualLRWorkflowMode,
  ManualLRWorkflowPermissions,
} from "@/types/master-data";

type ManualConfigForm = {
  scopeType: "TENANT" | "HIERARCHY";
  ownershipLevelId: string;
  prefix: string;
  yearFormat: "NONE" | "YY" | "YYYY";
  numberSeparator: string;
  zeroPaddingLength: number;
  distributionStrategy: ManualLRDistributionStrategy;
  workflowMode: ManualLRWorkflowMode;
  numberingPolicy: ManualLRNumberingPolicy;
  customerLrPolicy: ManualLRCustomerPolicy;
  allowCustomerFallback: boolean;
  workflowPermissions: ManualLRWorkflowPermissions;
  workflowPermissionScopes: ManualLRWorkflowPermissionScope[];
  childGovernanceRules: Array<{
    childLevelId: string;
    canConsumeParentLr: boolean;
    childCanRequestLr: boolean;
    childCanConsumeLr: boolean;
    canMaintainOwnSequence: boolean;
    canDefineChildFormat: boolean;
    parentCanGenerateLr: boolean;
    parentCanAllocateLrToChild: boolean;
    canAllocateChildLr: boolean;
    canApproveChildRequests: boolean;
    canConfigureChildWorkflow: boolean;
    canDelegateChildGovernance: boolean;
    inheritParentFormat: boolean;
    formatMode: ManualLRChildFormatMode;
    allocationRequired: boolean;
    approvalRequired: boolean;
    canTransferLr: boolean;
  }>;
  placeFormatOverrides: Array<{
    orgUnitId: string;
    prefix: string;
    yearFormat: "NONE" | "YY" | "YYYY";
    numberSeparator: string;
    zeroPaddingLength: number;
    numberingPolicy: ManualLRNumberingPolicy;
  }>;
  status: "active" | "inactive";
  guidanceNote: string;
};

export function TenantManualLRConfigPage() {
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
  const access = useTenantAccess();
  const { data: users } = useTenantUsers(tenant.id);
  const { data: hierarchyLevels } = useTenantOrgTypes(tenant.id);
  // Operational hierarchy is owned by the tenant. The first level the
  // Tenant Admin defined (e.g. "Central", "Region") is the LR root authority.
  // There is no synthetic "Tenant / Company Level" above it.
  const orderedLevels = useMemo(
    () => [...hierarchyLevels].sort((a, b) => a.order - b.order),
    [hierarchyLevels],
  );
  const tenantRootLevelName = orderedLevels[0]?.name ?? "Root level";
  const { data: orgUnits } = useTenantOrgUnits(tenant.id);
  const { data: lrConfigs, createLRConfig, updateLRConfig } = useTenantLRConfigs(tenant.id);
  const store = useAppStore(tenant.id);
  const [message, setMessage] = useState("");

  const manualConfig =
    lrConfigs.find((config) => config.lrType === "MANUAL" && config.status === "active") ??
    lrConfigs.find((config) => config.lrType === "MANUAL") ??
    null;
  const hierarchyLevelMap = useMemo(
    () => new Map(hierarchyLevels.map((level) => [level.id, level])),
    [hierarchyLevels],
  );
  const orgUnitMap = useMemo(
    () => new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit])),
    [orgUnits],
  );
  const currentUser = useMemo(
    () => users.find((user) => user.name === session.actorName || user.email === session.actorName) ?? null,
    [session.actorName, users],
  );
  const activeGovernanceOrgUnit = useMemo(() => {
    if (!currentUser?.orgUnitIds?.length) {
      return null;
    }
    return (
      orgUnits.find((orgUnit) => orgUnit.id === session.activeTenantOrgUnitId && currentUser.orgUnitIds.includes(orgUnit.id)) ??
      orgUnits.find((orgUnit) => currentUser.orgUnitIds.includes(orgUnit.id)) ??
      null
    );
  }, [currentUser?.orgUnitIds, orgUnits, session.activeTenantOrgUnitId]);
  const currentGovernanceLevel = activeGovernanceOrgUnit
    ? hierarchyLevelMap.get(activeGovernanceOrgUnit.hierarchyLevelId) ?? null
    : null;
  const currentLevelOriginRuleFromConfig =
    currentGovernanceLevel
      ? manualConfig?.childGovernanceRules?.find((rule) => rule.childLevelId === currentGovernanceLevel.id) ?? null
      : null;
  const canConfigureImmediateChildFromParent =
    !currentGovernanceLevel || currentLevelOriginRuleFromConfig?.canDelegateChildGovernance !== false;
  const availableTargetLevels = useMemo(() => {
    const sortedActiveLevels = hierarchyLevels.filter((level) => level.active).sort((a, b) => a.order - b.order);
    if (!sortedActiveLevels.length) {
      return [];
    }
    const authorityOrder = currentGovernanceLevel?.order ?? sortedActiveLevels[0]?.order ?? 0;
    return sortedActiveLevels.filter((level) => level.order > authorityOrder);
  }, [currentGovernanceLevel, hierarchyLevels]);
  const visibleTargetLevel = availableTargetLevels[0] ?? null;
  const canEdit = access.can("LR_CONFIG", "EDIT") || access.can("LR_CONFIG", "CREATE");
  const [form, setForm] = useState<ManualConfigForm>(() => buildFormState(manualConfig));
  useEffect(() => {
    setForm(buildFormState(manualConfig));
  }, [manualConfig]);
  useEffect(() => {
    if (form.scopeType !== "HIERARCHY" || form.ownershipLevelId) {
      return;
    }
    const levelWithOrgUnits =
      availableTargetLevels.find((level) =>
        orgUnits.some((orgUnit) => orgUnit.hierarchyLevelId === level.id),
      ) ?? availableTargetLevels[0] ?? null;
    if (!levelWithOrgUnits) {
      return;
    }
    setForm((current) =>
      current.scopeType === "HIERARCHY" && !current.ownershipLevelId
        ? { ...current, ownershipLevelId: levelWithOrgUnits.id }
        : current,
    );
  }, [availableTargetLevels, form.ownershipLevelId, form.scopeType, orgUnits]);
  const inheritedDistributionLevel =
    form.scopeType === "HIERARCHY" && form.ownershipLevelId
      ? hierarchyLevels.find((item) => item.id === form.ownershipLevelId) ?? null
      : null;
  const managedTargetLevel =
    form.scopeType === "HIERARCHY"
      ? (inheritedDistributionLevel ?? visibleTargetLevel ?? null)
      : null;
  const managedTargetLevelId = managedTargetLevel?.id ?? "";
  const managedRuleLevelId = form.scopeType === "HIERARCHY" ? managedTargetLevelId : "";
  const childCanConfigureNextLevel = useMemo(() => {
    if (!managedTargetLevel) {
      return null;
    }
    return (
      hierarchyLevels
        .filter((level) => level.active && level.order > managedTargetLevel.order)
        .sort((a, b) => a.order - b.order)[0] ?? null
    );
  }, [hierarchyLevels, managedTargetLevel]);
  useEffect(() => {
    setForm((current) => {
      const managedLevelId =
        current.scopeType === "HIERARCHY"
          ? managedRuleLevelId || current.ownershipLevelId
          : "";
      if (!managedLevelId) {
        return current.childGovernanceRules.length
          ? { ...current, childGovernanceRules: [] }
          : current;
      }
      const existingRule = current.childGovernanceRules.find((rule) => rule.childLevelId === managedLevelId);
      const nextRule = existingRule ?? {
        childLevelId: managedLevelId,
        canConsumeParentLr: current.distributionStrategy === "CENTRALIZED",
        childCanRequestLr: current.workflowMode === "APPROVAL_BASED",
        childCanConsumeLr: true,
        canMaintainOwnSequence: false,
        canDefineChildFormat: false,
        parentCanGenerateLr: true,
        parentCanAllocateLrToChild: current.distributionStrategy !== "CENTRALIZED",
        canAllocateChildLr: current.distributionStrategy !== "CENTRALIZED",
        canApproveChildRequests: current.workflowMode === "APPROVAL_BASED",
        canConfigureChildWorkflow: false,
        canDelegateChildGovernance: false,
        inheritParentFormat: true,
        formatMode: "GLOBAL_PARENT_FORMAT" as const,
        allocationRequired: current.distributionStrategy !== "CENTRALIZED",
        approvalRequired: current.workflowMode === "APPROVAL_BASED",
        canTransferLr: current.workflowMode !== "DIRECT_USAGE",
      };
      const nextRules = [
        ...current.childGovernanceRules.filter((rule) => rule.childLevelId !== managedLevelId),
        nextRule,
      ];
      return JSON.stringify(nextRules) === JSON.stringify(current.childGovernanceRules)
        ? current
        : { ...current, childGovernanceRules: nextRules };
    });
  }, [form.scopeType, form.ownershipLevelId, form.distributionStrategy, form.workflowMode, managedRuleLevelId]);
  const ownershipOrgUnits = useMemo(
    () =>
      form.scopeType === "HIERARCHY" && managedTargetLevelId
        ? orgUnits.filter((unit) =>
            unit.hierarchyLevelId === managedTargetLevelId &&
            (activeGovernanceOrgUnit ? unit.parentOrgUnitId === activeGovernanceOrgUnit.id : true),
          )
        : [],
    [activeGovernanceOrgUnit, form.scopeType, managedTargetLevelId, orgUnits],
  );
  const distributionTargetLabel =
    form.scopeType === "TENANT"
      ? `${tenantRootLevelName} only`
      : managedTargetLevel?.name ?? inheritedDistributionLevel?.name ?? "Not selected";
  const managedChildRule =
    form.childGovernanceRules.find((rule) => rule.childLevelId === managedRuleLevelId) ?? null;
  const currentLevelOriginRule =
    currentGovernanceLevel
      ? form.childGovernanceRules.find((rule) => rule.childLevelId === currentGovernanceLevel.id) ?? null
      : null;
  const currentLevelLabel = currentGovernanceLevel?.name ?? tenantRootLevelName;
  const childLevelLabel = managedTargetLevel?.name ?? "Child level";
  const userScopedLevels = useMemo(() => {
    const authorityOrder = currentGovernanceLevel?.order ?? orderedLevels[0]?.order ?? 0;
    return orderedLevels.filter((level) => level.order >= authorityOrder);
  }, [currentGovernanceLevel, orderedLevels]);
  const currentScopeLabel = activeGovernanceOrgUnit
    ? `${activeGovernanceOrgUnit.name} (${currentLevelLabel})`
    : tenantRootLevelName;
  const currentAuthorityMode = resolveCurrentAuthorityMode(currentLevelOriginRule, currentGovernanceLevel);
  const currentAuthorityFormat = useMemo(
    () =>
      getCurrentAuthorityFormat({
        form,
        activeGovernanceOrgUnit,
        currentLevelOriginRule,
        currentAuthorityMode,
      }),
    [activeGovernanceOrgUnit, currentAuthorityMode, currentLevelOriginRule, form],
  );
  const currentAuthorityPreview = buildManualLrPreview(currentAuthorityFormat);
  const allowedFormatModes = useMemo(
    () => getAllowedChildFormatModes(currentAuthorityMode),
    [currentAuthorityMode],
  );
  const childStrategyCards = useMemo(
    () =>
      buildChildStrategyCards({
        childLevelLabel,
        currentAuthorityMode,
      }),
    [childLevelLabel, currentAuthorityMode],
  );
  const currentLevelActions = useMemo(
    () =>
      buildCurrentLevelManagementActions({
        currentGovernanceLevel,
        managedChildRule,
        currentLevelOriginRule,
      }),
    [currentGovernanceLevel, currentLevelOriginRule, managedChildRule],
  );
  const childLevelActions = useMemo(
    () =>
      buildChildLevelManagementActions({
        childCanConfigureNextLevel,
        managedChildRule,
      }),
    [childCanConfigureNextLevel, managedChildRule],
  );
  const configPools = useMemo(
    () => store.lrPools.filter((pool) => pool.configId === manualConfig?.id),
    [manualConfig?.id, store.lrPools],
  );
  const currentLevelPoolRows = useMemo(
    () =>
      buildLevelPoolRows({
        pools: configPools,
        orgUnitMap,
        levelUnits:
          activeGovernanceOrgUnit
            ? [activeGovernanceOrgUnit]
            : [{ id: null, name: "Tenant Pool" }],
      }),
    [activeGovernanceOrgUnit, configPools, orgUnitMap],
  );
  const childLevelPoolRows = useMemo(
    () =>
      buildLevelPoolRows({
        pools: configPools,
        orgUnitMap,
        levelUnits: ownershipOrgUnits,
      }),
    [configPools, orgUnitMap, ownershipOrgUnits],
  );
  const childPendingRequests = useMemo(() => {
    const childUnitIds = new Set(ownershipOrgUnits.map((unit) => unit.id));
    return store.lrRequests
      .filter(
        (request) =>
          request.configId === manualConfig?.id &&
          request.status === "PENDING" &&
          ((request.sourceOrgUnitId && childUnitIds.has(request.sourceOrgUnitId)) ||
            (request.targetOrgUnitId && childUnitIds.has(request.targetOrgUnitId))),
      )
      .slice(0, 5);
  }, [manualConfig?.id, ownershipOrgUnits, store.lrRequests]);
  const inheritanceBreakLocked = currentAuthorityMode !== "ROOT";
  const finalPreviewRows = useMemo(
    () =>
      buildFinalPreviewRows({
        currentScopeLabel,
        childLevelLabel,
        childUnits: ownershipOrgUnits,
        currentAuthorityFormat,
        managedChildRule,
        placeFormatOverrides: form.placeFormatOverrides,
      }),
    [childLevelLabel, currentAuthorityFormat, currentScopeLabel, form.placeFormatOverrides, managedChildRule, ownershipOrgUnits],
  );
  useEffect(() => {
    if (!managedChildRule || allowedFormatModes.includes(managedChildRule.formatMode)) {
      return;
    }
    updateManagedChildRule(setForm, managedChildRule.childLevelId, {
      formatMode: allowedFormatModes[0],
      canDefineChildFormat: allowedFormatModes[0] !== "GLOBAL_PARENT_FORMAT",
      inheritParentFormat: allowedFormatModes[0] !== "FULL_CHILD_FORMAT",
    });
  }, [allowedFormatModes, managedChildRule]);
  useEffect(() => {
    if (!managedChildRule || childCanConfigureNextLevel || !managedChildRule.canDelegateChildGovernance) {
      return;
    }
    updateManagedChildRule(setForm, managedChildRule.childLevelId, {
      canDelegateChildGovernance: false,
    });
  }, [childCanConfigureNextLevel, managedChildRule]);

  function saveConfig() {
    if (!form.prefix.trim()) {
      setMessage("Enter the manual LR prefix.");
      return;
    }
    if (!form.ownershipLevelId && form.scopeType === "HIERARCHY") {
      setMessage("Select the ownership level that owns the manual LR inventory.");
      return;
    }

    const payload = {
      ...buildManualLrConfigInput(manualConfig),
      scopeType: form.scopeType,
      ownershipLevelId:
        form.scopeType === "HIERARCHY"
          ? currentGovernanceLevel
            ? manualConfig?.ownershipLevelId ?? form.ownershipLevelId
            : form.ownershipLevelId
          : null,
      prefix: form.prefix.trim().toUpperCase(),
      yearFormat: form.yearFormat,
      numberSeparator: form.numberSeparator,
      zeroPaddingLength: form.zeroPaddingLength,
      distributionStrategy: form.distributionStrategy,
      workflowMode: form.workflowMode,
      numberingPolicy: form.numberingPolicy,
      customerLrPolicy: form.customerLrPolicy,
      allowCustomerFallback: form.allowCustomerFallback,
      workflowPermissions: form.workflowPermissions,
      workflowPermissionScopes: form.workflowPermissionScopes,
      childGovernanceRules: form.childGovernanceRules,
      placeFormatOverrides: form.placeFormatOverrides,
      status: form.status,
      poolEntries: manualConfig?.poolEntries ?? "",
      poolRangeStart: manualConfig?.poolRangeStart ?? "",
      poolRangeEnd: manualConfig?.poolRangeEnd ?? "",
      scopeOrgUnitIds: [],
      locationOrgUnitId: "",
    };

    try {
      if (manualConfig) {
        updateLRConfig(manualConfig.id, payload);
        setMessage("Manual LR configuration updated.");
      } else {
        createLRConfig(payload);
        setMessage("Manual LR configuration created.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Manual LR configuration could not be saved.");
    }
  }

  function updatePlaceOverride(
    orgUnitId: string,
    field: "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength" | "numberingPolicy",
    value: string | number,
  ) {
    setForm((current) => ({
      ...current,
      placeFormatOverrides: upsertPlaceFormatOverride({
        overrides: current.placeFormatOverrides,
        orgUnitId,
        baseFormat:
          currentAuthorityMode === "INDEPENDENT" && activeGovernanceOrgUnit
            ? current.placeFormatOverrides.find((item) => item.orgUnitId === activeGovernanceOrgUnit.id) ?? {
                orgUnitId: activeGovernanceOrgUnit.id,
                prefix: current.prefix,
                yearFormat: current.yearFormat,
                numberSeparator: current.numberSeparator,
                zeroPaddingLength: current.zeroPaddingLength,
                numberingPolicy: current.numberingPolicy,
              }
            : {
                orgUnitId: "ROOT",
                prefix: current.prefix,
                yearFormat: current.yearFormat,
                numberSeparator: current.numberSeparator,
                zeroPaddingLength: current.zeroPaddingLength,
                numberingPolicy: current.numberingPolicy,
              },
        patch: { [field]: value },
      }),
    }));
  }

  function buildPrefixValueForMode(orgUnitName: string, rawValue: string, mode: ManualLRChildFormatMode) {
    const cleaned = rawValue.trim().toUpperCase();
    if (mode === "PARENT_PREFIX_CHILD_SUFFIX") {
      return sanitizeChildCode(cleaned) || sanitizeChildCode(orgUnitName);
    }
    if (mode === "FULL_CHILD_FORMAT") {
      return cleaned || orgUnitName.trim().toUpperCase().replace(/\s+/g, "-");
    }
    return currentAuthorityFormat.prefix;
  }

  function extractDisplayedPrefix(overridePrefix: string, mode: ManualLRChildFormatMode) {
    if (mode !== "PARENT_PREFIX_CHILD_SUFFIX") {
      return overridePrefix;
    }
    return normalizeStoredChildCode(overridePrefix, currentAuthorityFormat.prefix, currentAuthorityFormat.numberSeparator);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Manual LR Configuration"
        description="Format flow and hierarchy delegation."
        action={
          <Button onClick={saveConfig} disabled={!canEdit}>
            Save Manual LR Config
          </Button>
        }
      />

      {message ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {message}
        </div>
      ) : null}

      <TenantPanel title="LR Format Setup" description="">
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <CompactInfoCard label="Root" value={currentLevelLabel} />
              <CompactInfoCard label="Workspace" value={currentScopeLabel} tone="sky" />
              <CompactInfoCard label="Preview" value={currentAuthorityPreview} mono />
            </div>
            {currentGovernanceLevel && currentGovernanceLevel.order > (orderedLevels[0]?.order ?? 0) ? (
              <CompactInfoCard
                label="Inherited From"
                value={orderedLevels[0]?.name ?? "Root"}
              />
            ) : null}
            <div className="grid gap-2 sm:grid-cols-[1.1fr_0.9fr]">
              <Field label="Distribute Up To">
                <Select
                  value={form.scopeType === "TENANT" ? "TENANT" : managedTargetLevelId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      scopeType: event.target.value === "TENANT" ? "TENANT" : "HIERARCHY",
                      ownershipLevelId: event.target.value === "TENANT" ? "" : event.target.value,
                    }))
                  }
                  disabled={!canEdit}
                >
                  <option value="TENANT">{currentLevelLabel} only</option>
                  {availableTargetLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      Up to {level.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <CompactInfoCard
                label="Flow"
                value={buildLrFlowLabel(
                  userScopedLevels,
                  form.scopeType === "TENANT" ? "" : managedTargetLevelId,
                  currentLevelLabel,
                )}
              />
            </div>
            {currentGovernanceLevel && !canConfigureImmediateChildFromParent ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                Parent set this level as consume only for lower-level LR.
              </div>
            ) : null}
            {form.scopeType !== "HIERARCHY" || !managedChildRule ? (
              <div className="rounded-xl border border-dashed bg-slate-50/80 px-3 py-3 text-sm text-muted-foreground">
                {currentGovernanceLevel && !canConfigureImmediateChildFromParent
                  ? "Lower-level LR configuration is not allowed from parent."
                  : "No child level selected."}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <StatusPill>{describeAuthorityMode(currentAuthorityMode)}</StatusPill>
                  <StatusPill>Child: {childLevelLabel}</StatusPill>
                  <StatusPill>Break: {managedChildRule.formatMode === "FULL_CHILD_FORMAT" ? "Yes" : "No"}</StatusPill>
                  {!canEditCurrentAuthorityFormat(currentAuthorityMode) ? <StatusPill>Locked</StatusPill> : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border bg-white px-3 py-3">
                    <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{currentLevelLabel} can do</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ActionToggleButton
                        label={`${currentLevelLabel} request`}
                        active={currentLevelOriginRule?.childCanRequestLr ?? false}
                        disabled
                        onClick={() => undefined}
                      />
                      <ActionToggleButton
                        label={`${currentLevelLabel} consume`}
                        active={currentLevelOriginRule?.childCanConsumeLr ?? !currentGovernanceLevel}
                        disabled
                        onClick={() => undefined}
                      />
                      <ActionToggleButton
                        label={`${currentLevelLabel} generate`}
                        active={managedChildRule.parentCanGenerateLr}
                        disabled={!canEdit}
                        onClick={() =>
                          updateManagedChildRule(setForm, managedChildRule.childLevelId, {
                            parentCanGenerateLr: !managedChildRule.parentCanGenerateLr,
                          })
                        }
                      />
                      <ActionToggleButton
                        label={`${currentLevelLabel} allocate`}
                        active={managedChildRule.parentCanAllocateLrToChild}
                        disabled={!canEdit}
                        onClick={() =>
                          updateManagedChildRule(setForm, managedChildRule.childLevelId, {
                            parentCanAllocateLrToChild: !managedChildRule.parentCanAllocateLrToChild,
                          })
                        }
                      />
                      <ActionToggleButton
                        label={`${currentLevelLabel} approve`}
                        active={managedChildRule.canApproveChildRequests}
                        disabled={!canEdit}
                        onClick={() =>
                          updateManagedChildRule(setForm, managedChildRule.childLevelId, {
                            canApproveChildRequests: !managedChildRule.canApproveChildRequests,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border bg-white px-3 py-3">
                    <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{childLevelLabel} can do</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ActionToggleButton
                        label={`${childLevelLabel} request`}
                        active={managedChildRule.childCanRequestLr}
                        disabled={!canEdit}
                        onClick={() =>
                          updateManagedChildRule(setForm, managedChildRule.childLevelId, {
                            childCanRequestLr: !managedChildRule.childCanRequestLr,
                          })
                        }
                      />
                      <ActionToggleButton
                        label={`${childLevelLabel} consume`}
                        active={managedChildRule.childCanConsumeLr}
                        disabled={!canEdit}
                        onClick={() =>
                          updateManagedChildRule(setForm, managedChildRule.childLevelId, {
                            childCanConsumeLr: !managedChildRule.childCanConsumeLr,
                            canConsumeParentLr: !managedChildRule.childCanConsumeLr,
                          })
                        }
                      />
                      <ActionToggleButton
                        label={`${childLevelLabel} configure next level`}
                        active={managedChildRule.canDelegateChildGovernance}
                        disabled={!canEdit || !childCanConfigureNextLevel}
                        onClick={() =>
                          updateManagedChildRule(setForm, managedChildRule.childLevelId, {
                            canDelegateChildGovernance: !managedChildRule.canDelegateChildGovernance,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border bg-white px-3 py-2">
                  <div className="grid gap-2 sm:grid-cols-[1.2fr_0.8fr] sm:items-end">
                    <div className="text-xs text-slate-700">
                      Standard LR flow for {childLevelLabel}
                    </div>
                    <Field label={`${currentLevelLabel} -> ${childLevelLabel}`}>
                      <Select
                        value={resolveStandardFlowValue(managedChildRule)}
                        onChange={(event) =>
                          applyStandardFlow(
                            setForm,
                            managedChildRule.childLevelId,
                            event.target.value as "DIRECT_CONSUME" | "REQUEST_ALLOCATE" | "REQUEST_APPROVE_ALLOCATE",
                          )
                        }
                        disabled={!canEdit}
                      >
                        <option value="DIRECT_CONSUME">Parent generate + child consume</option>
                        <option value="REQUEST_ALLOCATE">Child request + parent allocate + child consume</option>
                        <option value="REQUEST_APPROVE_ALLOCATE">Child request + parent approve + allocate + child consume</option>
                      </Select>
                    </Field>
                  </div>
                </div>
                <div className="rounded-xl border bg-white px-3 py-2">
                  {childCanConfigureNextLevel ? (
                    <div className="grid gap-2 sm:grid-cols-[1.2fr_0.8fr] sm:items-end">
                      <div className="text-xs text-slate-700">
                        Allow {childLevelLabel} to configure LR for {childCanConfigureNextLevel.name}?
                      </div>
                      <Field label={`${childLevelLabel} -> ${childCanConfigureNextLevel.name}`}>
                        <Select
                          value={managedChildRule.canDelegateChildGovernance ? "YES" : "NO"}
                          onChange={(event) =>
                            updateManagedChildRule(setForm, managedChildRule.childLevelId, {
                              canDelegateChildGovernance: event.target.value === "YES",
                            })
                          }
                          disabled={!canEdit}
                        >
                          <option value="NO">No, consume only</option>
                          <option value="YES">Yes, can configure</option>
                        </Select>
                      </Field>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-700">
                      {childLevelLabel} has no lower level. It can consume LR only.
                    </div>
                  )}
                </div>
                {currentAuthorityMode === "INDEPENDENT" ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Separate child format is locked. {childLevelLabel} can only use parent format or parent prefix + child code.
                  </div>
                ) : null}
                <div className="grid gap-2 md:grid-cols-3">
                  {childStrategyCards.map((card) => (
                    <FormatStrategyCard
                      key={card.mode}
                      title={card.title}
                      description={card.description}
                      example={card.example}
                      checked={managedChildRule.formatMode === card.mode}
                      disabled={!canEdit}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          childGovernanceRules: current.childGovernanceRules.map((rule) =>
                            rule.childLevelId === managedChildRule.childLevelId
                              ? {
                                  ...rule,
                                  formatMode: card.mode,
                                  canDefineChildFormat: card.mode !== "GLOBAL_PARENT_FORMAT",
                                  inheritParentFormat: card.mode !== "FULL_CHILD_FORMAT",
                                }
                              : rule,
                          ),
                          placeFormatOverrides:
                            card.mode === "GLOBAL_PARENT_FORMAT"
                              ? current.placeFormatOverrides.filter(
                                  (override) => !ownershipOrgUnits.some((unit) => unit.id === override.orgUnitId),
                                )
                              : current.placeFormatOverrides,
                        }))
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          {managedChildRule?.formatMode === "FULL_CHILD_FORMAT" ? (
            <div className="rounded-xl border bg-slate-50/80 p-3 text-sm text-slate-700">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <Settings2 className="size-4" />
                Child Own Format
              </div>
              <div>Parent format is not used for child places in this strategy.</div>
            </div>
          ) : (
            <div className="rounded-xl border bg-slate-50/80 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Settings2 className="size-4" />
                Parent Format
              </div>
              <div className="grid gap-2">
                <Field label="Prefix">
                  <Input
                    value={currentAuthorityFormat.prefix}
                    onChange={(event) => updateCurrentAuthorityFormat(setForm, currentAuthorityMode, activeGovernanceOrgUnit?.id ?? null, "prefix", event.target.value)}
                    disabled={!canEdit || !canEditCurrentAuthorityFormat(currentAuthorityMode)}
                  />
                </Field>
                <div className="grid gap-2 grid-cols-3">
                  <Field label="Year">
                    <Select
                      value={currentAuthorityFormat.yearFormat}
                      onChange={(event) =>
                        updateCurrentAuthorityFormat(setForm, currentAuthorityMode, activeGovernanceOrgUnit?.id ?? null, "yearFormat", event.target.value)
                      }
                      disabled={!canEdit || !canEditCurrentAuthorityFormat(currentAuthorityMode)}
                    >
                      <option value="NONE">None</option>
                      <option value="YYYY">YYYY</option>
                      <option value="YY">YY</option>
                    </Select>
                  </Field>
                  <Field label="Sep">
                    <Input
                      value={currentAuthorityFormat.numberSeparator}
                      onChange={(event) =>
                        updateCurrentAuthorityFormat(setForm, currentAuthorityMode, activeGovernanceOrgUnit?.id ?? null, "numberSeparator", event.target.value || "-")
                      }
                      disabled={!canEdit || !canEditCurrentAuthorityFormat(currentAuthorityMode)}
                    />
                  </Field>
                  <Field label="Pad">
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={String(currentAuthorityFormat.zeroPaddingLength)}
                      onChange={(event) =>
                        updateCurrentAuthorityFormat(
                          setForm,
                          currentAuthorityMode,
                          activeGovernanceOrgUnit?.id ?? null,
                          "zeroPaddingLength",
                          Math.max(1, Number(event.target.value || 1)),
                        )
                      }
                      disabled={!canEdit || !canEditCurrentAuthorityFormat(currentAuthorityMode)}
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}
        </div>
      </TenantPanel>

      <TenantPanel title="Place Configuration" description="">
        {form.scopeType !== "HIERARCHY" || !managedChildRule ? (
          <div className="rounded-xl border border-dashed bg-slate-50/80 px-3 py-3 text-sm text-muted-foreground">
            No child level selected.
          </div>
        ) : managedChildRule.formatMode === "GLOBAL_PARENT_FORMAT" ? (
          <div className="rounded-xl border border-dashed bg-slate-50/80 px-3 py-3 text-sm text-muted-foreground">
            All {childLevelLabel} places use <span className="font-mono text-slate-900">{currentAuthorityPreview}</span>
          </div>
        ) : !ownershipOrgUnits.length ? (
          <div className="rounded-xl border border-dashed bg-slate-50/80 px-3 py-3 text-sm text-muted-foreground">
            No org units found.
          </div>
        ) : (
          <>
            <div className={`hidden md:grid gap-2 px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground ${managedChildRule.formatMode === "FULL_CHILD_FORMAT" ? "md:grid-cols-[160px_1fr_90px_70px_70px_120px]" : "md:grid-cols-[160px_1fr_90px_70px_70px_160px]"}`}>
              <div>Place</div>
              <div>{managedChildRule.formatMode === "PARENT_PREFIX_CHILD_SUFFIX" ? "Code" : "Prefix"}</div>
              <div>Year</div>
              <div>Sep</div>
              <div>Pad</div>
              <div>{managedChildRule.formatMode === "FULL_CHILD_FORMAT" ? "Policy" : "Preview"}</div>
            </div>
            <div className="space-y-2">
              {ownershipOrgUnits.map((orgUnit) => {
                const override = getPlaceOverrideForDisplay({
                  overrides: form.placeFormatOverrides,
                  orgUnitId: orgUnit.id,
                  fallback: currentAuthorityFormat,
                  formatMode: managedChildRule.formatMode,
                  orgUnitName: orgUnit.name,
                });
                return (
                  <div
                    key={orgUnit.id}
                    className={`rounded-xl border bg-white p-3 grid gap-2 ${managedChildRule.formatMode === "FULL_CHILD_FORMAT" ? "md:grid-cols-[160px_1fr_90px_70px_70px_120px]" : "md:grid-cols-[160px_1fr_90px_70px_70px_160px]"} md:items-end`}
                  >
                    <div className="text-sm font-semibold text-slate-950">{orgUnit.name}</div>
                    <Field label={managedChildRule.formatMode === "PARENT_PREFIX_CHILD_SUFFIX" ? "Code" : "Prefix"}>
                      <Input
                        value={extractDisplayedPrefix(override.prefix, managedChildRule.formatMode)}
                        onChange={(event) =>
                          updatePlaceOverride(
                            orgUnit.id,
                            "prefix",
                            buildPrefixValueForMode(orgUnit.name, event.target.value, managedChildRule.formatMode),
                          )
                        }
                        disabled={!canEdit}
                      />
                    </Field>
                    <Field label="Year">
                      <Select
                        value={override.yearFormat}
                        onChange={(event) => updatePlaceOverride(orgUnit.id, "yearFormat", event.target.value)}
                        disabled={!canEdit || managedChildRule.formatMode === "PARENT_PREFIX_CHILD_SUFFIX"}
                      >
                        <option value="NONE">None</option>
                        <option value="YYYY">YYYY</option>
                        <option value="YY">YY</option>
                      </Select>
                    </Field>
                    <Field label="Sep">
                      <Input
                        value={override.numberSeparator}
                        onChange={(event) => updatePlaceOverride(orgUnit.id, "numberSeparator", event.target.value || "-")}
                        disabled={!canEdit || managedChildRule.formatMode === "PARENT_PREFIX_CHILD_SUFFIX"}
                      />
                    </Field>
                    <Field label="Pad">
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={String(override.zeroPaddingLength)}
                        onChange={(event) => updatePlaceOverride(orgUnit.id, "zeroPaddingLength", Math.max(1, Number(event.target.value || 1)))}
                        disabled={!canEdit || managedChildRule.formatMode === "PARENT_PREFIX_CHILD_SUFFIX"}
                      />
                    </Field>
                    {managedChildRule.formatMode === "FULL_CHILD_FORMAT" ? (
                      <Field label="Policy">
                        <Select
                          value={override.numberingPolicy}
                          onChange={(event) => updatePlaceOverride(orgUnit.id, "numberingPolicy", event.target.value)}
                          disabled={!canEdit}
                        >
                          <option value="STRICT_FORMAT">STRICT_FORMAT</option>
                          <option value="FLEXIBLE_PHYSICAL_BOOK">FLEXIBLE_PHYSICAL_BOOK</option>
                        </Select>
                      </Field>
                    ) : (
                      <div className="text-xs font-mono text-muted-foreground md:pb-2">{buildManualLrPreview(override)}</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {finalPreviewRows.map((row) => (
                <div key={row.label} className="rounded-xl border bg-slate-50/70 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{row.label}</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-slate-950">{row.preview}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </TenantPanel>

      <TenantPanel title="Management" description="">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-700">Only current level and immediate child level are shown here.</div>
            <Button asChild variant="outline" size="sm">
              <Link to={`/tenant/${tenant.id}/lr`}>Open LR Management</Link>
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border bg-white px-3 py-3">
              <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{currentLevelLabel} management</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {currentLevelActions.length ? currentLevelActions.map((action) => (
                  <StatusPill key={action}>{action}</StatusPill>
                )) : <span className="text-sm text-muted-foreground">No management actions selected.</span>}
              </div>
              {currentLevelActions.includes("Consume LR") ? (
                <CompactManagementTable
                  title={`${currentLevelLabel} LR numbers`}
                  emptyLabel="No LR numbers available at this level."
                  rows={currentLevelPoolRows}
                />
              ) : null}
            </div>
            <div className="rounded-xl border bg-white px-3 py-3">
              <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{childLevelLabel} management</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {childLevelActions.length ? childLevelActions.map((action) => (
                  <StatusPill key={action}>{action}</StatusPill>
                )) : <span className="text-sm text-muted-foreground">No child actions selected.</span>}
              </div>
              {childLevelActions.includes("Consume LR") ? (
                <CompactManagementTable
                  title={`${childLevelLabel} LR numbers`}
                  emptyLabel={`No LR numbers allocated to ${childLevelLabel} yet.`}
                  rows={childLevelPoolRows}
                />
              ) : null}
            </div>
          </div>
          {managedChildRule?.childCanRequestLr || managedChildRule?.canApproveChildRequests ? (
            <div className="rounded-xl border bg-slate-50/70 px-3 py-3">
              <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Pending requests</div>
              {childPendingRequests.length ? (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                      <tr>
                        <th className="py-1 pr-3">From</th>
                        <th className="py-1 pr-3">Qty</th>
                        <th className="py-1 pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {childPendingRequests.map((request) => (
                        <tr key={request.id} className="border-t">
                          <td className="py-2 pr-3">{orgUnitMap.get(request.sourceOrgUnitId ?? "")?.name ?? childLevelLabel}</td>
                          <td className="py-2 pr-3">{request.requestedCount}</td>
                          <td className="py-2 pr-3">{request.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">No pending requests.</div>
              )}
            </div>
          ) : null}
        </div>
      </TenantPanel>
    </div>
  );
}

function buildFormState(config: ReturnType<typeof getManualConfigShape>): ManualConfigForm {
  return {
    scopeType: config?.scopeType === "HIERARCHY" ? "HIERARCHY" : "TENANT",
    ownershipLevelId: config?.ownershipLevelId ?? "",
    prefix: config?.prefix ?? "LR",
    yearFormat: config?.yearFormat ?? "YYYY",
    numberSeparator: config?.numberSeparator ?? "-",
    zeroPaddingLength: config?.zeroPaddingLength ?? 6,
    distributionStrategy: config?.distributionStrategy ?? "DISTRIBUTED",
    workflowMode: config?.workflowMode ?? "APPROVAL_BASED",
    numberingPolicy: config?.numberingPolicy ?? "STRICT_FORMAT",
    customerLrPolicy: config?.customerLrPolicy ?? "NOT_CUSTOMER_SPECIFIC",
    allowCustomerFallback: config?.allowCustomerFallback ?? true,
    workflowPermissions: ensureManualWorkflowPermissions(config?.workflowPermissions),
    workflowPermissionScopes: normalizeManualWorkflowScopes(config?.workflowPermissionScopes),
    childGovernanceRules: (config?.childGovernanceRules ?? []).map((rule) => ({
      childLevelId: rule.childLevelId,
      canConsumeParentLr: rule.canConsumeParentLr ?? false,
      childCanRequestLr: rule.childCanRequestLr ?? false,
      childCanConsumeLr: rule.childCanConsumeLr ?? true,
      canMaintainOwnSequence: rule.canMaintainOwnSequence ?? false,
      canDefineChildFormat: rule.canDefineChildFormat ?? false,
      parentCanGenerateLr: rule.parentCanGenerateLr ?? true,
      parentCanAllocateLrToChild: rule.parentCanAllocateLrToChild ?? false,
      canAllocateChildLr: rule.canAllocateChildLr ?? false,
      canApproveChildRequests: rule.canApproveChildRequests ?? false,
      canConfigureChildWorkflow: rule.canConfigureChildWorkflow ?? false,
      canDelegateChildGovernance: rule.canDelegateChildGovernance ?? false,
      inheritParentFormat: rule.inheritParentFormat ?? true,
      formatMode: rule.formatMode ?? "GLOBAL_PARENT_FORMAT",
      allocationRequired: rule.allocationRequired ?? false,
      approvalRequired: rule.approvalRequired ?? false,
      canTransferLr: rule.canTransferLr ?? false,
    })),
    placeFormatOverrides: (config?.placeFormatOverrides ?? []).map((override) => ({
      orgUnitId: override.orgUnitId,
      prefix: override.prefix,
      yearFormat: override.yearFormat ?? "YYYY",
      numberSeparator: override.numberSeparator ?? "-",
      zeroPaddingLength: override.zeroPaddingLength ?? 6,
      numberingPolicy: override.numberingPolicy ?? "STRICT_FORMAT",
    })),
    status: config?.status ?? "active",
    guidanceNote: "",
  };
}

function getManualConfigShape(config: ReturnType<typeof useTenantLRConfigs>["data"][number] | null) {
  return config;
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-medium text-slate-700">{label}</label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function CompactInfoCard({
  label,
  value,
  tone = "default",
  mono = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "sky";
  mono?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${tone === "sky" ? "bg-sky-50/70" : "bg-slate-50/80"}`}>
      <div className={`text-[11px] uppercase tracking-[0.08em] ${tone === "sky" ? "text-sky-700" : "text-muted-foreground"}`}>{label}</div>
      <div className={`mt-1 text-sm font-semibold text-slate-950 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return <span className="rounded-full border bg-slate-50 px-2.5 py-1 text-slate-700">{children}</span>;
}

function CompactManagementTable({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: Array<{ label: string; count: number; values: string[] }>;
  emptyLabel: string;
}) {
  return (
    <div className="mt-3 rounded-xl border bg-slate-50/70 px-3 py-3">
      <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{title}</div>
      {rows.length ? (
        <div className="mt-2 space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="rounded-lg border bg-white px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-900">{row.label}</div>
                <div className="text-xs text-muted-foreground">{row.count} LR</div>
              </div>
              <div className="mt-1 font-mono text-xs text-slate-700">{row.values.join(", ")}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">{emptyLabel}</div>
      )}
    </div>
  );
}

function ActionToggleButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "border-sky-300 bg-sky-100 text-sky-900"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {label}
    </button>
  );
}

function FormatStrategyCard({
  title,
  description,
  example,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  example: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label className={`rounded-xl border px-3 py-3 ${checked ? "border-sky-300 bg-sky-50" : "bg-white"}`}>
      <div>
        <div className="text-sm font-medium text-slate-950">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
        <div className="mt-2 rounded-lg border bg-white/80 px-2.5 py-1.5 font-mono text-[11px] text-slate-900">{example}</div>
      </div>
      <div className="mt-2">
        <input type="radio" checked={checked} onChange={onChange} disabled={disabled} />
      </div>
    </label>
  );
}

function updateManagedChildRule(
  setForm: Dispatch<SetStateAction<ManualConfigForm>>,
  childLevelId: string,
  patch: Partial<ManualConfigForm["childGovernanceRules"][number]>,
) {
  setForm((current) => ({
    ...current,
    childGovernanceRules: current.childGovernanceRules.map((rule) =>
      rule.childLevelId === childLevelId ? { ...rule, ...patch } : rule,
    ),
  }));
}

function applyStandardFlow(
  setForm: Dispatch<SetStateAction<ManualConfigForm>>,
  childLevelId: string,
  flow: "DIRECT_CONSUME" | "REQUEST_ALLOCATE" | "REQUEST_APPROVE_ALLOCATE",
) {
  const patch =
    flow === "DIRECT_CONSUME"
      ? {
          parentCanGenerateLr: true,
          parentCanAllocateLrToChild: false,
          childCanRequestLr: false,
          canApproveChildRequests: false,
          childCanConsumeLr: true,
          canConsumeParentLr: true,
        }
      : flow === "REQUEST_ALLOCATE"
        ? {
            parentCanGenerateLr: true,
            parentCanAllocateLrToChild: true,
            childCanRequestLr: true,
            canApproveChildRequests: false,
            childCanConsumeLr: true,
            canConsumeParentLr: true,
          }
        : {
            parentCanGenerateLr: true,
            parentCanAllocateLrToChild: true,
            childCanRequestLr: true,
            canApproveChildRequests: true,
            childCanConsumeLr: true,
            canConsumeParentLr: true,
          };
  updateManagedChildRule(setForm, childLevelId, patch);
}

function resolveStandardFlowValue(rule: ManualConfigForm["childGovernanceRules"][number]) {
  if (rule.childCanRequestLr && rule.canApproveChildRequests && rule.parentCanAllocateLrToChild) {
    return "REQUEST_APPROVE_ALLOCATE";
  }
  if (rule.childCanRequestLr && rule.parentCanAllocateLrToChild) {
    return "REQUEST_ALLOCATE";
  }
  return "DIRECT_CONSUME";
}

function resolveCurrentAuthorityMode(
  currentLevelOriginRule: ManualConfigForm["childGovernanceRules"][number] | null,
  currentGovernanceLevel: { id: string } | null,
) {
  if (!currentGovernanceLevel) {
    return "ROOT" as const;
  }
  if (currentLevelOriginRule?.formatMode === "FULL_CHILD_FORMAT") {
    return "INDEPENDENT" as const;
  }
  if (currentLevelOriginRule?.formatMode === "PARENT_PREFIX_CHILD_SUFFIX") {
    return "PREFIX_EXTENSION" as const;
  }
  return "INHERITED" as const;
}

function getCurrentAuthorityFormat(params: {
  form: ManualConfigForm;
  activeGovernanceOrgUnit: { id: string; name: string } | null;
  currentLevelOriginRule: ManualConfigForm["childGovernanceRules"][number] | null;
  currentAuthorityMode: "ROOT" | "INHERITED" | "PREFIX_EXTENSION" | "INDEPENDENT";
}) {
  const { form, activeGovernanceOrgUnit, currentLevelOriginRule, currentAuthorityMode } = params;
  if (activeGovernanceOrgUnit && currentLevelOriginRule?.formatMode === "FULL_CHILD_FORMAT") {
    const override =
      form.placeFormatOverrides.find((item) => item.orgUnitId === activeGovernanceOrgUnit.id) ?? null;
    if (override) {
      return override;
    }
    return {
      orgUnitId: activeGovernanceOrgUnit.id,
      prefix: activeGovernanceOrgUnit.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""),
      yearFormat: form.yearFormat,
      numberSeparator: form.numberSeparator,
      zeroPaddingLength: form.zeroPaddingLength,
      numberingPolicy: form.numberingPolicy,
    };
  }
  if (activeGovernanceOrgUnit && currentLevelOriginRule?.formatMode === "PARENT_PREFIX_CHILD_SUFFIX") {
    return getPlaceOverrideForDisplay({
      overrides: form.placeFormatOverrides,
      orgUnitId: activeGovernanceOrgUnit.id,
      fallback: {
        orgUnitId: "ROOT",
        prefix: form.prefix,
        yearFormat: form.yearFormat,
        numberSeparator: form.numberSeparator,
        zeroPaddingLength: form.zeroPaddingLength,
        numberingPolicy: form.numberingPolicy,
      },
      formatMode: "PARENT_PREFIX_CHILD_SUFFIX",
      orgUnitName: activeGovernanceOrgUnit.name,
    });
  }
  return {
    orgUnitId: activeGovernanceOrgUnit?.id ?? "ROOT",
    prefix: form.prefix,
    yearFormat: form.yearFormat,
    numberSeparator: form.numberSeparator,
    zeroPaddingLength: form.zeroPaddingLength,
    numberingPolicy: form.numberingPolicy,
  };
}

/**
 * Build the LR flow string. When LR stays at the root level only,
 * returns "<Root> only". When LR is distributed down to a target level,
 * returns the full hierarchy chain up to that level ("Central → Region →
 * Branch"). Avoids the nonsensical "Central → Central" string.
 */
function buildLrFlowLabel(
  levels: Array<{ id: string; name: string; order: number }>,
  targetLevelId: string,
  rootName: string,
): string {
  const sorted = [...levels].sort((a, b) => a.order - b.order);
  if (!sorted.length) return rootName;
  const root = sorted[0];
  const targetIndex = targetLevelId ? sorted.findIndex((level) => level.id === targetLevelId) : 0;
  if (targetIndex <= 0) {
    return `${root.name} only`;
  }
  return sorted
    .slice(0, targetIndex + 1)
    .map((level) => level.name)
    .join(" → ");
}

function getAllowedChildFormatModes(currentAuthorityMode: "ROOT" | "INHERITED" | "PREFIX_EXTENSION" | "INDEPENDENT") {
  if (currentAuthorityMode === "ROOT") {
    return ["GLOBAL_PARENT_FORMAT", "PARENT_PREFIX_CHILD_SUFFIX", "FULL_CHILD_FORMAT"] as ManualLRChildFormatMode[];
  }
  if (currentAuthorityMode === "INDEPENDENT") {
    return ["GLOBAL_PARENT_FORMAT", "PARENT_PREFIX_CHILD_SUFFIX"] as ManualLRChildFormatMode[];
  }
  if (currentAuthorityMode === "PREFIX_EXTENSION") {
    return ["GLOBAL_PARENT_FORMAT", "PARENT_PREFIX_CHILD_SUFFIX"] as ManualLRChildFormatMode[];
  }
  return ["GLOBAL_PARENT_FORMAT"] as ManualLRChildFormatMode[];
}

function buildChildStrategyCards(params: {
  childLevelLabel: string;
  currentAuthorityMode: "ROOT" | "INHERITED" | "PREFIX_EXTENSION" | "INDEPENDENT";
}) {
  const { childLevelLabel, currentAuthorityMode } = params;
  const options = getAllowedChildFormatModes(currentAuthorityMode);
  return [
    {
      mode: "GLOBAL_PARENT_FORMAT" as const,
      title: `${childLevelLabel} uses parent format`,
      description: `All ${childLevelLabel} places consume the parent LR format without separate child format rules.`,
      example: "ELMAN-000001",
    },
    {
      mode: "PARENT_PREFIX_CHILD_SUFFIX" as const,
      title: `${childLevelLabel} uses parent prefix + child code`,
      description: `${childLevelLabel} extends the parent prefix with a place code, but does not invent a disconnected format.`,
      example: "ELMAN-SOUTH-000001",
    },
    {
      mode: "FULL_CHILD_FORMAT" as const,
      title: `Each ${childLevelLabel} has separate format`,
      description: `${childLevelLabel} becomes the first inheritance break and defines its own format independently.`,
      example: "SOUTH-000001",
    },
  ].filter((option) => options.includes(option.mode));
}

function describeAuthorityMode(currentAuthorityMode: "ROOT" | "INHERITED" | "PREFIX_EXTENSION" | "INDEPENDENT") {
  if (currentAuthorityMode === "ROOT") {
    return "Tenant root authority";
  }
  if (currentAuthorityMode === "INDEPENDENT") {
    return "Independent format owner";
  }
  if (currentAuthorityMode === "PREFIX_EXTENSION") {
    return "Parent prefix extension";
  }
  return "Parent format inheritance";
}

function canEditCurrentAuthorityFormat(currentAuthorityMode: "ROOT" | "INHERITED" | "PREFIX_EXTENSION" | "INDEPENDENT") {
  return currentAuthorityMode === "ROOT" || currentAuthorityMode === "INDEPENDENT";
}

function updateCurrentAuthorityFormat(
  setForm: Dispatch<SetStateAction<ManualConfigForm>>,
  currentAuthorityMode: "ROOT" | "INHERITED" | "PREFIX_EXTENSION" | "INDEPENDENT",
  activeGovernanceOrgUnitId: string | null,
  field: "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength" | "numberingPolicy",
  value: string | number,
) {
  setForm((current) => {
    if (currentAuthorityMode === "ROOT") {
      return { ...current, [field]: value } as ManualConfigForm;
    }
    if (currentAuthorityMode === "INDEPENDENT" && activeGovernanceOrgUnitId) {
      return {
        ...current,
        placeFormatOverrides: upsertPlaceFormatOverride({
          overrides: current.placeFormatOverrides,
          orgUnitId: activeGovernanceOrgUnitId,
          baseFormat: {
            orgUnitId: activeGovernanceOrgUnitId,
            prefix: current.prefix,
            yearFormat: current.yearFormat,
            numberSeparator: current.numberSeparator,
            zeroPaddingLength: current.zeroPaddingLength,
            numberingPolicy: current.numberingPolicy,
          },
          patch: { [field]: value },
        }),
      };
    }
    return current;
  });
}

function upsertPlaceFormatOverride(params: {
  overrides: ManualConfigForm["placeFormatOverrides"];
  orgUnitId: string;
  baseFormat: ManualConfigForm["placeFormatOverrides"][number];
  patch: Partial<ManualConfigForm["placeFormatOverrides"][number]>;
}) {
  const { overrides, orgUnitId, baseFormat, patch } = params;
  const existing = overrides.find((item) => item.orgUnitId === orgUnitId);
  if (existing) {
    return overrides.map((item) => (item.orgUnitId === orgUnitId ? { ...item, ...patch } : item));
  }
  return [...overrides, { ...baseFormat, orgUnitId, ...patch }];
}

function getPlaceOverrideForDisplay(params: {
  overrides: ManualConfigForm["placeFormatOverrides"];
  orgUnitId: string;
  fallback: ManualConfigForm["placeFormatOverrides"][number];
  formatMode: ManualLRChildFormatMode;
  orgUnitName: string;
}) {
  const { overrides, orgUnitId, fallback, formatMode, orgUnitName } = params;
  const existing = overrides.find((item) => item.orgUnitId === orgUnitId);
  if (formatMode === "PARENT_PREFIX_CHILD_SUFFIX") {
    const storedCode = existing
      ? normalizeStoredChildCode(existing.prefix, fallback.prefix, fallback.numberSeparator)
      : sanitizeChildCode(orgUnitName);
    return {
      orgUnitId,
      prefix: `${fallback.prefix}${storedCode}`,
      yearFormat: fallback.yearFormat,
      numberSeparator: fallback.numberSeparator,
      zeroPaddingLength: fallback.zeroPaddingLength,
      numberingPolicy: fallback.numberingPolicy,
    };
  }
  if (existing) {
    return existing;
  }
  return {
    orgUnitId,
    prefix: orgUnitName.trim().toUpperCase().replace(/\s+/g, "-"),
    yearFormat: fallback.yearFormat,
    numberSeparator: fallback.numberSeparator,
    zeroPaddingLength: fallback.zeroPaddingLength,
    numberingPolicy: fallback.numberingPolicy,
  };
}

function sanitizeChildCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeStoredChildCode(value: string, parentPrefix: string, separator: string) {
  const normalized = value.trim().toUpperCase();
  const parent = parentPrefix.trim().toUpperCase();
  if (normalized.startsWith(`${parent}${separator}`)) {
    return sanitizeChildCode(normalized.slice(`${parent}${separator}`.length));
  }
  if (normalized.startsWith(parent)) {
    return sanitizeChildCode(normalized.slice(parent.length));
  }
  return sanitizeChildCode(normalized);
}

function describeSelectedStrategy(formatMode: ManualLRChildFormatMode, childLevelLabel: string) {
  if (formatMode === "GLOBAL_PARENT_FORMAT") {
    return `${childLevelLabel} uses parent format`;
  }
  if (formatMode === "PARENT_PREFIX_CHILD_SUFFIX") {
    return `${childLevelLabel} uses parent prefix + child code`;
  }
  return `Each ${childLevelLabel} has separate format`;
}

function buildFinalPreviewRows(params: {
  currentScopeLabel: string;
  childLevelLabel: string;
  childUnits: Array<{ id: string; name: string }>;
  currentAuthorityFormat: ManualConfigForm["placeFormatOverrides"][number];
  managedChildRule: ManualConfigForm["childGovernanceRules"][number] | null;
  placeFormatOverrides: ManualConfigForm["placeFormatOverrides"];
}) {
  const { currentScopeLabel, childLevelLabel, childUnits, currentAuthorityFormat, managedChildRule, placeFormatOverrides } = params;
  const rows = [
    {
      label: currentScopeLabel,
      preview: buildManualLrPreview(currentAuthorityFormat),
      helper: "Current authority format.",
    },
  ];
  if (!managedChildRule) {
    return rows;
  }
  if (managedChildRule.formatMode === "GLOBAL_PARENT_FORMAT") {
    rows.push({
      label: `${childLevelLabel} flow`,
      preview: buildManualLrPreview(currentAuthorityFormat),
      helper: `All ${childLevelLabel} places use the same parent format.`,
    });
    return rows;
  }
  childUnits.slice(0, 4).forEach((unit) => {
    const format = getPlaceOverrideForDisplay({
      overrides: placeFormatOverrides,
      orgUnitId: unit.id,
      fallback: currentAuthorityFormat,
      formatMode: managedChildRule.formatMode,
      orgUnitName: unit.name,
    });
    rows.push({
      label: unit.name,
      preview: buildManualLrPreview(format),
      helper:
        managedChildRule.formatMode === "PARENT_PREFIX_CHILD_SUFFIX"
          ? `${unit.name} extends the parent prefix.`
          : `${unit.name} owns an independent child format.`,
    });
  });
  return rows;
}

function buildCurrentLevelManagementActions(params: {
  currentGovernanceLevel: { id: string } | null;
  managedChildRule: ManualConfigForm["childGovernanceRules"][number] | null;
  currentLevelOriginRule: ManualConfigForm["childGovernanceRules"][number] | null;
}) {
  const { currentGovernanceLevel, managedChildRule, currentLevelOriginRule } = params;
  const actions = new Set<string>();
  if (managedChildRule?.parentCanGenerateLr || !currentGovernanceLevel) {
    actions.add("Generate LR");
  }
  if (managedChildRule?.parentCanAllocateLrToChild) {
    actions.add("Allocate LR");
  }
  if (managedChildRule?.canApproveChildRequests) {
    actions.add("Approve requests");
  }
  if (currentLevelOriginRule?.childCanRequestLr) {
    actions.add("Request LR");
  }
  if (currentLevelOriginRule?.childCanConsumeLr) {
    actions.add("Consume LR");
  }
  return Array.from(actions);
}

function buildChildLevelManagementActions(params: {
  childCanConfigureNextLevel: { id: string; name: string } | null;
  managedChildRule: ManualConfigForm["childGovernanceRules"][number] | null;
}) {
  const { childCanConfigureNextLevel, managedChildRule } = params;
  if (!managedChildRule) {
    return [];
  }
  const actions: string[] = [];
  if (managedChildRule.childCanRequestLr) {
    actions.push("Request LR");
  }
  if (managedChildRule.childCanConsumeLr) {
    actions.push("Consume LR");
  }
  if (managedChildRule.canDelegateChildGovernance && childCanConfigureNextLevel) {
    actions.push(`Configure ${childCanConfigureNextLevel.name}`);
  }
  return actions;
}

function buildLevelPoolRows(params: {
  pools: Array<{ ownerLevelId?: string | null; lrNumber: string; status: string }>;
  orgUnitMap: Map<string, { id: string; name: string }>;
  levelUnits: Array<{ id: string | null; name: string }>;
}) {
  const { pools, orgUnitMap, levelUnits } = params;
  return levelUnits
    .map((unit) => {
      const values = pools
        .filter((pool) => pool.ownerLevelId === unit.id && ["AVAILABLE", "ALLOCATED", "USED"].includes(pool.status))
        .slice(0, 5)
        .map((pool) => pool.lrNumber);
      const count = pools.filter((pool) => pool.ownerLevelId === unit.id).length;
      return {
        label: unit.id ? orgUnitMap.get(unit.id)?.name ?? unit.name : unit.name,
        count,
        values: values.length ? values : ["No LR numbers"],
      };
    })
    .filter((row) => row.count > 0);
}
