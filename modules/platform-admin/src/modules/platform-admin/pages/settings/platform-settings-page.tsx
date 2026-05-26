import { useEffect, useState, type ReactNode } from "react";
import { PageHeader } from "@/shared/components/common/page-header";
import { PlatformPanel } from "@/modules/platform-admin/components/platform-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { usePlatformModules } from "@/modules/platform-admin/hooks/usePlatformModules";
import { usePlatformSettings } from "@/modules/platform-admin/hooks/usePlatformSettings";
import { usePlans } from "@/modules/platform-admin/hooks/usePlans";

export function PlatformSettingsPage() {
  const { data: settings, savePlatformSettings } = usePlatformSettings();
  const { data: plans } = usePlans();
  const { data: modules } = usePlatformModules();
  const activeModules = modules.filter((module) => module.status === "active");
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(settings);

  function saveSettings() {
    try {
      savePlatformSettings(form);
      setMessage("Platform settings saved successfully.");
      setMessageTone("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Platform settings could not be saved.");
      setMessageTone("error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform Settings"
        title="Platform Settings"
        description="Manage platform-wide provisioning defaults, internal controls, and operator-facing communication settings."
        action={
          <div className="flex flex-wrap gap-3">
            <Badge variant={isDirty ? "warning" : "success"}>{isDirty ? "Unsaved changes" : "Saved"}</Badge>
            <Button onClick={saveSettings} disabled={!isDirty}>Save settings</Button>
          </div>
        }
      />

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            messageTone === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-rose-300 bg-rose-50 text-rose-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PlatformPanel
          title="Brand and support"
          description="Operator-facing defaults used in the platform layer."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Control plane name" helper="Displayed to Optimile operators in the platform workspace.">
              <Input value={form.brandingName} onChange={(event) => setForm((current) => ({ ...current, brandingName: event.target.value }))} />
            </Field>
            <Field label="Support email" helper="Primary support contact used in platform workflows and communications.">
              <Input value={form.supportEmail} onChange={(event) => setForm((current) => ({ ...current, supportEmail: event.target.value }))} />
            </Field>
          </div>
        </PlatformPanel>

        <PlatformPanel
          title="Provisioning defaults"
          description="Default values used when platform admins create new tenants."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Default trial plan">
              <Select value={form.defaultTrialPlanId} onChange={(event) => setForm((current) => ({ ...current, defaultTrialPlanId: event.target.value }))}>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Provisioning guard" helper="Operational gate for new tenant setup. Read-only semantics can be expanded later via APIs.">
              <Select value={form.tenantProvisioningGuard} onChange={(event) => setForm((current) => ({ ...current, tenantProvisioningGuard: event.target.value as typeof current.tenantProvisioningGuard }))}>
                <option value="standard">Standard</option>
                <option value="review_required">Review required</option>
              </Select>
            </Field>
          </div>
        </PlatformPanel>
      </div>

      <PlatformPanel
        title="Default module bundle"
        description="Baseline modules recommended during tenant provisioning. Tenant-specific enablement still happens per tenant."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeModules.map((module) => {
            const checked = form.defaultModuleCodes.includes(module.code);
            return (
              <button
                key={module.id}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    defaultModuleCodes: checked
                      ? current.defaultModuleCodes.filter((code) => code !== module.code)
                      : [...current.defaultModuleCodes, module.code],
                  }))
                }
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  checked ? "border-sky-300 bg-sky-50/60" : "bg-background hover:border-border hover:bg-slate-50/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{module.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                  </div>
                  <Badge variant="success">{module.status}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      </PlatformPanel>

      <PlatformPanel
        title="Operational controls"
        description="Low-risk internal controls for the platform layer."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SettingToggle
            title="Maintenance mode"
            description="Shows a clear operator-facing flag in the control plane. Tenant-side enforcement can be connected later through APIs."
            checked={form.maintenanceMode}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, maintenanceMode: checked }))}
          />
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-4 text-sm leading-6 text-amber-900">
            Hierarchy, org units, and the Access Control System (users, roles, and permissions) remain tenant-owned. This settings workspace only manages platform-wide defaults and operator preferences.
          </div>
        </div>
      </PlatformPanel>
    </div>
  );
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
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function SettingToggle({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200/80 bg-background px-4 py-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
