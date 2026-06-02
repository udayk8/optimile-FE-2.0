import { vendorManifest } from "@vendor/app/manifest";
import { ManifestEmbeddedApp } from "@/embedded-module";
import { TenantDataBridgeProvider } from "@vendor/integration/tenant-data-bridge";
import { useVendorTenantDataBridge } from "@/modules/tenant-admin/integration/vendor-bridge-adapter";

// Manifest-driven embed. Any route or sidebar addition in
// modules/vendor-web/src/app/manifest.tsx automatically appears here too.
// Absolute "/vendor/..." Navigate elements in the manifest are rewritten to
// be relative to this embed's mount path (currently /vendor-portal).
//
// For a VENDOR session we inject the shared-data bridge so the portal's fleet
// and bookings read/write the SAME tenant master data (scoped to the logged-in
// vendor). Internal users keep the existing app.store-backed view (bridge null).
export function VendorEmbeddedApp() {
  const bridge = useVendorTenantDataBridge();
  const app = (
    <ManifestEmbeddedApp
      manifest={vendorManifest}
      showStandaloneLink={false}
    />
  );
  return bridge ? <TenantDataBridgeProvider value={bridge}>{app}</TenantDataBridgeProvider> : app;
}
