import { ExternalLink } from "lucide-react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantPanel } from "@/modules/tenant-admin/components/tenant-primitives";
import { Button } from "@/shared/components/ui/button";

// Vendor Portal embedded mode.
//
// Mounted at /platform-admin/tenant/:tenantId/vendor-portal/* — every
// shortcut routes to a sibling under this prefix so the URL stays inside
// the tenant shell. Each sub-route currently renders a clean placeholder
// (full vendor-page embedding is intentionally deferred — see "Open
// standalone Vendor Portal" link for the real page).
//
// Standalone vendor-web at /vendor/* is unaffected.

interface VendorShortcut {
  slug: string;
  label: string;
  description: string;
  standalonePath: string;
}

const VENDOR_SHORTCUTS: VendorShortcut[] = [
  { slug: "dashboard", label: "Vendor Dashboard", description: "Vendor home — assigned trips and KPIs.", standalonePath: "/vendor" },
  { slug: "assigned-trips", label: "Assigned Trips", description: "Accept, reject, manage trip assignments.", standalonePath: "/vendor/trips" },
  { slug: "sourcing", label: "Sourcing", description: "Bid on RFQs and auctions.", standalonePath: "/vendor/sourcing" },
  { slug: "contracts", label: "Contracts", description: "Active vendor contracts.", standalonePath: "/vendor/contracts" },
  { slug: "invoices", label: "Invoices", description: "Vendor invoices and submissions.", standalonePath: "/vendor/invoices" },
  { slug: "ledger", label: "Ledger", description: "Vendor ledger and reconciliation.", standalonePath: "/vendor/ledger" },
  { slug: "payments", label: "Payments", description: "Payment records and disbursements.", standalonePath: "/vendor/record-payments" },
  { slug: "fleet", label: "Vendor Fleet", description: "Vehicles and drivers operated by the vendor.", standalonePath: "/vendor/fleet" },
  { slug: "support", label: "Vendor Support", description: "Disputes, queries, and remarks.", standalonePath: "/vendor/support" },
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

function VendorLanding() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Vendor Portal"
        title="Vendor Workspace"
        description="Vendor trips, contracts, invoices, payments, and support shortcuts."
      />
      <TenantPanel title="Shortcuts">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VENDOR_SHORTCUTS.map((tile) => (
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
        <StandaloneOpenLink to="/vendor" label="Open standalone Vendor Portal" />
      </div>
    </div>
  );
}

function VendorPlaceholderPage({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const tile = VENDOR_SHORTCUTS.find((item) => item.slug === slug);
  if (!tile) return <Navigate to="" replace />;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Vendor Portal" title={tile.label} description={tile.description} />
      <TenantPanel title="Coming soon">
        <p className="py-6 text-sm text-muted-foreground">
          This vendor screen will be embedded inside the tenant workspace shortly. For now you can open the full page in the standalone Vendor Portal.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("..")}>
            ← Back to Vendor Workspace
          </Button>
          <StandaloneOpenLink to={tile.standalonePath} label={`Open ${tile.label} in standalone portal`} />
        </div>
      </TenantPanel>
    </div>
  );
}

export function VendorEmbeddedApp() {
  return (
    <Routes>
      <Route index element={<VendorLanding />} />
      {VENDOR_SHORTCUTS.map((tile) => (
        <Route key={tile.slug} path={tile.slug} element={<VendorPlaceholderPage slug={tile.slug} />} />
      ))}
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
}
