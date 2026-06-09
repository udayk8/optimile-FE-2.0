import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
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
  const orderedLevels = useMemo(
    () => [...hierarchyLevels].sort((a, b) => a.order - b.order),
    [hierarchyLevels],
  );
  const tenantRootLevelName = orderedLevels[0]?.name ?? "Root level";
  const { data: orgUnits } = useTenantOrgUnits(tenant.id);
  const { data: lrConfigs, createLRConfig, updateLRConfig } = useTenantLRConfigs(tenant.id);
  const [message, setMessage] = useState("");

  const manualConfig =
    lrConfigs.find((config) => config.lrType === "MANUAL" && config.status === "active") ??
    lrConfigs.find((config) => config.lrType === "MANUAL") ??
    null;
  const hierarchyLevelMap = useMemo(
    () => new Map(hierarchyLevels.map((level) => [level.id, level])),
    [hierarchyLevels],
  );
  const currentUser = useMemo(
    () => users.find((user) => user.name === session.actorName || user.email === session.actorName) ?? null,
    [session.actorName, users],
  );
  const activeGovernanceOrgUnit = useMemo(() => {
    if (!currentUser?.orgUnitIds?.length) return null;
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
    const sorted = hierarchyLevels.filter((level) => level.active).sort((a, b) => a.order - b.order);
    if (!sorted.length) return [];
    if (!currentGovernanceLevel) return sorted;
    return sorted.filter((level) => level.order > currentGovernanceLevel.order);
  }, [currentGovernanceLevel, hierarchyLevels]);
  const visibleTargetLevel = availableTargetLevels[0] ?? null;
  const canEdit = access.can("LR_CONFIG", "EDIT") || access.can("LR_CONFIG", "CREATE");
  const [form, setForm] = useState<ManualConfigForm>(() => buildFormState(manualConfig));
  useEffect(() => { setForm(buildFormState(manualConfig)); }, [manualConfig]);
  useEffect(() => {
    if (form.scopeType !== "HIERARCHY" || form.ownershipLevelId) return;
    const level =
      availableTargetLevels.find((l) => orgUnits.some((u) => u.hierarchyLevelId === l.id)) ??
      availableTargetLevels[0] ?? null;
    if (!level) return;
    setForm((current) =>
      current.scopeType === "HIERARCHY" && !current.ownershipLevelId
        ? { ...current, ownershipLevelId: level.id }
        : current,
    );
  }, [availableTargetLevels, form.ownershipLevelId, form.scopeType, orgUnits]);

  const inheritedDistributionLevel =
    form.scopeType === "HIERARCHY" && form.ownershipLevelId
      ? hierarchyLevels.find((item) => item.id === form.ownershipLevelId) ?? null
      : null;
  const managedTargetLevel = form.scopeType === "HIERARCHY"
    ? (inheritedDistributionLevel ?? visibleTargetLevel ?? null)
    : null;
  const managedTargetLevelId = managedTargetLevel?.id ?? "";
  const managedRuleLevelId = form.scopeType === "HIERARCHY" ? managedTargetLevelId : "";
  const childCanConfigureNextLevel = useMemo(() => {
    if (!managedTargetLevel) return null;
    return hierarchyLevels
      .filter((level) => level.active && level.order > managedTargetLevel.order)
      .sort((a, b) => a.order - b.order)[0] ?? null;
  }, [hierarchyLevels, managedTargetLevel]);

  useEffect(() => {
    setForm((current) => {
      const managedLevelId = current.scopeType === "HIERARCHY"
        ? managedRuleLevelId || current.ownershipLevelId
        : "";
      if (!managedLevelId) {
        return current.childGovernanceRules.length ? { ...current, childGovernanceRules: [] } : current;
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
  const managedChildRule =
    form.childGovernanceRules.find((rule) => rule.childLevelId === managedRuleLevelId) ?? null;
  const currentLevelOriginRule =
    currentGovernanceLevel
      ? form.childGovernanceRules.find((rule) => rule.childLevelId === currentGovernanceLevel.id) ?? null
      : null;
  const isAtCompanyRoot = !currentGovernanceLevel;
  const currentLevelLabel = isAtCompanyRoot ? "Company Root" : (currentGovernanceLevel?.name ?? tenantRootLevelName);
  const childLevelLabel = managedTargetLevel?.name ?? "Child level";
  const currentScopeLabel = activeGovernanceOrgUnit
    ? `${activeGovernanceOrgUnit.name} (${currentLevelLabel})`
    : isAtCompanyRoot ? tenant.name : tenantRootLevelName;
  const currentAuthorityMode = resolveCurrentAuthorityMode(currentLevelOriginRule, currentGovernanceLevel);
  const currentAuthorityFormat = useMemo(
    () => getCurrentAuthorityFormat({ form, activeGovernanceOrgUnit, currentLevelOriginRule, currentAuthorityMode }),
    [activeGovernanceOrgUnit, currentAuthorityMode, currentLevelOriginRule, form],
  );
  const currentAuthorityPreview = buildManualLrPreview(currentAuthorityFormat);
  const allowedFormatModes = useMemo(() => getAllowedChildFormatModes(currentAuthorityMode), [currentAuthorityMode]);
  const childStrategyCards = useMemo(
    () => buildChildStrategyCards({ childLevelLabel, currentAuthorityMode }),
    [childLevelLabel, currentAuthorityMode],
  );
  const finalPreviewRows = useMemo(
    () => buildFinalPreviewRows({
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
    if (!managedChildRule || allowedFormatModes.includes(managedChildRule.formatMode)) return;
    updateManagedChildRule(setForm, managedChildRule.childLevelId, {
      formatMode: allowedFormatModes[0],
      canDefineChildFormat: allowedFormatModes[0] !== "GLOBAL_PARENT_FORMAT",
      inheritParentFormat: allowedFormatModes[0] !== "FULL_CHILD_FORMAT",
    });
  }, [allowedFormatModes, managedChildRule]);

  useEffect(() => {
    if (!managedChildRule || childCanConfigureNextLevel || !managedChildRule.canDelegateChildGovernance) return;
    updateManagedChildRule(setForm, managedChildRule.childLevelId, { canDelegateChildGovernance: false });
  }, [childCanConfigureNextLevel, managedChildRule]);

  function saveConfig() {
    if (!form.prefix.trim()) { setMessage("Enter the manual LR prefix."); return; }
    if (!form.ownershipLevelId && form.scopeType === "HIERARCHY") {
      setMessage("Select the ownership level."); return;
    }
    const payload = {
      ...buildManualLrConfigInput(manualConfig),
      scopeType: form.scopeType,
      ownershipLevelId: form.scopeType === "HIERARCHY"
        ? currentGovernanceLevel ? manualConfig?.ownershipLevelId ?? form.ownershipLevelId : form.ownershipLevelId
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
      if (manualConfig) { updateLRConfig(manualConfig.id, payload); setMessage("Manual LR configuration updated."); }
      else { createLRConfig(payload); setMessage("Manual LR configuration created."); }
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
    if (mode === "PARENT_PREFIX_CHILD_SUFFIX") return sanitizeChildCode(cleaned) || sanitizeChildCode(orgUnitName);
    if (mode === "FULL_CHILD_FORMAT") return cleaned || orgUnitName.trim().toUpperCase().replace(/\s+/g, "-");
    return currentAuthorityFormat.prefix;
  }

  function extractDisplayedPrefix(overridePrefix: string, mode: ManualLRChildFormatMode) {
    if (mode !== "PARENT_PREFIX_CHILD_SUFFIX") return overridePrefix;
    return normalizeStoredChildCode(overridePrefix, currentAuthorityFormat.prefix, currentAuthorityFormat.numberSeparator);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[14px] font-semibold text-slate-900">Manual LR</h1>
        <Button size="sm" onClick={saveConfig} disabled={!canEdit}>Save</Button>
      </div>

      {message ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{message}</div>
      ) : null}

      {/* Step 1 — LR Number Format */}
      <SectionCard step={1} title="LR Number Format">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Prefix">
            <Input
              value={currentAuthorityFormat.prefix}
              onChange={(event) => updateCurrentAuthorityFormat(setForm, currentAuthorityMode, activeGovernanceOrgUnit?.id ?? null, "prefix", event.target.value)}
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
                updateCurrentAuthorityFormat(setForm, currentAuthorityMode, activeGovernanceOrgUnit?.id ?? null, "zeroPaddingLength", Math.max(1, Number(event.target.value || 1)))
              }
              disabled={!canEdit || !canEditCurrentAuthorityFormat(currentAuthorityMode)}
            />
          </Field>
          <div className="mb-0.5 font-mono text-base font-bold text-slate-900">{currentAuthorityPreview}</div>
        </div>
      </SectionCard>

      {/* Step 2 — Who controls LR? */}
      <SectionCard step={2} title="Who controls LR?">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ScopeOption
            active={form.scopeType === "TENANT"}
            title="Company Root only"
            description={`${tenant.name} generates all LR numbers`}
            onClick={() => setForm((current) => ({ ...current, scopeType: "TENANT", ownershipLevelId: "" }))}
            disabled={!canEdit}
          />
          {availableTargetLevels.map((level) => (
            <ScopeOption
              key={level.id}
              active={form.scopeType === "HIERARCHY" && managedTargetLevelId === level.id}
              title={`Down to ${level.name}`}
              description={`Each ${level.name} manages own LR`}
              onClick={() => setForm((current) => ({ ...current, scopeType: "HIERARCHY", ownershipLevelId: level.id }))}
              disabled={!canEdit}
            />
          ))}
        </div>
        {currentGovernanceLevel && !canConfigureImmediateChildFromParent ? (
          <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Parent restricted this level to consume only.
          </div>
        ) : null}
      </SectionCard>

      {/* Step 3 — Governance (only when distributed) */}
      {form.scopeType === "HIERARCHY" && managedChildRule ? (
        <SectionCard step={3} title={`Governance — ${currentLevelLabel} → ${childLevelLabel}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-slate-50 px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{currentLevelLabel}</div>
              <div className="flex flex-wrap gap-1.5">
                <ActionToggleButton label="Request" active={currentLevelOriginRule?.childCanRequestLr ?? false} disabled onClick={() => undefined} />
                <ActionToggleButton label="Use" active={currentLevelOriginRule?.childCanConsumeLr ?? !currentGovernanceLevel} disabled onClick={() => undefined} />
                <ActionToggleButton label="Generate" active={managedChildRule.parentCanGenerateLr} disabled={!canEdit} onClick={() => updateManagedChildRule(setForm, managedChildRule.childLevelId, { parentCanGenerateLr: !managedChildRule.parentCanGenerateLr })} />
                <ActionToggleButton label="Allocate" active={managedChildRule.parentCanAllocateLrToChild} disabled={!canEdit} onClick={() => updateManagedChildRule(setForm, managedChildRule.childLevelId, { parentCanAllocateLrToChild: !managedChildRule.parentCanAllocateLrToChild })} />
                <ActionToggleButton label="Approve Requests" active={managedChildRule.canApproveChildRequests} disabled={!canEdit} onClick={() => updateManagedChildRule(setForm, managedChildRule.childLevelId, { canApproveChildRequests: !managedChildRule.canApproveChildRequests })} />
              </div>
            </div>
            <div className="rounded-lg border bg-slate-50 px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{childLevelLabel}</div>
              <div className="flex flex-wrap gap-1.5">
                <ActionToggleButton label="Request" active={managedChildRule.childCanRequestLr} disabled={!canEdit} onClick={() => updateManagedChildRule(setForm, managedChildRule.childLevelId, { childCanRequestLr: !managedChildRule.childCanRequestLr })} />
                <ActionToggleButton label="Use" active={managedChildRule.childCanConsumeLr} disabled={!canEdit} onClick={() => updateManagedChildRule(setForm, managedChildRule.childLevelId, { childCanConsumeLr: !managedChildRule.childCanConsumeLr, canConsumeParentLr: !managedChildRule.childCanConsumeLr })} />
                <ActionToggleButton label="Manage Child" active={managedChildRule.canDelegateChildGovernance} disabled={!canEdit || !childCanConfigureNextLevel} onClick={() => updateManagedChildRule(setForm, managedChildRule.childLevelId, { canDelegateChildGovernance: !managedChildRule.canDelegateChildGovernance })} />
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Field label={`${currentLevelLabel} → ${childLevelLabel}`}>
              <Select
                value={resolveStandardFlowValue(managedChildRule)}
                onChange={(event) =>
                  applyStandardFlow(setForm, managedChildRule.childLevelId, event.target.value as "DIRECT_CONSUME" | "REQUEST_ALLOCATE" | "REQUEST_APPROVE_ALLOCATE")
                }
                disabled={!canEdit}
              >
                <option value="DIRECT_CONSUME">Generate → Use</option>
                <option value="REQUEST_ALLOCATE">Request → Allocate → Use</option>
                <option value="REQUEST_APPROVE_ALLOCATE">Request → Approve → Allocate → Use</option>
              </Select>
            </Field>
            {childCanConfigureNextLevel ? (
              <Field label={`${childLevelLabel} → ${childCanConfigureNextLevel.name}`}>
                <Select
                  value={managedChildRule.canDelegateChildGovernance ? "YES" : "NO"}
                  onChange={(event) => updateManagedChildRule(setForm, managedChildRule.childLevelId, { canDelegateChildGovernance: event.target.value === "YES" })}
                  disabled={!canEdit}
                >
                  <option value="NO">Use only</option>
                  <option value="YES">Can configure</option>
                </Select>
              </Field>
            ) : (
              <div className="flex items-end pb-1 text-xs text-slate-400">{childLevelLabel} is the lowest level</div>
            )}
          </div>
        </SectionCard>
      ) : null}

      {/* Step 4 — Format Strategy (only when distributed) */}
      {form.scopeType === "HIERARCHY" && managedChildRule ? (
        <SectionCard step={4} title={`Format for ${childLevelLabel}`}>
          {currentAuthorityMode === "INDEPENDENT" ? (
            <div className="mb-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Locked — {childLevelLabel} can only use parent format or parent prefix + child code.
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-3">
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
                        ? { ...rule, formatMode: card.mode, canDefineChildFormat: card.mode !== "GLOBAL_PARENT_FORMAT", inheritParentFormat: card.mode !== "FULL_CHILD_FORMAT" }
                        : rule,
                    ),
                    placeFormatOverrides:
                      card.mode === "GLOBAL_PARENT_FORMAT"
                        ? current.placeFormatOverrides.filter((override) => !ownershipOrgUnits.some((unit) => unit.id === override.orgUnitId))
                        : current.placeFormatOverrides,
                  }))
                }
              />
            ))}
          </div>
          {managedChildRule.formatMode === "GLOBAL_PARENT_FORMAT" ? (
            <div className="mt-2 rounded-lg border border-dashed bg-slate-50/60 px-3 py-2 text-[12px] text-slate-400">
              All {childLevelLabel} places use <span className="font-mono font-semibold text-slate-700">{currentAuthorityPreview}</span>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {/* Step 5 — Place Codes (only when Parent+Code or Independent) */}
      {form.scopeType === "HIERARCHY" && managedChildRule && managedChildRule.formatMode !== "GLOBAL_PARENT_FORMAT" ? (
        <SectionCard step={5} title={`Place Codes — ${childLevelLabel}`}>
          {!ownershipOrgUnits.length ? (
            <div className="rounded-lg border border-dashed bg-slate-50/60 px-3 py-2 text-[12px] text-slate-400">
              No places found at the {childLevelLabel} level.
            </div>
          ) : (
            <>
              <div className={`hidden md:grid gap-2 px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1 ${managedChildRule.formatMode === "FULL_CHILD_FORMAT" ? "md:grid-cols-[1fr_140px_80px_140px]" : "md:grid-cols-[1fr_140px_80px_1fr]"}`}>
                <div>Place</div>
                <div>{managedChildRule.formatMode === "PARENT_PREFIX_CHILD_SUFFIX" ? "Code" : "Prefix"}</div>
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
                      className={`rounded-xl border bg-white p-3 grid gap-2 ${managedChildRule.formatMode === "FULL_CHILD_FORMAT" ? "md:grid-cols-[1fr_140px_80px_140px]" : "md:grid-cols-[1fr_140px_80px_1fr]"} md:items-end`}
                    >
                      <div className="text-sm font-semibold text-slate-950">{orgUnit.name}</div>
                      <Field label={managedChildRule.formatMode === "PARENT_PREFIX_CHILD_SUFFIX" ? "Code" : "Prefix"}>
                        <Input
                          value={extractDisplayedPrefix(override.prefix, managedChildRule.formatMode)}
                          onChange={(event) =>
                            updatePlaceOverride(orgUnit.id, "prefix", buildPrefixValueForMode(orgUnit.name, event.target.value, managedChildRule.formatMode))
                          }
                          disabled={!canEdit}
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
                            <option value="STRICT_FORMAT">Strict</option>
                            <option value="FLEXIBLE_PHYSICAL_BOOK">Flexible</option>
                          </Select>
                        </Field>
                      ) : (
                        <div className="flex items-end pb-1 font-mono text-sm font-semibold text-slate-900">{buildManualLrPreview(override)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {finalPreviewRows.length > 1 ? (
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {finalPreviewRows.map((row) => (
                    <div key={row.label} className="rounded-xl border bg-slate-50/70 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{row.label}</div>
                      <div className="mt-1 font-mono text-sm font-semibold text-slate-950">{row.preview}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </SectionCard>
      ) : null}
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

function Field({ label, helper, children }: { label: string; helper?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-medium text-slate-700">{label}</label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function ActionToggleButton({ label, active, disabled, onClick }: { label: string; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${active ? "border-sky-300 bg-sky-100 text-sky-900" : "border-slate-200 bg-slate-50 text-slate-600"}`}
    >
      {label}
    </button>
  );
}

function FormatStrategyCard({ title, description, example, checked, disabled, onChange }: { title: string; description: string; example: string; checked: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <label className={`cursor-pointer rounded-xl border px-3 py-3 ${checked ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-2 rounded-lg border bg-white/80 px-2.5 py-1.5 font-mono text-[11px] text-slate-900">{example}</div>
      <div className="mt-2">
        <input type="radio" checked={checked} onChange={onChange} disabled={disabled} />
      </div>
    </label>
  );
}

function SectionCard({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">{step}</span>
        <span className="text-sm font-semibold text-slate-900">{title}</span>
      </div>
      {children}
    </div>
  );
}

function ScopeOption({ active, title, description, onClick, disabled }: { active: boolean; title: string; description: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${active ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
    >
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${active ? "border-sky-500 bg-sky-500" : "border-slate-300"}`}>
        {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
      </span>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
    </button>
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
      ? { parentCanGenerateLr: true, parentCanAllocateLrToChild: false, childCanRequestLr: false, canApproveChildRequests: false, childCanConsumeLr: true, canConsumeParentLr: true }
      : flow === "REQUEST_ALLOCATE"
        ? { parentCanGenerateLr: true, parentCanAllocateLrToChild: true, childCanRequestLr: true, canApproveChildRequests: false, childCanConsumeLr: true, canConsumeParentLr: true }
        : { parentCanGenerateLr: true, parentCanAllocateLrToChild: true, childCanRequestLr: true, canApproveChildRequests: true, childCanConsumeLr: true, canConsumeParentLr: true };
  updateManagedChildRule(setForm, childLevelId, patch);
}

function resolveStandardFlowValue(rule: ManualConfigForm["childGovernanceRules"][number]) {
  if (rule.childCanRequestLr && rule.canApproveChildRequests && rule.parentCanAllocateLrToChild) return "REQUEST_APPROVE_ALLOCATE";
  if (rule.childCanRequestLr && rule.parentCanAllocateLrToChild) return "REQUEST_ALLOCATE";
  return "DIRECT_CONSUME";
}

function resolveCurrentAuthorityMode(
  currentLevelOriginRule: ManualConfigForm["childGovernanceRules"][number] | null,
  currentGovernanceLevel: { id: string } | null,
) {
  if (!currentGovernanceLevel) return "ROOT" as const;
  if (currentLevelOriginRule?.formatMode === "FULL_CHILD_FORMAT") return "INDEPENDENT" as const;
  if (currentLevelOriginRule?.formatMode === "PARENT_PREFIX_CHILD_SUFFIX") return "PREFIX_EXTENSION" as const;
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
    const override = form.placeFormatOverrides.find((item) => item.orgUnitId === activeGovernanceOrgUnit.id) ?? null;
    if (override) return override;
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
      fallback: { orgUnitId: "ROOT", prefix: form.prefix, yearFormat: form.yearFormat, numberSeparator: form.numberSeparator, zeroPaddingLength: form.zeroPaddingLength, numberingPolicy: form.numberingPolicy },
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

function getAllowedChildFormatModes(currentAuthorityMode: "ROOT" | "INHERITED" | "PREFIX_EXTENSION" | "INDEPENDENT") {
  if (currentAuthorityMode === "ROOT") return ["GLOBAL_PARENT_FORMAT", "PARENT_PREFIX_CHILD_SUFFIX", "FULL_CHILD_FORMAT"] as ManualLRChildFormatMode[];
  if (currentAuthorityMode === "INDEPENDENT") return ["GLOBAL_PARENT_FORMAT", "PARENT_PREFIX_CHILD_SUFFIX"] as ManualLRChildFormatMode[];
  if (currentAuthorityMode === "PREFIX_EXTENSION") return ["GLOBAL_PARENT_FORMAT", "PARENT_PREFIX_CHILD_SUFFIX"] as ManualLRChildFormatMode[];
  return ["GLOBAL_PARENT_FORMAT"] as ManualLRChildFormatMode[];
}

function buildChildStrategyCards(params: { childLevelLabel: string; currentAuthorityMode: "ROOT" | "INHERITED" | "PREFIX_EXTENSION" | "INDEPENDENT" }) {
  const options = getAllowedChildFormatModes(params.currentAuthorityMode);
  return [
    { mode: "GLOBAL_PARENT_FORMAT" as const, title: "Parent Format", description: "", example: "ELMAN-000001" },
    { mode: "PARENT_PREFIX_CHILD_SUFFIX" as const, title: "Parent + Code", description: "", example: "ELMAN-SOUTH-000001" },
    { mode: "FULL_CHILD_FORMAT" as const, title: "Independent Format", description: "", example: "SOUTH-000001" },
  ].filter((option) => options.includes(option.mode));
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
    if (currentAuthorityMode === "ROOT") return { ...current, [field]: value } as ManualConfigForm;
    if (currentAuthorityMode === "INDEPENDENT" && activeGovernanceOrgUnitId) {
      return {
        ...current,
        placeFormatOverrides: upsertPlaceFormatOverride({
          overrides: current.placeFormatOverrides,
          orgUnitId: activeGovernanceOrgUnitId,
          baseFormat: { orgUnitId: activeGovernanceOrgUnitId, prefix: current.prefix, yearFormat: current.yearFormat, numberSeparator: current.numberSeparator, zeroPaddingLength: current.zeroPaddingLength, numberingPolicy: current.numberingPolicy },
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
  if (existing) return overrides.map((item) => (item.orgUnitId === orgUnitId ? { ...item, ...patch } : item));
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
  if (existing) return existing;
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
  if (normalized.startsWith(`${parent}${separator}`)) return sanitizeChildCode(normalized.slice(`${parent}${separator}`.length));
  if (normalized.startsWith(parent)) return sanitizeChildCode(normalized.slice(parent.length));
  return sanitizeChildCode(normalized);
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
  const rows = [{ label: currentScopeLabel, preview: buildManualLrPreview(currentAuthorityFormat), helper: "" }];
  if (!managedChildRule) return rows;
  if (managedChildRule.formatMode === "GLOBAL_PARENT_FORMAT") {
    rows.push({ label: `${childLevelLabel} flow`, preview: buildManualLrPreview(currentAuthorityFormat), helper: "" });
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
    rows.push({ label: unit.name, preview: buildManualLrPreview(format), helper: "" });
  });
  return rows;
}
