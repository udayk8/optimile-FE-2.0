import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink, PencilLine, Save, ShieldCheck } from "lucide-react";
import { useSessionContext } from "@tms-booking/shared/auth/session-context";
import { PageHeader } from "@/shared/components/common/page-header";
import {
  PlatformEmptyState,
  PlatformInfoList,
  PlatformPanel,
  PlatformTimeline,
} from "@/modules/platform-admin/components/platform-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { usePlatformAuditLogs } from "@/modules/platform-admin/hooks/usePlatformAuditLogs";
import { usePlatformModules } from "@/modules/platform-admin/hooks/usePlatformModules";
import { usePlans } from "@/modules/platform-admin/hooks/usePlans";
import { useTenants } from "@/modules/platform-admin/hooks/useTenants";
import { getHierarchyTemplateLabel } from "@/shared/lib/hierarchy-templates";
import {
  getAssignmentModeLabel,
  getCommercialModeLabel,
  getTenantOperationalSummary,
  getTenantOwnershipSummary,
  getTenantTypeLabel,
  getTenantTypeMeta,
  tenantTypeOptions,
} from "@/shared/lib/tenant-config";
import type { HierarchyTemplateCode } from "@/types/tenant-workspace";

export function PlatformTenantDetailPage() {
  const { tenantId = "" } = useParams();
  const { setSession } = useSessionContext();
  const { data: modules } = usePlatformModules();
  const { data: plans } = usePlans();
  const { data: auditLogs } = usePlatformAuditLogs();
  const { getTenantById, getTenantPrimaryAdminUser, updateTenant } = useTenants();
  const tenant = getTenantById(tenantId);

  const [metaOpen, setMetaOpen] = useState(false);
  const [governanceOpen, setGovernanceOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [metaForm, setMetaForm] = useState({
    name: tenant?.name ?? "",
    code: tenant?.code ?? "",
    region: tenant?.region ?? "",
    industry: tenant?.industry ?? "",
  });
  const [governanceForm, setGovernanceForm] = useState({
    status: tenant?.status ?? "trial",
    planId: tenant?.planId ?? plans[0]?.id ?? "",
    tenantType: tenant?.tenantType ?? "DIRECT_CUSTOMER",
    customerPortalEnabled: tenant?.customerPortalEnabled ?? false,
    enabledModuleCodes: tenant?.enabledModuleCodes ?? [],
  });

  const primaryAdmin = tenant ? getTenantPrimaryAdminUser(tenant.id) : null;
  const tenantAudit = useMemo(
    () => auditLogs.filter((event) => event.tenantId === tenantId).slice(0, 6),
    [auditLogs, tenantId],
  );

  if (!tenant) {
    return (
      <PlatformEmptyState
        title="Tenant not found"
        description="This tenant record is not available in the current platform store. Return to the tenant directory and choose a valid tenant."
        action={
          <Button asChild>
            <Link to="/platform/tenants">Back to tenant directory</Link>
          </Button>
        }
      />
    );
  }
  const tenantRecord = tenant;

  function openTenantWorkspace() {
    setSession({
      actorType: "tenant_admin",
      tenantId: tenantRecord.id,
      actorName: `${tenantRecord.name} Admin`,
    });
  }

  function saveMetadata() {
    if (!metaForm.name.trim() || !metaForm.code.trim()) {
      setError("Tenant name and tenant code are required.");
      return;
    }

    try {
      updateTenant(tenantRecord.id, {
        name: metaForm.name,
        code: metaForm.code,
        region: metaForm.region,
        industry: metaForm.industry,
      });
      setFeedback("Tenant metadata saved successfully.");
      setError("");
      setMetaOpen(false);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Tenant metadata could not be updated.");
    }
  }

  function saveGovernance() {
    try {
      updateTenant(tenantRecord.id, {
        status: governanceForm.status,
        planId: governanceForm.planId,
        tenantType: governanceForm.tenantType,
        customerPortalEnabled: governanceForm.customerPortalEnabled,
        enabledModuleCodes: governanceForm.enabledModuleCodes,
      });
      setFeedback("Governance controls saved successfully.");
      setError("");
      setGovernanceOpen(false);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Governance controls could not be updated.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Governance"
        title={tenant.name}
        description="Platform-owned tenant detail workspace for commercial setup, module governance, bootstrap context, and control-plane activity."
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setMetaOpen(true)}>
              <PencilLine className="size-4" />
              Edit metadata
            </Button>
            <Button onClick={() => setGovernanceOpen(true)}>
              <Save className="size-4" />
              Edit tenant
            </Button>
            <Button asChild variant="secondary">
              <Link to={`/tenant/${tenant.id}/dashboard`} onClick={openTenantWorkspace}>
                <ExternalLink className="size-4" />
                Open tenant admin
              </Link>
            </Button>
          </div>
        }
      />

      {feedback ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          label="Status"
          value={tenant.status}
          tone={tenant.status === "active" ? "success" : tenant.status === "trial" ? "info" : "danger"}
        />
        <SummaryCard
          label="Plan"
          value={plans.find((plan) => plan.id === tenant.planId)?.name ?? tenant.planId}
          tone="accent"
        />
        <SummaryCard label="Tenant type" value={getTenantTypeLabel(tenant.tenantType)} tone="warning" />
        <SummaryCard label="Customer portal" value={tenant.customerPortalEnabled ? "Enabled" : "Disabled"} tone="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <PlatformPanel title="Overview" description="Platform-owned tenant identity and commercial summary.">
          <PlatformInfoList
            items={[
              { label: "Tenant name", value: tenant.name },
              { label: "Tenant code", value: tenant.code },
              { label: "Region", value: tenant.region },
              { label: "Industry", value: tenant.industry },
              {
                label: "Tenant type",
                value: getTenantTypeLabel(tenant.tenantType),
                helper: getTenantTypeMeta(tenant.tenantType).description,
              },
              { label: "Customer portal", value: tenant.customerPortalEnabled ? "Enabled" : "Disabled" },
              { label: "Assignment mode", value: getAssignmentModeLabel(tenant.assignmentMode) },
              { label: "Commercial mode", value: getCommercialModeLabel(tenant.commercialMode) },
              { label: "Operating style", value: getTenantTypeMeta(tenant.tenantType).operatingStyle },
              { label: "Created", value: new Date(tenant.createdAt).toLocaleString() },
              {
                label: "Primary admin",
                value: primaryAdmin ? `${primaryAdmin.name} - ${primaryAdmin.email}` : "Bootstrap user unavailable",
                helper: "Summarized from tenant-owned user records. Editing remains in tenant admin.",
              },
            ]}
          />
        </PlatformPanel>

        <PlatformPanel
          title="Governance controls"
          description="Platform actions allowed in this workspace."
          action={
            <Button size="sm" variant="outline" onClick={() => setGovernanceOpen(true)}>
              Edit tenant setup
            </Button>
          }
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border bg-background/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Commercial setup</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This platform workspace owns plan assignment and tenant status.
                  </p>
                </div>
                <Badge variant={tenant.status === "active" ? "success" : tenant.status === "trial" ? "info" : "danger"}>
                  {tenant.status}
                </Badge>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {plans.find((plan) => plan.id === tenant.planId)?.name ?? tenant.planId}
              </p>
            </div>

            <div className="rounded-2xl border border-sky-200/70 bg-sky-50/50 p-4">
              <p className="font-medium">Enabled modules</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Modules can be enabled or disabled here without entering tenant-owned administration.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {tenant.enabledModuleCodes.map((code) => (
                  <Badge key={code} variant="accent">
                    {modules.find((module) => module.code === code)?.name ?? code}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-amber-50 p-4">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{getTenantTypeLabel(tenant.tenantType)}</Badge>
                {tenant.customerPortalEnabled ? <Badge variant="info">Customer portal enabled</Badge> : null}
              </div>
              <p className="text-sm font-medium">{getTenantOperationalSummary(tenant)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{getTenantOwnershipSummary(tenant)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {getAssignmentModeLabel(tenant.assignmentMode)} - {getCommercialModeLabel(tenant.commercialMode)}
              </p>
            </div>

            <div className="rounded-2xl border bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 text-amber-700" />
                <div>
                  <p className="font-medium text-amber-900">Tenant-owned operations are summarized only</p>
                  <p className="mt-1 text-sm text-amber-800">
                    Hierarchy, org units, and the Access Control System (users, roles, and permissions) are managed inside the tenant admin portal and are intentionally not editable here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PlatformPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PlatformPanel title="Bootstrap context" description="Context captured during tenant creation and bootstrap provisioning.">
          <PlatformInfoList
            items={[
              {
                label: "Initial hierarchy template",
                value: getHierarchyTemplateLabel(tenant.initialHierarchyTemplate as HierarchyTemplateCode),
                helper: "Used only as the starting blueprint. Ongoing hierarchy management stays in tenant admin.",
              },
              {
                label: "First tenant login user",
                value: primaryAdmin ? `${primaryAdmin.name} - ${primaryAdmin.email}` : "Unavailable",
              },
              {
                label: "Operational summary",
                value: getTenantOperationalSummary(tenant),
              },
              {
                label: "Starter role",
                value: primaryAdmin?.roleId ?? "Unavailable",
                helper: "Persisted during tenant provisioning.",
              },
            ]}
          />
        </PlatformPanel>

        <PlatformPanel title="Operational links" description="Platform-side navigation continuity for this tenant.">
          <div className="grid gap-3">
            <ActionRow
              label="Open tenant admin portal"
              helper="Switch to the tenant-owned workspace for hierarchy, org units, users, roles, and permissions."
              action={
                <Button asChild variant="secondary" size="sm">
                  <Link to={`/tenant/${tenant.id}/dashboard`} onClick={openTenantWorkspace}>
                    <ExternalLink className="size-4" />
                    Open portal
                  </Link>
                </Button>
              }
            />
            <ActionRow
              label="View platform audit logs"
              helper="Inspect control-plane changes involving this tenant."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link to="/platform/audit-logs">Open audit logs</Link>
                </Button>
              }
            />
            <ActionRow
              label="Return to tenant directory"
              helper="Review adjacent tenant records or continue provisioning actions."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link to="/platform/tenants">Back to tenants</Link>
                </Button>
              }
            />
          </div>
        </PlatformPanel>
      </div>

      <PlatformPanel title="Platform activity for this tenant" description="Recent control-plane actions affecting this tenant record.">
        <PlatformTimeline
          items={tenantAudit.map((event) => ({
            id: event.id,
            title: `${event.action} - ${event.entityName}`,
            description: `${event.entityType} reference in platform governance`,
            meta: `${event.actor} - ${new Date(event.timestamp).toLocaleString()}`,
            badge: (
              <Badge
                variant={
                  event.result === "success"
                    ? "success"
                    : event.result === "warning"
                      ? "warning"
                      : "danger"
                }
              >
                {event.result}
              </Badge>
            ),
          }))}
        />
      </PlatformPanel>

      <Dialog
        open={metaOpen}
        onOpenChange={setMetaOpen}
        title="Edit tenant metadata"
        description="Update platform-owned tenant identity fields without changing tenant-owned administration."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setMetaOpen(false)}>Cancel</Button>
            <Button onClick={saveMetadata}>Save metadata</Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tenant name">
            <Input value={metaForm.name} onChange={(event) => setMetaForm((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="Tenant code">
            <Input value={metaForm.code} onChange={(event) => setMetaForm((current) => ({ ...current, code: event.target.value }))} />
          </Field>
          <Field label="Region">
            <Input value={metaForm.region} onChange={(event) => setMetaForm((current) => ({ ...current, region: event.target.value }))} />
          </Field>
          <Field label="Industry">
            <Input value={metaForm.industry} onChange={(event) => setMetaForm((current) => ({ ...current, industry: event.target.value }))} />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={governanceOpen}
        onOpenChange={setGovernanceOpen}
        title="Edit Tenant"
        description="Update tenant type, plan, customer portal access, status, and module enablement. Tenant workflow behavior changes based on this configuration."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setGovernanceOpen(false)}>Cancel</Button>
            <Button onClick={saveGovernance}>Save tenant changes</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-sky-200/70 bg-sky-50/60 p-4 text-sm text-sky-900">
            Changing tenant type here updates the tenant's operating behavior. `DIRECT_CUSTOMER` uses the simpler direct flow. `LOGISTICS_PROVIDER_3PL` uses the controlled assignment and buy/sell margin flow.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Status">
              <Select
                value={governanceForm.status}
                onChange={(event) =>
                  setGovernanceForm((current) => ({
                    ...current,
                    status: event.target.value as typeof current.status,
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="paused">Paused</option>
              </Select>
            </Field>
            <Field label="Plan">
              <Select value={governanceForm.planId} onChange={(event) => setGovernanceForm((current) => ({ ...current, planId: event.target.value }))}>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tenant type" helper="Classification controls onboarding guidance and workspace behavior messaging.">
              <Select
                value={governanceForm.tenantType}
                onChange={(event) =>
                  setGovernanceForm((current) => ({
                    ...current,
                    tenantType: event.target.value as typeof current.tenantType,
                  }))
                }
              >
                {tenantTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Customer portal access" helper="Primarily used when a 3PL tenant needs customer portal logins under the same tenant.">
              <div className="flex min-h-10 items-center justify-between rounded-2xl border bg-background/80 px-4 py-3">
                <span className="text-sm">{governanceForm.customerPortalEnabled ? "Enabled" : "Disabled"}</span>
                <Switch
                  checked={governanceForm.customerPortalEnabled}
                  onCheckedChange={(checked) =>
                    setGovernanceForm((current) => ({ ...current, customerPortalEnabled: checked }))
                  }
                />
              </div>
            </Field>
          </div>
          <Field label="Enabled modules" helper="Platform admins control module availability here.">
            <div className="grid gap-3 md:grid-cols-2">
              {modules.map((module) => {
                const checked = governanceForm.enabledModuleCodes.includes(module.code);
                const disabled = module.status !== "active" && !checked;
                return (
                  <button
                    key={module.id}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      setGovernanceForm((current) => ({
                        ...current,
                        enabledModuleCodes: checked
                          ? current.enabledModuleCodes.filter((code) => code !== module.code)
                          : [...current.enabledModuleCodes, module.code],
                      }))
                    }
                    className={`rounded-2xl border px-4 py-4 text-left ${checked ? "border-primary/40 bg-primary/8" : "bg-background/80"} ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{module.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                      </div>
                      <Badge variant={module.status === "active" ? "success" : "warning"}>{module.status}</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </Field>
          <p className="text-xs text-muted-foreground">
            Only active platform modules can be newly enabled. If a module is later deactivated in the platform catalog, linked tenant roles remain stored but access becomes restricted until remapped or re-enabled.
          </p>
        </div>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "info" | "danger" | "accent" | "warning" | "neutral";
}) {
  return (
    <div
      className={`rounded-3xl border-l-4 bg-card/95 p-5 shadow-panel ${
        tone === "success"
          ? "border-l-emerald-500"
          : tone === "info"
            ? "border-l-sky-500"
            : tone === "danger"
              ? "border-l-rose-500"
              : tone === "warning"
                ? "border-l-amber-500"
                : tone === "accent"
                  ? "border-l-primary"
                  : "border-l-slate-400"
      }`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
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

function ActionRow({
  label,
  helper,
  action,
}: {
  label: string;
  helper: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
      </div>
      {action}
    </div>
  );
}

