import { useMemo } from "react";
import { auctionManifest } from "@auction/app/manifest";
import { AuctionPermissionProvider } from "@auction/app/permission-context";
import { useTenantAccess } from "@/modules/tenant-admin/hooks/useTenantAccess";
import { ManifestEmbeddedApp } from "@/embedded-module";

// Manifest-driven embed. Any route or sidebar addition in
// modules/auction-web/src/app/manifest.tsx automatically appears here too.
// Tenant-side permission context is layered on top so create-actions still
// gate correctly inside the embedded shell.
export function AuctionEmbeddedApp() {
  const access = useTenantAccess();
  const permissions = useMemo(
    () => ({
      canCreateAuction: access.hasFeaturePermission("AUCTION", "CREATE_AUCTION", "create"),
      canCreateRfi: access.hasFeaturePermission("AUCTION", "CREATE_RFI", "create"),
      canCreateRfq: access.hasFeaturePermission("AUCTION", "CREATE_RFQ", "create"),
    }),
    [access],
  );

  return (
    <ManifestEmbeddedApp
      manifest={auctionManifest}
      showStandaloneLink={false}
      extraWrapper={(children) => (
        <AuctionPermissionProvider value={permissions}>{children}</AuctionPermissionProvider>
      )}
    />
  );
}
