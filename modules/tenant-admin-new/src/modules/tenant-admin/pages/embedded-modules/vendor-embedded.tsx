import { vendorManifest } from "@vendor/app/manifest";
import { ManifestEmbeddedApp } from "@/embedded-module";

// Manifest-driven embed. Any route or sidebar addition in
// modules/vendor-web/src/app/manifest.tsx automatically appears here too.
// Absolute "/vendor/..." Navigate elements in the manifest are rewritten to
// be relative to this embed's mount path (currently /vendor-portal).
export function VendorEmbeddedApp() {
  return (
    <ManifestEmbeddedApp
      manifest={vendorManifest}
      standaloneLabel="Open standalone Vendor Portal"
    />
  );
}
