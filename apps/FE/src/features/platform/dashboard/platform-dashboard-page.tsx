import { Link } from "react-router-dom";
import { Activity, AlertTriangle, Building2, Package2, ReceiptText, ShieldCheck } from "lucide-react";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import {
  PlatformInfoList,
  PlatformPanel,
  PlatformQuickLink,
  PlatformTimeline,
} from "@/components/platform/platform-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlatformAuditLogs } from "@/hooks/usePlatformAuditLogs";
import { usePlatformModules } from "@/hooks/usePlatformModules";
import { usePlans } from "@/hooks/usePlans";
import { useTenants } from "@/hooks/useTenants";

export function PlatformDashboardPage() {
  const { data: tenants, getTenantPrimaryAdminUser } = useTenants();
  const { data: modules } = usePlatformModules();
  const { data: plans } = usePlans();
  const { data: auditLogs } = usePlatformAuditLogs();

  const activeTenants = tenants.filter((tenant) => tenant.status === "active");
  const suspendedTenants = tenants.filter((tenant) => tenant.status === "paused");
  const trialTenants = tenants.filter((tenant) => tenant.status === "trial");
  const enabledModuleCount = tenants.reduce(
    (total, tenant) => total + tenant.enabledModuleCodes.length,
    0,
  );
  const recentTenants = [...tenants]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 4);
  const recentAudit = [...auditLogs]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 5);
  const planDistribution = plans.map((plan) => ({
    ...plan,
    tenantCount: tenants.filter((tenant) => tenant.planId === plan.id).length,
  }));
  const moduleDistribution = modules
    .map((module) => ({
      ...module,
      tenantCount: tenants.filter((tenant) => tenant.enabledModuleCodes.includes(module.code)).length,
    }))
    .sort((left, right) => right.tenantCount - left.tenantCount)
    .slice(0, 5);
  const attentionTenants = tenants
    .filter((tenant) => tenant.status !== "active" || tenant.health.auditEvents24h > 20)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Optimile Super Admin"
        title="Platform Dashboard"
        description="Monitor tenant health, commercial coverage, module adoption, and platform activity without stepping into tenant-owned administration."
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/platform/tenants">Review tenants</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/platform/audit-logs">View platform activity</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active tenants"
          value={activeTenants.length}
          icon={Building2}
          note={`${trialTenants.length} in trial, ${suspendedTenants.length} paused`}
          tone="success"
        />
        <MetricCard
          label="Enabled module assignments"
          value={enabledModuleCount}
          icon={Package2}
          note={`${modules.length} catalog modules available`}
          tone="info"
        />
        <MetricCard
          label="Plans in use"
          value={planDistribution.filter((plan) => plan.tenantCount > 0).length}
          icon={ReceiptText}
          note="Commercial footprint across tenant portfolio"
          tone="accent"
        />
        <MetricCard
          label="Platform audit events"
          value={auditLogs.length}
          icon={Activity}
          note="Governance actions recorded in the control plane"
          tone="warning"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <PlatformPanel
          title="Operational focus"
          description="The control plane highlights where Optimile admins should intervene next."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <PlatformQuickLink
              title="Tenant governance"
              description="Review newly created tenants, paused tenants, and accounts with elevated activity."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link to="/platform/tenants">Open tenant directory</Link>
                </Button>
              }
            />
            <PlatformQuickLink
              title="Commercial setup"
              description="Inspect plan mix, verify module coverage, and prepare provisioning defaults."
              action={
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/platform/plans">Plans</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/platform/modules">Modules</Link>
                  </Button>
                </div>
              }
            />
            <PlatformQuickLink
              title="Platform settings"
              description="Adjust branding, default provisioning settings, and internal operating guardrails."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link to="/platform/settings">Open settings</Link>
                </Button>
              }
            />
            <PlatformQuickLink
              title="Platform boundary"
              description="Hierarchy, org units, users, roles, and tenant data scope remain tenant-owned. Platform surfaces only summarize them."
              action={<Badge variant="secondary">Tenant-owned operations stay outside this workspace</Badge>}
            />
          </div>
        </PlatformPanel>

        <PlatformPanel
          title="Tenants needing attention"
          description="Platform-side flags based on tenant status and recent activity volume."
        >
          {attentionTenants.length ? (
            <div className="space-y-3">
              {attentionTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className={`rounded-xl border-l-[3px] border bg-background p-4 ${
                    tenant.status === "paused"
                      ? "border-l-rose-500/70"
                      : tenant.status === "trial"
                        ? "border-l-sky-500/70"
                        : "border-l-amber-500/70"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {tenant.code} · {tenant.region} · {tenant.health.auditEvents24h} audit events in 24h
                      </p>
                    </div>
                    <Badge
                      variant={
                        tenant.status === "active"
                          ? "success"
                          : tenant.status === "trial"
                            ? "info"
                            : "danger"
                      }
                    >
                      {tenant.status}
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/platform/tenants/${tenant.id}`}>Review tenant</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-emerald-50 p-4 text-sm text-emerald-800">
              No tenant currently requires immediate attention.
            </div>
          )}
        </PlatformPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PlatformPanel
          title="Plan distribution"
          description="Commercial mix across the current tenant portfolio."
        >
          <PlatformInfoList
            items={planDistribution.map((plan) => ({
              label: plan.name,
              helper: `${plan.code} · $${plan.monthlyPriceUsd}/mo · ${plan.seatsIncluded} seats`,
              value: (
                <div className="flex items-center gap-3">
                  <span>{plan.tenantCount} tenants</span>
                  <Badge variant={plan.tenantCount ? "secondary" : "outline"}>
                    {plan.tenantCount ? "In use" : "Unused"}
                  </Badge>
                </div>
              ),
            }))}
          />
        </PlatformPanel>

        <PlatformPanel
          title="Most adopted modules"
          description="Top platform modules by tenant enablement."
        >
          <PlatformInfoList
            items={moduleDistribution.map((module) => ({
              label: module.name,
              helper: module.description,
              value: (
                <div className="flex items-center gap-3">
                  <span>{module.tenantCount} tenants</span>
                  <Badge variant={module.status === "active" ? "success" : "warning"}>
                    {module.status}
                  </Badge>
                </div>
              ),
            }))}
          />
        </PlatformPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <PlatformPanel
          title="Recent tenant activity"
          description="Newly created or recently provisioned tenants in the platform layer."
        >
          <div className="space-y-3">
            {recentTenants.map((tenant) => {
              const primaryAdmin = getTenantPrimaryAdminUser(tenant.id);
              return (
                <div key={tenant.id} className="rounded-2xl border bg-background/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {tenant.code} · {formatTimestamp(tenant.createdAt)}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Primary admin: {primaryAdmin?.name ?? "Bootstrap user not available"}
                      </p>
                    </div>
                    <Badge variant="outline">{tenant.planId}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </PlatformPanel>

        <PlatformPanel
          title="Platform activity feed"
          description="Most recent platform-level actions performed by Optimile administrators."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/platform/audit-logs">Open full audit log</Link>
            </Button>
          }
        >
          <PlatformTimeline
            items={recentAudit.map((event) => ({
              id: event.id,
              title: `${event.action} · ${event.entityName}`,
              description:
                event.tenantId
                  ? `Tenant reference: ${event.tenantId}`
                  : "Global platform event with no tenant-specific ownership.",
              meta: `${event.actor} · ${formatTimestamp(event.timestamp)}`,
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
      </div>

      <PlatformPanel
        title="Control plane rules"
        description="Quick reference for what this workspace owns and what stays with tenant admins."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <BoundaryCard
            title="Platform-owned"
            items={["Tenant provisioning", "Plan assignment", "Module enablement", "Platform settings"]}
          />
          <BoundaryCard
            title="Tenant-owned"
            items={["Hierarchy structure", "Org units", "Access Control System", "Role-to-level assignments"]}
          />
          <BoundaryCard
            title="Escalation path"
            items={["Review tenant detail", "Open tenant admin portal", "Inspect platform audit timeline"]}
            accent
          />
        </div>
      </PlatformPanel>
    </div>
  );
}

function BoundaryCard({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-amber-300 bg-amber-50" : "bg-background/80"}`}>
      <div className="flex items-center gap-2">
        {accent ? <AlertTriangle className="size-4 text-amber-700" /> : <ShieldCheck className="size-4 text-primary" />}
        <p className="font-medium">{title}</p>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}
