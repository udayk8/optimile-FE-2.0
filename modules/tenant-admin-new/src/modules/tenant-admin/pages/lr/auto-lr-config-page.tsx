import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/shared/components/common/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { TenantPanel } from "@/modules/tenant-admin/components/tenant-primitives";
import { useSessionContext } from "@/shared/auth/session-context";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { useTenantLRConfigs } from "@/modules/tenant-admin/hooks/useTenantMasterData";
import { useTenantOrgTypes } from "@/modules/tenant-admin/hooks/useTenantOrgTypes";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import { useAppStore } from "@/shared/store/useAppStore";
import { buildAutoChildStrategyCards, buildAutoLrConfigInput, buildAutoLrRuntimePreview } from "@/modules/tenant-admin/lib/auto-lr";
import { buildManualLrPreview, resolveManualLrFormatForOrgUnit } from "@/modules/tenant-admin/lib/manual-lr";
import type { ManualLRChildFormatMode, TenantLRConfig, TenantLRConfigInput } from "@/types/master-data";

type AutoChildRule = {
  childLevelId: string;
  childCanRequestLr: boolean;
  childCanConsumeLr: boolean;
  parentCanGenerateLr: boolean;
  canApproveChildRequests: boolean;
  canDelegateChildGovernance: boolean;
  formatMode: ManualLRChildFormatMode;
  inheritParentFormat: boolean;
  canDefineChildFormat: boolean;
  canConsumeParentLr: boolean;
  canMaintainOwnSequence: boolean;
  parentCanAllocateLrToChild: boolean;
  canAllocateChildLr: boolean;
  canConfigureChildWorkflow: boolean;
  allocationRequired: boolean;
  approvalRequired: boolean;
  canTransferLr: boolean;
};

type AutoConfigForm = {
  scopeType: "TENANT" | "HIERARCHY";
  ownershipLevelId: string;
  prefix: string;
  yearFormat: "NONE" | "YY" | "YYYY";
  numberSeparator: string;
  zeroPaddingLength: number;
  status: "active" | "inactive";
  childGovernanceRules: AutoChildRule[];
  placeFormatOverrides: TenantLRConfigInput["placeFormatOverrides"];
};

