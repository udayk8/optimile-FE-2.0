import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Building2, CheckCircle2, Hourglass, Package2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { usePlatformModules } from "@/modules/platform-admin/hooks/usePlatformModules";
import { useTenants } from "@/modules/platform-admin/hooks/useTenants";
import { usePlatformPaths } from "@platform-admin/hooks/usePlatformPaths";
import { displayModule } from "@/modules/platform-admin/lib/module-display";

const REQUIRED_MODULE_CODE = "ADMIN";

export function PlatformDashboardPage() {
  const { data: tenants, getTenantPrimaryAdminUser } = useTenants();
  const { data: modules } = usePlatformModules();
  const paths = usePlatformPaths();

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((tenant) => tenant.status === "active").length;
  const onboardingTenants = tenants.filter((tenant) => tenant.status === "trial").length;
  const inactiveTenants = tenants.filter((tenant) => tenant.status === "paused").length;
  const activeModules = modules.filter((module) => module.status === "active").length;

  const recentTenants = [...tenants]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);

  const moduleAdoption = modules
    .map((module) => {
      const display = displayModule(module);
      // ADMIN is required for every tenant (see ensureRequiredModuleCodes on the
      // Tenants page), so it is always implicitly enabled — count it for all.
      const tenantCount =
        module.code === REQUIRED_MODULE_CODE
          ? totalTenants
          : tenants.filter((tenant) => tenant.enabledModuleCodes.includes(module.code)).length;
      return {
        code: display.code,
        name: display.name,
        status: module.status,
        tenantCount,
      };
    })
    .sort((left, right) => right.tenantCount - left.tenantCount || left.name.localeCompare(right.name));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-900">Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">Overview of tenants and module adoption across the platform.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Tenants"
          value={totalTenants}
          hint={`${activeTenants} currently active`}
          icon={Building2}
          tone="slate"
          to={paths.tenants}
        />
        <StatCard
          label="Active Tenants"
          value={activeTenants}
          hint={`${formatShare(activeTenants, totalTenants)} of all tenants`}
          icon={CheckCircle2}
          tone="emerald"
          to={`${paths.tenants}?status=active`}
        />
        <StatCard
          label="Onboarding"
          value={onboardingTenants}
          hint={onboardingTenants === 0 ? "All tenants set up" : "Awaiting activation"}
          icon={Hourglass}
          tone="amber"
          to={`${paths.tenants}?status=trial`}
        />
        <StatCard
          label="Active Modules"
          value={activeModules}
          hint={`${modules.length} in catalog`}
          icon={Package2}
          tone="indigo"
          to={`${paths.modules}?status=active`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Recent tenants"
          caption="Most recently onboarded"
          action={
            <Link to={paths.tenants} className="text-[12px] font-medium text-primary hover:underline">
              View all
            </Link>
          }
          bodyClassName="p-0"
        >
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-2.5">Tenant</th>
                <th className="px-4 py-2.5">Business Type</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentTenants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-[12px] text-slate-500">
                    No tenants yet.
                  </td>
                </tr>
              ) : (
                recentTenants.map((tenant) => {
                  const admin = getTenantPrimaryAdminUser(tenant.id);
                  return (
                    <tr key={tenant.id} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <Link to={paths.tenant(tenant.id)} className="flex items-center gap-3 group">
                          <Avatar name={tenant.name} />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 group-hover:underline">{tenant.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {tenant.code}
                              {admin?.name ? ` · ${admin.name}` : ""}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{businessTypeLabel(tenant)}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={tenant.status} />
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{formatDate(tenant.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Panel>

        <Panel title="Tenant status" caption="Distribution across the portfolio">
          <DistributionBar
            total={totalTenants}
            segments={[
              { label: "Active", value: activeTenants, className: "bg-emerald-500", to: `${paths.tenants}?status=active` },
              { label: "Onboarding", value: onboardingTenants, className: "bg-amber-400", to: `${paths.tenants}?status=trial` },
              { label: "Inactive", value: inactiveTenants, className: "bg-slate-300", to: `${paths.tenants}?status=paused` },
            ]}
          />
        </Panel>
      </div>

      <Panel
        title="Module adoption"
        caption="Tenants enabled per module"
        action={
          <Link to={paths.modules} className="text-[12px] font-medium text-primary hover:underline">
            Manage modules
          </Link>
        }
      >
        {moduleAdoption.length === 0 ? (
          <p className="text-[12px] text-slate-500">No modules yet.</p>
        ) : (
          <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
            {moduleAdoption.map((module) => (
              <AdoptionRow
                key={module.code}
                name={module.name}
                code={module.code}
                status={module.status}
                count={module.tenantCount}
                total={totalTenants}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  to,
}: {
  label: string;
  value: number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  tone: "slate" | "emerald" | "amber" | "indigo";
  to: string;
}) {
  const palette = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    indigo: "bg-indigo-100 text-indigo-700",
  }[tone];

  return (
    <Link
      to={to}
      title={`View ${label}`}
      className="group relative flex flex-col justify-between rounded-xl border bg-card px-4 py-3.5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <ArrowUpRight className="absolute right-3 top-3 size-4 text-slate-300 opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${palette}`}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em] text-slate-900">{value}</p>
      <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>
    </Link>
  );
}

function Panel({
  title,
  caption,
  action,
  children,
  bodyClassName,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>
          {caption ? <p className="text-[11px] text-slate-500">{caption}</p> : null}
        </div>
        {action}
      </div>
      <div className={bodyClassName ?? "p-4"}>{children}</div>
    </section>
  );
}

function DistributionBar({
  total,
  segments,
}: {
  total: number;
  segments: Array<{ label: string; value: number; className: string; to: string }>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        {total === 0 ? (
          <div className="w-full bg-slate-100" />
        ) : (
          segments
            .filter((segment) => segment.value > 0)
            .map((segment) => (
              <div
                key={segment.label}
                className={segment.className}
                style={{ width: `${(segment.value / total) * 100}%` }}
                title={`${segment.label}: ${segment.value}`}
              />
            ))
        )}
      </div>
      <div className="space-y-1">
        {segments.map((segment) => (
          <Link
            key={segment.label}
            to={segment.to}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] transition hover:bg-slate-50"
          >
            <span className="flex items-center gap-2 text-slate-600">
              <span className={`size-2.5 rounded-full ${segment.className}`} />
              {segment.label}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-medium text-slate-900">{segment.value}</span>
              <span className="w-9 text-right text-[11px] text-slate-400">{formatShare(segment.value, total)}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AdoptionRow({
  name,
  code,
  status,
  count,
  total,
}: {
  name: string;
  code: string;
  status: "active" | "inactive";
  count: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-medium text-slate-900">{name}</span>
          {status === "inactive" ? <Badge variant="warning">inactive</Badge> : null}
        </div>
        <span className="shrink-0 text-[12px] text-slate-500">
          {count} {count === 1 ? "tenant" : "tenants"}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${status === "active" ? "bg-primary" : "bg-slate-300"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-8 text-right text-[11px] tabular-nums text-slate-400">{pct}%</span>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-semibold uppercase text-slate-600">
      {initials(name)}
    </span>
  );
}

function StatusBadge({ status }: { status: "active" | "trial" | "paused" }) {
  if (status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "trial") return <Badge variant="info">Onboarding</Badge>;
  return <Badge variant="warning">Inactive</Badge>;
}

function businessTypeLabel(tenant: { tenantType: string; customerPortalEnabled: boolean }) {
  if (tenant.tenantType === "DIRECT_CUSTOMER") {
    return tenant.customerPortalEnabled ? "Fleet Management" : "Direct Enterprise";
  }
  return "3PL / Logistics Provider";
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2);
  return `${words[0][0]}${words[words.length - 1][0]}`;
}

function formatShare(value: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}
