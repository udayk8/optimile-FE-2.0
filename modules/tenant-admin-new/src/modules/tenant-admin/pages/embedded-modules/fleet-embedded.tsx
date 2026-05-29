import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { fleetManifest } from "@fleet/app/manifest";

// Fleet Management embedded mode.
//
// Renders the REAL fleet-web pages inside the tenant workspace shell, the
// same way the Auction module is embedded. The standalone Fleet app chrome
// (StandaloneShell sidebar/header) is intentionally not included — the
// surrounding TenantLayout owns navigation. Fleet page business logic is
// untouched: the canonical page elements + the module's own FleetRouteWrapper
// are reused directly from the fleet manifest (the real pages live outside
// fleet-web/src, so the manifest is the single import surface).
//
// Standalone fleet-web at /fleet/* is unaffected.

function PassThrough({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const FleetWrapper = fleetManifest.wrapper ?? PassThrough;

// Build a lookup of the manifest's wired page elements, keyed by their
// (relative) path. The manifest's index/`*` entries redirect to an absolute
// /fleet path, which we deliberately override below to stay in the tenant URL.
const elementByPath: Record<string, ReactNode> = {};
for (const route of fleetManifest.routes) {
  if (typeof route.path === "string" && route.path !== "*") {
    elementByPath[route.path] = route.element as ReactNode;
  }
}

const page = (manifestPath: string) =>
  elementByPath[manifestPath] ?? <Navigate to="dashboard" replace />;

function StandaloneLink() {
  return (
    <div className="flex justify-end px-4 pt-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/fleet/dashboard" target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-3.5" />
          Open standalone Fleet Portal
        </Link>
      </Button>
    </div>
  );
}

export function FleetEmbeddedApp() {
  return (
    <FleetWrapper>
      <StandaloneLink />
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={page("dashboard")} />
        <Route path="ops-intel" element={page("ops-intel")} />
        <Route path="exceptions" element={page("exceptions")} />
        <Route path="exceptions/rules" element={page("exceptions/rules")} />
        <Route path="live-map" element={page("live-map")} />
        <Route path="dispatch" element={page("dispatch")} />
        {/* Tenant sidebar uses "vehicles"; fleet-web's Vehicles page is "fleet". */}
        <Route path="vehicles" element={page("fleet")} />
        <Route path="fleet" element={page("fleet")} />
        <Route path="drivers" element={page("drivers")} />
        <Route path="behavior" element={page("behavior")} />
        <Route path="compliance" element={page("compliance")} />
        <Route path="maintenance" element={page("maintenance")} />
        <Route path="garage" element={page("garage")} />
        <Route path="marketplace" element={page("marketplace")} />
        <Route path="batteries" element={page("batteries")} />
        <Route path="inventory" element={page("inventory")} />
        <Route path="vendors" element={page("vendors")} />
        <Route path="tyres" element={page("tyres")} />
        <Route path="tyres/inventory" element={page("tyres/inventory")} />
        <Route path="tyres/tracker" element={page("tyres/tracker")} />
        <Route path="tyres/analytics" element={page("tyres/analytics")} />
        <Route path="tyres/indents" element={page("tyres/indents")} />
        <Route path="tyres/inspections" element={page("tyres/inspections")} />
        <Route path="tyres/jobs" element={page("tyres/jobs")} />
        <Route path="tyres/:tyreId" element={page("tyres/:tyreId")} />
        <Route path="fuel" element={page("fuel")} />
        <Route path="cost" element={page("cost")} />
        <Route path="settings" element={page("settings")} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </FleetWrapper>
  );
}
