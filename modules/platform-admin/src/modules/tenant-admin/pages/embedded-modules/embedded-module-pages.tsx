import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/components/common/page-header";
import { TenantPanel } from "@/modules/tenant-admin/components/tenant-primitives";
import { Button } from "@/shared/components/ui/button";

interface ShortcutTile {
  label: string;
  description: string;
  to: string;
  external?: boolean;
}

function ShortcutGrid({ tiles }: { tiles: ShortcutTile[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile) => (
        <Link
          key={tile.label}
          to={tile.to}
          className="rounded-2xl border bg-white px-4 py-3 transition hover:border-sky-300 hover:shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-slate-900">{tile.label}</p>
            {tile.external ? <ExternalLink className="size-3.5 text-slate-400" /> : null}
          </div>
          <p className="mt-1 text-[12px] leading-snug text-slate-500">{tile.description}</p>
        </Link>
      ))}
    </div>
  );
}

interface EmbeddedModuleProps {
  eyebrow: string;
  title: string;
  description: string;
  shortcuts: ShortcutTile[];
  standaloneLabel: string;
  standalonePath: string;
}

function EmbeddedModulePage({
  eyebrow,
  title,
  description,
  shortcuts,
  standaloneLabel,
  standalonePath,
}: EmbeddedModuleProps) {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <TenantPanel title="Shortcuts">
        <ShortcutGrid tiles={shortcuts} />
      </TenantPanel>
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link to={standalonePath} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" />
            {standaloneLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function VendorPortalLandingPage() {
  return (
    <EmbeddedModulePage
      eyebrow="Vendor Portal"
      title="Vendor Workspace"
      description="Vendor trips, contracts, invoices, payments, and support shortcuts."
      shortcuts={[
        { label: "Vendor Dashboard", description: "Vendor home — assigned trips and KPIs.", to: "/vendor", external: true },
        { label: "Assigned Trips", description: "Accept, reject, manage trip assignments.", to: "/vendor/trips", external: true },
        { label: "Sourcing", description: "Bid on RFQs and auctions.", to: "/vendor/sourcing", external: true },
        { label: "Contracts", description: "Active vendor contracts.", to: "/vendor/contracts", external: true },
        { label: "Invoices", description: "Vendor invoices and submissions.", to: "/vendor/invoices", external: true },
        { label: "Ledger", description: "Vendor ledger and reconciliation.", to: "/vendor/ledger", external: true },
        { label: "Payments", description: "Payment records and disbursements.", to: "/vendor/record-payments", external: true },
        { label: "Vendor Fleet", description: "Vehicles and drivers operated by the vendor.", to: "/vendor/fleet", external: true },
        { label: "Support", description: "Disputes, queries, and remarks.", to: "/vendor/support", external: true },
      ]}
      standaloneLabel="Open standalone Vendor Portal"
      standalonePath="/vendor"
    />
  );
}

export function FleetManagementLandingPage() {
  return (
    <EmbeddedModulePage
      eyebrow="Fleet Management"
      title="Fleet Workspace"
      description="Fleet operations — vehicles, drivers, compliance, maintenance, dispatch."
      shortcuts={[
        { label: "Fleet Dashboard", description: "Fleet home and KPIs.", to: "/fleet/dashboard", external: true },
        { label: "Ops Intelligence", description: "Operations summary and insights.", to: "/fleet/ops-intel", external: true },
        { label: "Exception Center", description: "Fleet exceptions and alerts.", to: "/fleet/exceptions", external: true },
        { label: "Live Map", description: "Real-time fleet map.", to: "/fleet/live-map", external: true },
        { label: "Dispatch", description: "Dispatch workspace.", to: "/fleet/dispatch", external: true },
        { label: "Vehicles", description: "Vehicles and availability.", to: "/fleet/fleet", external: true },
        { label: "Drivers", description: "Drivers and behaviour.", to: "/fleet/drivers", external: true },
        { label: "Compliance", description: "Fleet compliance records.", to: "/fleet/compliance", external: true },
        { label: "Maintenance", description: "Vehicle maintenance schedules.", to: "/fleet/maintenance", external: true },
        { label: "Garage", description: "Garage operations.", to: "/fleet/garage", external: true },
        { label: "Tyres", description: "Tyre inventory and tracking.", to: "/fleet/tyres", external: true },
        { label: "Fuel", description: "Fuel records.", to: "/fleet/fuel", external: true },
        { label: "Cost Health", description: "Cost health workspace.", to: "/fleet/cost", external: true },
        { label: "Fleet Settings", description: "Fleet configuration.", to: "/fleet/settings", external: true },
      ]}
      standaloneLabel="Open standalone Fleet Portal"
      standalonePath="/fleet/dashboard"
    />
  );
}

export function AuctionAmsLandingPage() {
  return (
    <EmbeddedModulePage
      eyebrow="Auction / AMS"
      title="Auction Workspace"
      description="RFQ/RFI, active auctions, contracts, and bid management."
      shortcuts={[
        { label: "Auction Dashboard", description: "Auction home and KPIs.", to: "/auction/dashboard", external: true },
        { label: "Auctions", description: "Active and historical auctions.", to: "/auction/auctions", external: true },
        { label: "Create Auction / RFQ", description: "Launch a new sourcing event.", to: "/auction/auctions/new", external: true },
        { label: "Contracts", description: "Auction-driven vendor contracts.", to: "/auction/contracts", external: true },
      ]}
      standaloneLabel="Open standalone Auction Portal"
      standalonePath="/auction/dashboard"
    />
  );
}

