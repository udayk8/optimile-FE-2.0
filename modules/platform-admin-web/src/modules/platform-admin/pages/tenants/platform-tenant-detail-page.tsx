import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { usePlatformPaths } from "../../../../hooks/usePlatformPaths";
import { ExternalLink, PencilLine, Save, ShieldCheck } from "lucide-react";
import { useSessionContext } from "../../../../shared/auth/session-context";
import { PageHeader } from "../../../../components/common/page-header";
import {
  PlatformEmptyState,
  PlatformInfoList,
  PlatformPanel,
  PlatformTimeline,
} from "../../../../components/platform/platform-primitives";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Dialog } from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Select } from "../../../../components/ui/select";
import { usePlatformAuditLogs } from "../../hooks/usePlatformAuditLogs";
import { usePlatformModules } from "../../hooks/usePlatformModules";
import { usePlans } from "../../hooks/usePlans";
import { useTenants } from "../../hooks/useTenants";
import { getHierarchyTemplateLabel } from "../../../../lib/hierarchy-templates";
import type { HierarchyTemplateCode } from "../../../../types/tenant-workspace";

export function PlatformTenantDetailPage() {
  const { tenantId = "" } = useParams();
  const paths = usePlatformPaths();
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
            <Link to={paths.tenants}>Back to tenant directory</Link>
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
              Update governance
            </Button>
            <Button asChild variant="secondary">
              <Link to={paths.tenantWorkspace(tenant.id)} onClick={openTenantWorkspace}>
                <ExternalLink className="size-4" />
                Open tenant admin
              </Link>
            </Button>
          </div>
        }
      />

      {feedback ? (
        <div className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
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
        <SummaryCard label="Enabled modules" value={String(tenant.enabledModuleCodes.length)} tone="warning" />
        <SummaryCard label="Bootstrap admin" value={primaryAdmin?.name ?? "Unavailable"} tone="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <PlatformPanel title="Overview" description="Platform-owned tenant identity and commercial summary.">
          <PlatformInfoList
            items={[
              { label: "Tenant name", value: tenant.name },
              { label: "Tenant code", value: tenant.code },
              { label: "Region", value: tenant.region },
              { label: "Industry", value: tenant.industry },
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
              Edit plan, status, and modules
            </Button>
          }
        >
          <div className="grid gap-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
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

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="font-bold text-text">Enabled modules</p>
              <p className="mt-1 text-sm text-gray-600">
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

            <div className="rounded-xl border border-warning/20 bg-warning/10 p-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 text-warning" />
                <div>
                  <p className="font-bold text-warning">Tenant-owned operations are summarized only</p>
                  <p className="mt-1 text-sm text-warning">
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
                  <Link to={paths.tenantWorkspace(tenant.id)} onClick={openTenantWorkspace}>
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
                  <Link to={paths.auditLogs}>Open audit logs</Link>
                </Button>
              }
            />
            <ActionRow
              label="Return to tenant directory"
              helper="Review adjacent tenant records or continue provisioning actions."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link to={paths.tenants}>Back to tenants</Link>
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
        title="Update tenant governance"
        description="Adjust platform-level commercial setup and module enablement."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setGovernanceOpen(false)}>Cancel</Button>
            <Button onClick={saveGovernance}>Save governance</Button>
          </div>
        }
      >
        <div className="grid gap-4">
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
                    className={`rounded-xl border px-4 py-4 text-left ${checked ? "border-primary bg-primary/10" : "border-gray-200 bg-white hover:bg-gray-50"} ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
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
      className={`rounded-xl border bg-white p-5 shadow-sm ${
        tone === "success"
          ? "border-success/20"
          : tone === "info"
            ? "border-primary/20"
            : tone === "danger"
              ? "border-danger/20"
              : tone === "warning"
                ? "border-warning/20"
                : tone === "accent"
                  ? "border-primary/20"
                  : "border-gray-200"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-text">{value}</p>
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
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
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
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-bold text-text">{label}</p>
        <p className="mt-1 text-sm text-gray-600">{helper}</p>
      </div>
      {action}
    </div>
  );
}