export function TenantAutoLRConfigPage() {
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
  const access = useTenantAccess();
  const { data: users } = useTenantUsers(tenant.id);
  const { data: hierarchyLevels } = useTenantOrgTypes(tenant.id);
  // Operational hierarchy is tenant-defined. Use the first level the Tenant
  // Admin created (e.g. "Central") as the LR root authority — there is no
  // synthetic "Tenant / Company Level" above it.
  const orderedLevels = useMemo(
    () => [...hierarchyLevels].sort((a, b) => a.order - b.order),
    [hierarchyLevels],
  );
  const tenantRootLevelName = orderedLevels[0]?.name ?? "Root level";
  const { data: orgUnits } = useTenantOrgUnits(tenant.id);
  const { data: lrConfigs, createLRConfig, updateLRConfig } = useTenantLRConfigs(tenant.id);
  const store = useAppStore(tenant.id);
  const [message, setMessage] = useState("");
  const canEdit = access.can("LR_CONFIG", "EDIT") || access.can("LR_CONFIG", "CREATE");

  const autoConfig =
    lrConfigs.find((config) => config.lrType === "AUTO" && config.status === "active") ??
    lrConfigs.find((config) => config.lrType === "AUTO") ??
    null;
  const hierarchyLevelMap = useMemo(() => new Map(hierarchyLevels.map((level) => [level.id, level])), [hierarchyLevels]);
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
  const currentLevelOriginRule =
    currentGovernanceLevel
      ? autoConfig?.childGovernanceRules?.find((rule) => rule.childLevelId === currentGovernanceLevel.id) ?? null
      : null;
  const [form, setForm] = useState<AutoConfigForm>(() => buildAutoFormState(autoConfig));
  useEffect(() => {
    setForm(buildAutoFormState(autoConfig));
  }, [autoConfig]);

  const availableTargetLevels = useMemo(() => {
    const sortedActiveLevels = hierarchyLevels.filter((level) => level.active).sort((a, b) => a.order - b.order);
    if (!sortedActiveLevels.length) {
      return [];
    }
    const authorityOrder = currentGovernanceLevel?.order ?? sortedActiveLevels[0]?.order ?? 0;
    return sortedActiveLevels.filter((level) => level.order > authorityOrder);
  }, [currentGovernanceLevel, hierarchyLevels]);
  const managedTargetLevel =
    form.scopeType === "HIERARCHY"
      ? hierarchyLevels.find((level) => level.id === form.ownershipLevelId) ??
        availableTargetLevels[0] ??
        null
      : null;
  const managedTargetLevelId = managedTargetLevel?.id ?? "";
  const childLevelLabel = managedTargetLevel?.name ?? "Child level";
  const currentLevelLabel = currentGovernanceLevel?.name ?? tenantRootLevelName;
  const currentScopeLabel = activeGovernanceOrgUnit
    ? `${activeGovernanceOrgUnit.name} (${currentLevelLabel})`
    : tenantRootLevelName;
  const userScopedLevels = useMemo(() => {
    const authorityOrder = currentGovernanceLevel?.order ?? orderedLevels[0]?.order ?? 0;
    return orderedLevels.filter((level) => level.order >= authorityOrder);
  }, [currentGovernanceLevel, orderedLevels]);
  const managedChildRule =
    form.childGovernanceRules.find((rule) => rule.childLevelId === managedTargetLevelId) ?? null;

  useEffect(() => {
    if (!managedTargetLevelId) {
      return;
    }
    setForm((current) => {
      const existing = current.childGovernanceRules.find((rule) => rule.childLevelId === managedTargetLevelId);
      if (existing) {
        return current;
      }
      return {
        ...current,
        childGovernanceRules: [
          ...current.childGovernanceRules,
          {
            childLevelId: managedTargetLevelId,
            childCanRequestLr: true,
            childCanConsumeLr: true,
            parentCanGenerateLr: true,
            canApproveChildRequests: true,
            canDelegateChildGovernance: false,
            formatMode: "GLOBAL_PARENT_FORMAT",
            inheritParentFormat: true,
            canDefineChildFormat: false,
            canConsumeParentLr: true,
            canMaintainOwnSequence: false,
            parentCanAllocateLrToChild: true,
            canAllocateChildLr: true,
            canConfigureChildWorkflow: false,
            allocationRequired: true,
            approvalRequired: true,
            canTransferLr: false,
          },
        ],
      };
    });
  }, [managedTargetLevelId]);

  const ownershipOrgUnits = useMemo(
    () =>
      managedTargetLevelId
        ? orgUnits.filter((unit) =>
            unit.hierarchyLevelId === managedTargetLevelId &&
            (activeGovernanceOrgUnit ? unit.parentOrgUnitId === activeGovernanceOrgUnit.id : true),
          )
        : [],
    [activeGovernanceOrgUnit, managedTargetLevelId, orgUnits],
  );
  const currentFormat = resolveManualLrFormatForOrgUnit(
    {
      ...buildAutoLrConfigInput(autoConfig),
      ...form,
      lrType: "AUTO",
    } as never,
    activeGovernanceOrgUnit?.id ?? null,
    orgUnits,
  );
  const runtimePreview = autoConfig
    ? buildAutoLrRuntimePreview({
        config: autoConfig,
        orgUnitId: activeGovernanceOrgUnit?.id ?? null,
        orgUnits,
        generatedRecords: store.lrs.filter((record) => record.configId === autoConfig.id),
      })
    : null;

  function saveConfig() {
    const payload = {
      ...buildAutoLrConfigInput(autoConfig),
      scopeType: form.scopeType,
      ownershipLevelId: form.scopeType === "HIERARCHY" ? form.ownershipLevelId || managedTargetLevelId : null,
      prefix: form.prefix.trim().toUpperCase(),
      yearFormat: form.yearFormat,
      numberSeparator: form.numberSeparator,
      zeroPaddingLength: form.zeroPaddingLength,
      childGovernanceRules: form.childGovernanceRules,
      placeFormatOverrides: form.placeFormatOverrides ?? [],
      status: form.status,
    };
    try {
      if (autoConfig) {
        updateLRConfig(autoConfig.id, payload);
        setMessage("Auto LR configuration updated.");
      } else {
        createLRConfig(payload);
        setMessage("Auto LR configuration created.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Auto LR configuration could not be saved.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Auto LR Configuration"
        description="Runtime sequence-generation governance."
        action={<Button onClick={saveConfig} disabled={!canEdit}>Save Auto LR Config</Button>}
      />
      {message ? <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{message}</div> : null}

      <TenantPanel title="Auto LR Governance" description="">
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <CompactCard label="Root" value={currentLevelLabel} />
              <CompactCard label="Workspace" value={currentScopeLabel} />
              <CompactCard label="Preview" value={buildManualLrPreview(currentFormat)} mono />
            </div>
            {currentGovernanceLevel && currentGovernanceLevel.order > (orderedLevels[0]?.order ?? 0) ? (
              <CompactCard label="Inherited From" value={orderedLevels[0]?.name ?? "Root"} />
            ) : null}
            <div className="grid gap-2 sm:grid-cols-[1.1fr_0.9fr]">
              <Field label="Distribute Up To">
                <Select
                  value={form.scopeType === "TENANT" ? "TENANT" : managedTargetLevelId}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    scopeType: event.target.value === "TENANT" ? "TENANT" : "HIERARCHY",
                    ownershipLevelId: event.target.value === "TENANT" ? "" : event.target.value,
                  }))}
                  disabled={!canEdit}
                >
                  <option value="TENANT">{currentLevelLabel}</option>
                  {availableTargetLevels.map((level) => <option key={level.id} value={level.id}>Up to {level.name}</option>)}
                </Select>
              </Field>
              <CompactCard
                label="Flow"
                value={buildLrFlowLabel(
                  userScopedLevels,
                  form.scopeType === "TENANT" ? "" : managedTargetLevelId,
                  currentLevelLabel,
                )}
              />
            </div>
            {managedChildRule ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <SmallBlock title={`${currentLevelLabel} can do`}>
                    <ToggleChip label="Generate at runtime" active={managedChildRule.parentCanGenerateLr} onClick={() => patchRule(setForm, managedChildRule.childLevelId, { parentCanGenerateLr: !managedChildRule.parentCanGenerateLr })} disabled={!canEdit} />
                    <ToggleChip label="Approve child requests" active={managedChildRule.canApproveChildRequests} onClick={() => patchRule(setForm, managedChildRule.childLevelId, { canApproveChildRequests: !managedChildRule.canApproveChildRequests })} disabled={!canEdit} />
                  </SmallBlock>
                  <SmallBlock title={`${childLevelLabel} can do`}>
                    <ToggleChip label="Request generation rights" active={managedChildRule.childCanRequestLr} onClick={() => patchRule(setForm, managedChildRule.childLevelId, { childCanRequestLr: !managedChildRule.childCanRequestLr })} disabled={!canEdit} />
                    <ToggleChip label="Generate during assignment" active={managedChildRule.childCanConsumeLr} onClick={() => patchRule(setForm, managedChildRule.childLevelId, { childCanConsumeLr: !managedChildRule.childCanConsumeLr })} disabled={!canEdit} />
                    <ToggleChip label="Configure next level" active={managedChildRule.canDelegateChildGovernance} onClick={() => patchRule(setForm, managedChildRule.childLevelId, { canDelegateChildGovernance: !managedChildRule.canDelegateChildGovernance })} disabled={!canEdit} />
                  </SmallBlock>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {buildAutoChildStrategyCards(childLevelLabel).map((card) => (
                    <label key={card.mode} className={`rounded-xl border px-3 py-3 ${managedChildRule.formatMode === card.mode ? "border-sky-300 bg-sky-50" : "bg-white"}`}>
                      <div className="text-sm font-medium text-slate-950">{card.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{card.description}</div>
                      <div className="mt-2 rounded-lg border bg-muted/20 px-2.5 py-1.5 font-mono text-[11px]">{card.example}</div>
                      <div className="mt-2">
                        <input
                          type="radio"
                          checked={managedChildRule.formatMode === card.mode}
                          onChange={() => patchRule(setForm, managedChildRule.childLevelId, {
                            formatMode: card.mode,
                            inheritParentFormat: card.mode !== "FULL_CHILD_FORMAT",
                            canDefineChildFormat: card.mode !== "GLOBAL_PARENT_FORMAT",
                          })}
                          disabled={!canEdit}
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </>
            ) : null}
          </div>
          <div className="rounded-xl border bg-slate-50/80 p-3">
            <div className="text-sm font-semibold">Auto LR Sequence Rules</div>
            <div className="mt-3 grid gap-2">
              <Field label="Prefix">
                <Input value={form.prefix} onChange={(event) => setForm((current) => ({ ...current, prefix: event.target.value }))} disabled={!canEdit} />
              </Field>
              <div className="grid gap-2 grid-cols-3">
                <Field label="Year">
                  <Select value={form.yearFormat} onChange={(event) => setForm((current) => ({ ...current, yearFormat: event.target.value as AutoConfigForm["yearFormat"] }))} disabled={!canEdit}>
                    <option value="NONE">None</option>
                    <option value="YYYY">YYYY</option>
                    <option value="YY">YY</option>
                  </Select>
                </Field>
                <Field label="Sep">
                  <Input value={form.numberSeparator} onChange={(event) => setForm((current) => ({ ...current, numberSeparator: event.target.value || "-" }))} disabled={!canEdit} />
                </Field>
                <Field label="Pad">
                  <Input type="number" min={1} max={10} value={String(form.zeroPaddingLength)} onChange={(event) => setForm((current) => ({ ...current, zeroPaddingLength: Math.max(1, Number(event.target.value || 1)) }))} disabled={!canEdit} />
                </Field>
              </div>
              <div className="rounded-lg border bg-white px-3 py-2 font-mono text-sm">{buildManualLrPreview(currentFormat)}</div>
            </div>
          </div>
        </div>
      </TenantPanel>

      <TenantPanel title="Auto LR Runtime Preview" description="">
        <div className="grid gap-3 lg:grid-cols-2">
          <CompactCard label="Current Assignment Context" value={currentScopeLabel} />
          <CompactCard label="Resolved Auto LR Pattern" value={runtimePreview?.formatPreview ?? buildManualLrPreview(currentFormat)} mono />
          <CompactCard label="Next Generated Number" value={runtimePreview?.nextNumber ?? buildManualLrPreview(currentFormat)} mono />
          <CompactCard label="Child Sequence Scope" value={ownershipOrgUnits.map((unit) => unit.name).join(", ") || "No child scope selected"} />
        </div>
      </TenantPanel>
    </div>
  );
}

function buildAutoFormState(config: TenantLRConfig | null | undefined): AutoConfigForm {
  return {
    scopeType: config?.scopeType === "HIERARCHY" ? "HIERARCHY" : "TENANT",
    ownershipLevelId: config?.ownershipLevelId ?? "",
    prefix: config?.prefix ?? "AUTO",
    yearFormat: config?.yearFormat ?? "YYYY",
    numberSeparator: config?.numberSeparator ?? "-",
    zeroPaddingLength: config?.zeroPaddingLength ?? 6,
    status: config?.status ?? "active",
    childGovernanceRules: (config?.childGovernanceRules ?? []).map((rule) => ({
      childLevelId: rule.childLevelId,
      childCanRequestLr: rule.childCanRequestLr ?? true,
      childCanConsumeLr: rule.childCanConsumeLr ?? true,
      parentCanGenerateLr: rule.parentCanGenerateLr ?? true,
      canApproveChildRequests: rule.canApproveChildRequests ?? true,
      canDelegateChildGovernance: rule.canDelegateChildGovernance ?? false,
      formatMode: rule.formatMode ?? "GLOBAL_PARENT_FORMAT",
      inheritParentFormat: rule.inheritParentFormat ?? true,
      canDefineChildFormat: rule.canDefineChildFormat ?? false,
      canConsumeParentLr: rule.canConsumeParentLr ?? true,
      canMaintainOwnSequence: rule.canMaintainOwnSequence ?? false,
      parentCanAllocateLrToChild: rule.parentCanAllocateLrToChild ?? true,
      canAllocateChildLr: rule.canAllocateChildLr ?? true,
      canConfigureChildWorkflow: rule.canConfigureChildWorkflow ?? false,
      allocationRequired: rule.allocationRequired ?? true,
      approvalRequired: rule.approvalRequired ?? true,
      canTransferLr: rule.canTransferLr ?? false,
    })),
    placeFormatOverrides: config?.placeFormatOverrides ?? [],
  };
}

function patchRule(
  setForm: React.Dispatch<React.SetStateAction<AutoConfigForm>>,
  childLevelId: string,
  patch: Partial<AutoChildRule>,
) {
  setForm((current) => ({
    ...current,
    childGovernanceRules: current.childGovernanceRules.map((rule) => rule.childLevelId === childLevelId ? { ...rule, ...patch } : rule),
  }));
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function CompactCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border bg-slate-50/80 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-semibold text-slate-950 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function SmallBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-white px-3 py-3">
      <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1.5 text-xs ${active ? "border-sky-300 bg-sky-100 text-sky-900" : "border-slate-200 bg-slate-50 text-slate-600"}`}
    >
      {label}
    </button>
  );
}

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
