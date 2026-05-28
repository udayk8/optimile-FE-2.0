import { isTenantAdminRole } from "@/modules/tenant-admin/lib/tenant-modules";

// Compute the tenant URL each user should land on after login or when they
// hit the bare tenant root. Used by the login flow AND by the tenant
// dashboard page so the behaviour is identical whether the user just
// signed in or refreshed onto /dashboard.
//
// Rules (in order):
//   1. Tenant Admin role           → tenant governance overview (/dashboard)
//   2. Walk tenant.enabledModuleCodes in order, pick the first code the
//      role has in its moduleCodes (excluding the synthetic ADMIN code),
//      and route to that module's dashboard.
//   3. Defensive fallback          → /dashboard.
//
// PROCUREMENT is a virtual umbrella that grants Auction + Vendor access —
// route it to Auction since procurement work lives there.
export function pickTenantLandingPath(
  tenantId: string,
  role: { moduleCodes?: string[]; id: string; name: string } | null | undefined,
  tenantEnabledModules: string[],
): string {
  const root = `/tenant-admin/tenant/${tenantId}`;
  const fallback = `${root}/dashboard`;
  if (!role) return fallback;
  if (isTenantAdminRole(role)) return fallback;

  const moduleDashboards: Record<string, string> = {
    TMS: `${root}/bookings`,
    AUCTION: `${root}/auction-ams/dashboard`,
    FLEET: `${root}/fleet-management/dashboard`,
    VENDOR: `${root}/vendor-portal/dashboard`,
    TRACKING: `${root}/track-and-trace/dashboard`,
    CUSTOMER: `${root}/customer-portal`,
    PROCUREMENT: `${root}/auction-ams/dashboard`,
  };

  const roleModuleSet = new Set((role.moduleCodes ?? []).filter((code) => code !== "ADMIN"));

  const ordered = [
    ...tenantEnabledModules,
    ...Array.from(roleModuleSet).filter((code) => !tenantEnabledModules.includes(code)),
  ];
  for (const code of ordered) {
    if (code === "ADMIN") continue;
    if (!roleModuleSet.has(code)) continue;
    const dashboard = moduleDashboards[code];
    if (dashboard) return dashboard;
  }
  return fallback;
}
