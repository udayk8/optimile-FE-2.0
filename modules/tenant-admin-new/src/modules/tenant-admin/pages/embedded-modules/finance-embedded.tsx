import { useMemo } from "react";
import { financeManifest } from "@finance/app/manifest";
import { FinancePermissionProvider } from "@finance/app/permission-context";
import { FinanceEmbeddedModeProvider } from "@finance/app/embedded-mode-context";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { resolveFinanceMode } from "@/modules/tenant-admin/lib/finance-mode";
import { ManifestEmbeddedApp } from "@/embedded-module";

// Manifest-driven embed. The mounted route element (FinanceModeRouter) reads
// the forced mode from context and renders just one finance page at a time —
// the host's tenant sidebar surfaces NAV[mode] as a nested children block.
//
// The mode itself comes from the tenant's onboarding configuration so tenants
// never pick a finance variant manually; permissions come from the active
// tenant role.
export function FinanceEmbeddedApp() {
  const access = useTenantAccess();
  const { tenant } = useTenantRouteContext();

  const permissions = useMemo(
    () => ({
      canRaiseDispute: access.hasFeaturePermission("FINANCE", "FINANCE_RECEIVABLES", "create"),
      canApproveNote: access.hasFeaturePermission("FINANCE", "FINANCE_PAYABLES", "approve"),
      canCloseMonth: access.hasFeaturePermission("FINANCE", "FINANCE_CONTROLS", "approve"),
    }),
    [access],
  );

  const forcedMode = useMemo(
    () => resolveFinanceMode(tenant.tenantType, tenant.customerPortalEnabled),
    [tenant.tenantType, tenant.customerPortalEnabled],
  );

  return (
    <ManifestEmbeddedApp
      manifest={financeManifest}
      standaloneHref="/finance"
      standaloneLabel="Open standalone Finance Portal"
      extraWrapper={(children) => (
        <FinanceEmbeddedModeProvider mode={forcedMode}>
          <FinancePermissionProvider value={permissions}>{children}</FinancePermissionProvider>
        </FinanceEmbeddedModeProvider>
      )}
    />
  );
}
