import { useMemo } from "react";
import { financeManifest } from "@finance/app/manifest";
import { FinancePermissionProvider } from "@finance/app/permission-context";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { ManifestEmbeddedApp } from "@/embedded-module";

// Manifest-driven embed. Finance keeps its own internal navigation, so the
// manifest mounts the whole app behind a single catch-all route. Tenant-side
// permission context is layered on top so finance action gates resolve from
// the active tenant role.
export function FinanceEmbeddedApp() {
  const access = useTenantAccess();
  const permissions = useMemo(
    () => ({
      canRaiseDispute: access.hasFeaturePermission("FINANCE", "FINANCE_RECEIVABLES", "create"),
      canApproveNote: access.hasFeaturePermission("FINANCE", "FINANCE_PAYABLES", "approve"),
      canCloseMonth: access.hasFeaturePermission("FINANCE", "FINANCE_CONTROLS", "approve"),
    }),
    [access],
  );

  return (
    <ManifestEmbeddedApp
      manifest={financeManifest}
      standaloneHref="/finance"
      standaloneLabel="Open standalone Finance Portal"
      extraWrapper={(children) => (
        <FinancePermissionProvider value={permissions}>{children}</FinancePermissionProvider>
      )}
    />
  );
}
