import { Outlet, useLocation, useMatch } from "react-router-dom";
import { Building2, Files, LayoutDashboard, Package2, ReceiptText, Settings2 } from "lucide-react";
import { WorkspaceShell } from "../shared/workspace-shell";

export function PlatformLayout() {
  const location = useLocation();
  const embedded = useMatch("/platform-admin/*");
  const BASE = embedded ? "/platform-admin" : "";

  const platformNav = [
    { to: `${BASE}/dashboard`, label: "Platform Dashboard", icon: LayoutDashboard },
    { to: `${BASE}/tenants`, label: "Tenants", icon: Building2 },
    { to: `${BASE}/modules`, label: "Module Catalog", icon: Package2 },
    { to: `${BASE}/plans`, label: "Plans", icon: ReceiptText },
    { to: `${BASE}/audit-logs`, label: "Platform Audit Logs", icon: Files },
    { to: `${BASE}/settings`, label: "Platform Settings", icon: Settings2 },
  ];

  return (
    <WorkspaceShell
      title="Optimile Super Admin"
      subtitle="Platform governance and tenant oversight"
      navItems={platformNav}
      actorLabel="Platform login"
      searchPlaceholder="Search tenants, plans, modules, and platform events"
    >
      <div key={location.pathname} className="px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </div>
    </WorkspaceShell>
  );
}
