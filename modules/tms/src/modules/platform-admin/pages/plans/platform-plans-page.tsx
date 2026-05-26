import { PageHeader } from "@/shared/components/common/page-header";
import { PlatformPanel } from "@/modules/platform-admin/components/platform-primitives";
import { Badge } from "@/shared/components/ui/badge";
import { usePlans } from "@/modules/platform-admin/hooks/usePlans";
import { useTenants } from "@/modules/platform-admin/hooks/useTenants";

export function PlatformPlansPage() {
  const { data: plans } = usePlans();
  const { data: tenants } = useTenants();

  const enrichedPlans = plans.map((plan) => ({
    ...plan,
    tenantCount: tenants.filter((tenant) => tenant.planId === plan.id).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Subscriptions"
        title="Plans"
        description="Commercial plan catalog for tenant provisioning, package visibility, and portfolio coverage review."
      />

      <PlatformPanel
        title="Plan catalog"
        description="Commercial plans are platform-owned and define the base package available during tenant provisioning."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                {["Plan", "Price", "Seats", "Features", "Tenants"].map((header) => (
                  <th key={header} className="border-b border-border/70 bg-background px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em]">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enrichedPlans.map((plan, index) => (
                <tr key={plan.id} className={`transition-colors hover:bg-primary/[0.035] ${index ? "border-t border-border/65" : ""}`}>
                  <td className="px-4 py-3.5">
                    <div className="min-w-[160px]">
                      <p className="font-medium">{plan.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{plan.code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-medium">${plan.monthlyPriceUsd}/mo</td>
                  <td className="px-4 py-3.5">{plan.seatsIncluded}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex min-w-[260px] flex-wrap gap-1.5">
                      {plan.features.map((feature) => (
                        <Badge key={feature} variant="accent">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={plan.tenantCount ? "success" : "neutral"}>{plan.tenantCount} tenants</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PlatformPanel>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <PlatformPanel
          title="Distribution"
          description="Current tenant portfolio split across commercial tiers."
        >
          <div className="space-y-3">
            {enrichedPlans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl border-l-4 bg-background px-4 py-3.5 ${
                  plan.tenantCount ? "border-l-primary" : "border-l-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      ${plan.monthlyPriceUsd}/mo Â· {plan.seatsIncluded} seats
                    </p>
                  </div>
                  <Badge variant={plan.tenantCount ? "success" : "neutral"}>{plan.tenantCount} tenants</Badge>
                </div>
              </div>
            ))}
          </div>
        </PlatformPanel>

        <PlatformPanel
          title="Commercial guidance"
          description="Reference points for provisioning and plan review."
        >
          <div className="grid gap-3">
            {[
              "Plans define the commercial package available during tenant provisioning.",
              "Tenant distribution shows which plans are actively in use across the portfolio.",
              "Included features indicate the expected baseline feature set for each tier.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-sky-200/70 bg-sky-50/45 px-4 py-3 text-sm text-muted-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </PlatformPanel>
      </div>
    </div>
  );
}
