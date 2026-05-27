import { ExternalLink } from "lucide-react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantPanel } from "@/modules/tenant-admin/components/tenant-primitives";
import { Button } from "@/shared/components/ui/button";

// Fleet Management embedded mode.
//
// Mounted at /platform-admin/tenant/:tenantId/fleet-management/* — every
// page routes to a sibling under this prefix so the URL stays inside the
// tenant shell. Each sub-route currently renders a clean placeholder
// (full fleet-web page embedding is intentionally deferred — see the
// "Open … in standalone Fleet Portal" link for the real page).
//
// Standalone fleet-web at /fleet/* is unaffected.

interface FleetShortcut {
  slug: string;
  label: string;
  description: string;
  standalonePath: string;
}

const FLEET_SHORTCUTS: FleetShortcut[] = [
  { slug: "dashboard", label: "Fleet Dashboard", description: "Fleet home and KPIs.", standalonePath: "/fleet/dashboard" },
  { slug: "ops-intel", label: "Ops Intelligence", description: "Operations summary and insights.", standalonePath: "/fleet/ops-intel" },
  { slug: "exceptions", label: "Exception Center", description: "Fleet exceptions and alerts.", standalonePath: "/fleet/exceptions" },
  { slug: "live-map", label: "Live Map", description: "Real-time fleet map.", standalonePath: "/fleet/live-map" },
  { slug: "dispatch", label: "Dispatch", description: "Dispatch workspace.", standalonePath: "/fleet/dispatch" },
  { slug: "vehicles", label: "Vehicles", description: "Vehicles and availability.", standalonePath: "/fleet/fleet" },
  { slug: "drivers", label: "Drivers", description: "Drivers and behaviour.", standalonePath: "/fleet/drivers" },
  { slug: "compliance", label: "Compliance", description: "Fleet compliance records.", standalonePath: "/fleet/compliance" },
  { slug: "maintenance", label: "Maintenance", description: "Vehicle maintenance schedules.", standalonePath: "/fleet/maintenance" },
  { slug: "garage", label: "Garage", description: "Garage operations.", standalonePath: "/fleet/garage" },
  { slug: "tyres", label: "Tyres", description: "Tyre inventory and tracking.", standalonePath: "/fleet/tyres" },
  { slug: "fuel", label: "Fuel", description: "Fuel records.", standalonePath: "/fleet/fuel" },
  { slug: "cost", label: "Cost Health", description: "Cost health workspace.", standalonePath: "/fleet/cost" },
  { slug: "settings", label: "Fleet Settings", description: "Fleet configuration.", standalonePath: "/fleet/settings" },
];

function StandaloneOpenLink({ to, label }: { to: string; label: string }) {
  return (
    <Button asChild variant="ghost" size="sm">
      <Link to={to} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="size-3.5" />
        {label}
      </Link>
    </Button>
  );
}

function FleetLanding() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Fleet Management"
        title="Fleet Workspace"
        description="Vehicles, drivers, maintenance, compliance, dispatch, tyres, fuel and cost."
      />
      <TenantPanel title="Shortcuts">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FLEET_SHORTCUTS.map((tile) => (
            <Link
              key={tile.slug}
              to={tile.slug}
              className="rounded-2xl border bg-white px-4 py-3 transition hover:border-sky-300 hover:shadow-sm"
            >
              <p className="text-[13px] font-medium text-slate-900">{tile.label}</p>
              <p className="mt-1 text-[12px] leading-snug text-slate-500">{tile.description}</p>
            </Link>
          ))}
        </div>
      </TenantPanel>
      <div className="flex justify-end">
        <StandaloneOpenLink to="/fleet/dashboard" label="Open standalone Fleet Portal" />
      </div>
    </div>
  );
}

function FleetPlaceholderPage({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const tile = FLEET_SHORTCUTS.find((item) => item.slug === slug);
  if (!tile) return <Navigate to="" replace />;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Fleet Management" title={tile.label} description={tile.description} />
      <TenantPanel title="Coming soon">
        <p className="py-6 text-sm text-muted-foreground">
          This fleet screen will be embedded inside the tenant workspace shortly. For now you can open the full page in the standalone Fleet Portal.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("..")}>
            ← Back to Fleet Workspace
          </Button>
          <StandaloneOpenLink to={tile.standalonePath} label={`Open ${tile.label} in standalone portal`} />
        </div>
      </TenantPanel>
    </div>
  );
}

export function FleetEmbeddedApp() {
  return (
    <Routes>
      <Route index element={<FleetLanding />} />
      {FLEET_SHORTCUTS.map((tile) => (
        <Route key={tile.slug} path={tile.slug} element={<FleetPlaceholderPage slug={tile.slug} />} />
      ))}
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
}
