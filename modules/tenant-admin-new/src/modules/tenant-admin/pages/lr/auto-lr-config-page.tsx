import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  const [form, setForm] = useState<AutoConfigForm>(() => buildAutoFormState(autoConfig));
  useEffect(() => { setForm(buildAutoFormState(autoConfig)); }, [autoConfig]);

  const availableTargetLevels = useMemo(() => {
    const sorted = hierarchyLevels.filter((level) => level.active).sort((a, b) => a.order - b.order);
    if (!sorted.length) return [];
    if (!currentGovernanceLevel) return sorted;
    return sorted.filter((level) => level.order > currentGovernanceLevel.order);
  }, [currentGovernanceLevel, hierarchyLevels]);

  const managedTargetLevel =
    form.scopeType === "HIERARCHY"
      ? hierarchyLevels.find((level) => level.id === form.ownershipLevelId) ?? availableTargetLevels[0] ?? null
      : null;
  const managedTargetLevelId = managedTargetLevel?.id ?? "";
  const childLevelLabel = managedTargetLevel?.name ?? "Child level";
  const isAtCompanyRoot = !currentGovernanceLevel;
  const currentLevelLabel = isAtCompanyRoot ? "Company Root" : (currentGovernanceLevel?.name ?? tenantRootLevelName);
  const currentScopeLabel = activeGovernanceOrgUnit
    ? `${activeGovernanceOrgUnit.name} (${currentLevelLabel})`
    : isAtCompanyRoot ? tenant.name : tenantRootLevelName;
  const managedChildRule =
    form.childGovernanceRules.find((rule) => rule.childLevelId === managedTargetLevelId) ?? null;

  useEffect(() => {
    if (!managedTargetLevelId) return;
    setForm((current) => {
      const existing = current.childGovernanceRules.find((rule) => rule.childLevelId === managedTargetLevelId);
      if (existing) return current;
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
    { ...buildAutoLrConfigInput(autoConfig), ...form, lrType: "AUTO" } as never,
    activeGovernanceOrgUnit?.id ?? null,
    orgUnits,
  );
  const currentFormatPreview = buildManualLrPreview(currentFormat);
  const runtimePreview = autoConfig
    ? buildAutoLrRuntimePreview({
        config: autoConfig,
        orgUnitId: activeGovernanceOrgUnit?.id ?? null,
        orgUnits,
        generatedRecords: store.lrs.filter((record) => record.configId === autoConfig.id),
      })
    : null;

  const setPlaceCode = (orgUnitId: string, prefix: string) =>
    setForm((current) => {
      const overrides = current.placeFormatOverrides ?? [];
      const exists = overrides.some((item) => item.orgUnitId === orgUnitId);
      return {
        ...current,
        placeFormatOverrides: exists
          ? overrides.map((item) => (item.orgUnitId === orgUnitId ? { ...item, prefix } : item))
          : [...overrides, { orgUnitId, prefix }],
      };
    });

  const previewForOrgUnit = (orgUnitId: string) =>
    buildManualLrPreview(
      resolveManualLrFormatForOrgUnit(
        { ...buildAutoLrConfigInput(autoConfig), ...form, lrType: "AUTO" } as never,
        orgUnitId,
        orgUnits,
      ),
    );

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
      if (autoConfig) { updateLRConfig(autoConfig.id, payload); setMessage("Auto LR configuration updated."); }
      else { createLRConfig(payload); setMessage("Auto LR configuration created."); }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Auto LR configuration could not be saved.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[14px] font-semibold text-slate-900">Auto LR</h1>
        <Button size="sm" onClick={saveConfig} disabled={!canEdit}>Save</Button>
      </div>

      {message ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">{message}</div>
      ) : null}

      {/* Step 1 — LR Number Format */}
      <SectionCard step={1} title="LR Number Format">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Prefix">
            <Input value={form.prefix} onChange={(event) => setForm((current) => ({ ...current, prefix: event.target.value }))} disabled={!canEdit} />
          </Field>
          <Field label="Pad">
            <Input type="number" min={1} max={10} value={String(form.zeroPaddingLength)} onChange={(event) => setForm((current) => ({ ...current, zeroPaddingLength: Math.max(1, Number(event.target.value || 1)) }))} disabled={!canEdit} />
          </Field>
          <div className="mb-0.5 font-mono text-base font-bold text-slate-900">{currentFormatPreview}</div>
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
              description={`Each ${level.name} generates own LR at runtime`}
              onClick={() => setForm((current) => ({ ...current, scopeType: "HIERARCHY", ownershipLevelId: level.id }))}
              disabled={!canEdit}
            />
          ))}
        </div>
      </SectionCard>

      {/* Step 3 — Governance (only when distributed) */}
      {form.scopeType === "HIERARCHY" && managedChildRule ? (
        <SectionCard step={3} title={`Governance — ${currentLevelLabel} → ${childLevelLabel}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-slate-50 px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{currentLevelLabel}</div>
              <div className="flex flex-wrap gap-1.5">
                <ToggleChip label="Generate" active={managedChildRule.parentCanGenerateLr} onClick={() => patchRule(setForm, managedChildRule.childLevelId, { parentCanGenerateLr: !managedChildRule.parentCanGenerateLr })} disabled={!canEdit} />
                <ToggleChip label="Approve Requests" active={managedChildRule.canApproveChildRequests} onClick={() => patchRule(setForm, managedChildRule.childLevelId, { canApproveChildRequests: !managedChildRule.canApproveChildRequests })} disabled={!canEdit} />
              </div>
            </div>
            <div className="rounded-lg border bg-slate-50 px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{childLevelLabel}</div>
              <div className="flex flex-wrap gap-1.5">
                <ToggleChip label="Request" active={managedChildRule.childCanRequestLr} onClick={() => patchRule(setForm, managedChildRule.childLevelId, { childCanRequestLr: !managedChildRule.childCanRequestLr })} disabled={!canEdit} />
                <ToggleChip label="Use" active={managedChildRule.childCanConsumeLr} onClick={() => patchRule(setForm, managedChildRule.childLevelId, { childCanConsumeLr: !managedChildRule.childCanConsumeLr })} disabled={!canEdit} />
                <ToggleChip label="Manage Child" active={managedChildRule.canDelegateChildGovernance} onClick={() => patchRule(setForm, managedChildRule.childLevelId, { canDelegateChildGovernance: !managedChildRule.canDelegateChildGovernance })} disabled={!canEdit} />
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {/* Step 4 — Format Strategy (only when distributed) */}
      {form.scopeType === "HIERARCHY" && managedChildRule ? (
        <SectionCard step={4} title={`Format for ${childLevelLabel}`}>
          <div className="grid gap-2 sm:grid-cols-3">
            {buildAutoChildStrategyCards(childLevelLabel).map((card) => (
              <label
                key={card.mode}
                className={`cursor-pointer rounded-xl border px-3 py-3 ${managedChildRule.formatMode === card.mode ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <div className="text-sm font-semibold text-slate-950">{card.title}</div>
                <div className="mt-2 rounded-lg border bg-white/80 px-2.5 py-1.5 font-mono text-[11px]">{card.example}</div>
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
          {managedChildRule.formatMode === "GLOBAL_PARENT_FORMAT" ? (
            <div className="mt-2 rounded-lg border border-dashed bg-slate-50/60 px-3 py-2 text-[12px] text-slate-400">
              All {childLevelLabel} places use <span className="font-mono font-semibold text-slate-700">{currentFormatPreview}</span>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {/* Step 5 — Place Codes (only when Parent+Code or Independent) */}
      {form.scopeType === "HIERARCHY" && managedChildRule && (managedChildRule.formatMode === "PARENT_PREFIX_CHILD_SUFFIX" || managedChildRule.formatMode === "FULL_CHILD_FORMAT") ? (
        <SectionCard step={5} title={`Place Codes — ${childLevelLabel}`}>
          {!ownershipOrgUnits.length ? (
            <div className="rounded-lg border border-dashed bg-slate-50/60 px-3 py-2 text-[12px] text-slate-400">
              No places found at the {childLevelLabel} level.
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="hidden md:grid gap-2 px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground md:grid-cols-[1fr_140px_1fr]">
                <div>Place</div>
                <div>{managedChildRule.formatMode === "PARENT_PREFIX_CHILD_SUFFIX" ? "Code" : "Prefix"}</div>
                <div>Preview</div>
              </div>
              {ownershipOrgUnits.map((unit) => {
                const override = (form.placeFormatOverrides ?? []).find((item) => item.orgUnitId === unit.id);
                return (
                  <div key={unit.id} className="grid items-end gap-2 rounded-xl border bg-white p-3 md:grid-cols-[1fr_140px_1fr]">
                    <div className="text-sm font-semibold text-slate-950">{unit.name}</div>
                    <Field label={managedChildRule.formatMode === "PARENT_PREFIX_CHILD_SUFFIX" ? "Code" : "Prefix"}>
                      <Input
                        value={override?.prefix ?? ""}
                        placeholder={unit.name.toUpperCase().replace(/[^A-Z0-9]/g, "")}
                        onChange={(event) => setPlaceCode(unit.id, event.target.value.toUpperCase())}
                        disabled={!canEdit}
                      />
                    </Field>
                    <div className="flex items-end pb-1 font-mono text-sm font-semibold text-slate-900">{previewForOrgUnit(unit.id)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      ) : null}

      {/* Runtime Preview — always visible */}
      <div className="rounded-xl border bg-slate-50/60 px-4 py-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Runtime Preview</div>
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[12px]">
          <span className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Context</span>
            <span className="font-semibold text-slate-900">{currentScopeLabel}</span>
          </span>
          <span className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pattern</span>
            <span className="font-mono font-semibold text-slate-900">{runtimePreview?.formatPreview ?? currentFormatPreview}</span>
          </span>
          <span className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Next</span>
            <span className="font-mono font-semibold text-slate-900">{runtimePreview?.nextNumber ?? currentFormatPreview}</span>
          </span>
        </div>
      </div>
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

function ToggleChip({ label, active, onClick, disabled }: { label: string; active: boolean; onClick: () => void; disabled: boolean }) {
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
