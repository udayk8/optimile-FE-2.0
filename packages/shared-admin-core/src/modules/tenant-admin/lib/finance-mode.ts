import type { FinanceMode } from "@finance/modules/finance/nav";

// Tenant onboarding stores "business type" as the (tenantType, customerPortalEnabled)
// pair (see deriveBusinessType in platform-tenant-detail-page.tsx). This is the
// reverse mapping: which finance variant should we render for that tenant?
//   - LOGISTICS_PROVIDER_3PL          → aggregator (3PL pages)
//   - DIRECT_CUSTOMER + portal=true   → fleet      (own-fleet pages)
//   - DIRECT_CUSTOMER + portal=false  → enterprise (direct-enterprise pages)
export function resolveFinanceMode(
  tenantType: string,
  customerPortalEnabled: boolean,
): FinanceMode {
  if (tenantType === "LOGISTICS_PROVIDER_3PL") return "aggregator";
  if (tenantType === "DIRECT_CUSTOMER") {
    return customerPortalEnabled ? "fleet" : "enterprise";
  }
  return "aggregator";
}
