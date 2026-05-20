import { PageHeader } from "../../../../components/common/page-header";
import { PlatformPanel } from "../../../../components/platform/platform-primitives";
import { Badge } from "../../../../components/ui/badge";
import { usePlans } from "../../hooks/usePlans";
import { useTenants } from "../../hooks/useTenants";

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
                  <th key={header} className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enrichedPlans.map((plan, index) => (
                <tr key={plan.id} className={`${index ? "border-t border-gray-200" : ""} transition-colors hover:bg-gray-50`}>
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
                className={`rounded-xl border px-4 py-3.5 ${
                  plan.tenantCount ? "border-primary/20 bg-primary/5" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      ${plan.monthlyPriceUsd}/mo · {plan.seatsIncluded} seats
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
                className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-gray-600"
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
