import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2, Hourglass, Package2, Plus, Settings } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { usePlatformModules } from "@/modules/platform-admin/hooks/usePlatformModules";
import { useTenants } from "@/modules/platform-admin/hooks/useTenants";
import { usePlatformPaths } from "@platform-admin/hooks/usePlatformPaths";
import { displayModule } from "@/modules/platform-admin/lib/module-display";
import { PageHeader } from "@/shared/components/common/page-header";

export function PlatformDashboardPage() {
  const { data: tenants, getTenantPrimaryAdminUser } = useTenants();
  const { data: modules } = usePlatformModules();
  const paths = usePlatformPaths();

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((tenant) => tenant.status === "active").length;
  const onboardingTenants = tenants.filter((tenant) => tenant.status === "trial").length;
  const activeModules = modules.filter((module) => module.status === "active").length;

  const recentTenants = [...tenants]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);

  const moduleAdoption = modules.map((module) => {
    const display = displayModule(module);
    return {
      code: display.code,
      name: display.name,
      status: module.status,
      tenantCount: tenants.filter((tenant) => tenant.enabledModuleCodes.includes(module.code)).length,
    };
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Platform"
        title="Dashboard"
        description="Overview of tenants and modules."
        action={
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link to={paths.tenants}>
                <Plus className="size-4" />
                Add Tenant
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={paths.modules}>
                <Settings className="size-4" />
                Manage Modules
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Tenants" value={totalTenants} icon={Building2} tone="slate" />
        <StatCard label="Active Tenants" value={activeTenants} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Onboarding" value={onboardingTenants} icon={Hourglass} tone="amber" />
        <StatCard label="Active Modules" value={activeModules} icon={Package2} tone="indigo" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-[13px] font-semibold text-slate-900">Recent tenants</h2>
              <p className="text-[11px] text-slate-500">Latest 5 tenants onboarded.</p>
            </div>
            <Link to={paths.tenants} className="text-[12px] font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-4 py-2.5">Tenant</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Admin</th>
                  <th className="px-4 py-2.5">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentTenants.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-[12px] text-slate-500">
                      No tenants yet.
                    </td>
                  </tr>
                ) : (
                  recentTenants.map((tenant) => {
                    const admin = getTenantPrimaryAdminUser(tenant.id);
                    return (
                      <tr key={tenant.id} className="border-b last:border-0 hover:bg-slate-50/60">
                        <td className="px-4 py-2.5">
                          <Link to={paths.tenant(tenant.id)} className="font-medium text-slate-900 hover:underline">
                            {tenant.name}
                          </Link>
                          <p className="text-[11px] text-slate-500">{tenant.code}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={tenant.status} />
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{admin?.name ?? "—"}</td>
                        <td className="px-4 py-2.5 text-slate-600">{formatDate(tenant.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-[13px] font-semibold text-slate-900">Module enablement</h2>
              <p className="text-[11px] text-slate-500">Tenants per module.</p>
            </div>
            <Link to={paths.modules} className="text-[12px] font-medium text-primary hover:underline">
              Manage
            </Link>
          </div>
          <ul className="divide-y">
            {moduleAdoption.length === 0 ? (
              <li className="px-4 py-6 text-center text-[12px] text-slate-500">No modules yet.</li>
            ) : (
              moduleAdoption.map((module) => (
                <li key={module.code} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{module.name}</p>
                    <p className="text-[11px] text-slate-500">{module.code}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={module.status === "active" ? "success" : "warning"}>{module.status}</Badge>
                    <span className="min-w-[3.5rem] text-right text-slate-700">{module.tenantCount} tenants</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone: "slate" | "emerald" | "amber" | "indigo";
}) {
  const palette = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    indigo: "bg-indigo-100 text-indigo-700",
  }[tone];

  return (
    <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-slate-900">{value}</p>
      </div>
      <div className={`flex size-9 items-center justify-center rounded-lg ${palette}`}>
        <Icon className="size-4" />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "trial" | "paused" }) {
  if (status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "trial") return <Badge variant="info">Onboarding</Badge>;
  return <Badge variant="warning">Inactive</Badge>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}
