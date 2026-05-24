import { Outlet, useLocation } from "react-router-dom";
import {
  Boxes, Building2, CirclePlus, ClipboardList, FileDigit,
  GitBranchPlus, LayoutDashboard, Package, PackageSearch,
  Settings2, ShieldCheck, ShieldAlert, Smartphone, Truck, Users, Waypoints,
} from "lucide-react";
import { WorkspaceShell } from "../shared/workspace-shell";
import { useSessionContext } from "../../shared/auth/session-context";
import { useTenantRouteContext } from "../../modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantPaths } from "../../hooks/useTenantPaths";

export function TenantLayout() {
  const location = useLocation();
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
  const paths = useTenantPaths();
  const BASE = paths.root.replace(`/tenant/${tenant.id}`, "");
  const tenantNav = [
    { to: `${BASE}/tenant/${tenant.id}/dashboard`, label: "Tenant Dashboard", icon: LayoutDashboard },
    {
      label: "Administration", icon: Boxes,
      children: [
        {
          label: "Customer Management", icon: ClipboardList,
          children: [
            { to: `${BASE}/tenant/${tenant.id}/customers`, label: "Add Customer", icon: CirclePlus, matchMode: "never" as const },
            { to: `${BASE}/tenant/${tenant.id}/customers`, label: "Customer List", icon: ClipboardList },
          ],
        },
        {
          label: "Vendor Management", icon: Truck,
          children: [
            { to: `${BASE}/tenant/${tenant.id}/vendors`, label: "Add Vendor", icon: CirclePlus, matchMode: "never" as const },
            { to: `${BASE}/tenant/${tenant.id}/vendors`, label: "Vendor List", icon: Truck },
          ],
        },
        {
          label: "Fleet Management", icon: Truck,
          children: [
            {
              label: "Vehicles", icon: Truck,
              children: [
                { to: `${BASE}/tenant/${tenant.id}/vehicles`, label: "Add Vehicle", icon: CirclePlus, matchMode: "never" as const },
                { to: `${BASE}/tenant/${tenant.id}/vehicles`, label: "Vehicle List", icon: Truck },
              ],
            },
            {
              label: "Drivers", icon: Users,
              children: [
                { to: `${BASE}/tenant/${tenant.id}/drivers`, label: "Add Driver", icon: CirclePlus, matchMode: "never" as const },
                { to: `${BASE}/tenant/${tenant.id}/drivers`, label: "Driver List", icon: Users },
              ],
            },
          ],
        },
        {
          label: "Master Data", icon: PackageSearch,
          children: [
            { to: `${BASE}/tenant/${tenant.id}/vehicle-types`, label: "Vehicle Types", icon: Truck },
            { to: `${BASE}/tenant/${tenant.id}/materials`, label: "Materials", icon: Package },
            { to: `${BASE}/tenant/${tenant.id}/uom-config`, label: "UOM Configuration", icon: Waypoints },
            { to: `${BASE}/tenant/${tenant.id}/lr-config`, label: "LR Configuration", icon: FileDigit },
          ],
        },
        {
          label: "User & Access Control", icon: ShieldCheck,
          children: [
            { to: `${BASE}/tenant/${tenant.id}/users`, label: "Users", icon: Users },
            { to: `${BASE}/tenant/${tenant.id}/roles`, label: "Roles", icon: ShieldAlert },
            { to: `${BASE}/tenant/${tenant.id}/role-permissions`, label: "Permissions", icon: ShieldAlert },
          ],
        },
      ],
    },
    {
      label: "TMS (Booking)", icon: Truck,
      children: [
        { to: paths.createBooking, label: "Create Booking", icon: CirclePlus, matchMode: "exact" as const },
        { to: paths.bookings, label: "Booking List", icon: ClipboardList, matchMode: "exact" as const },
        { to: paths.rateApproval, label: "Rate Approval Queue", icon: FileDigit, matchMode: "exact" as const },
        { to: paths.assignment, label: "Assignment Queue", icon: Truck, matchMode: "exact" as const },
        { to: paths.liveTracking, label: "In Transit / Control Tower", icon: Waypoints, matchMode: "exact" as const },
        { to: paths.completed, label: "Completed / POD", icon: ClipboardList, matchMode: "exact" as const },
      ],
    },
    {
      label: "Driver App", icon: Smartphone,
      children: [
        { to: `${BASE}/tenant/${tenant.id}/driver-app/login`, label: "Driver Login", icon: Smartphone },
        { to: `${BASE}/tenant/${tenant.id}/driver-app/dashboard`, label: "Dashboard", icon: LayoutDashboard },
        { to: `${BASE}/tenant/${tenant.id}/driver-app/trips`, label: "My Trips", icon: ClipboardList },
        { to: `${BASE}/tenant/${tenant.id}/driver-app/incidents`, label: "Incident Center", icon: FileDigit },
        { to: `${BASE}/tenant/${tenant.id}/driver-app/profile`, label: "Profile", icon: Users },
      ],
    },
    {
      label: "Workspace Setup", icon: Waypoints,
      children: [
        { to: `${BASE}/tenant/${tenant.id}/hierarchy`, label: "Hierarchy Structure", icon: GitBranchPlus },
        { to: `${BASE}/tenant/${tenant.id}/org-units`, label: "Org Units", icon: Building2 },
        { to: `${BASE}/tenant/${tenant.id}/modules`, label: "Modules", icon: Waypoints },
        { to: `${BASE}/tenant/${tenant.id}/audit-logs`, label: "Audit Logs", icon: Building2 },
        { to: `${BASE}/tenant/${tenant.id}/settings`, label: "Tenant Settings", icon: Settings2 },
      ],
    },
  ];

  return (
    <WorkspaceShell
      title={tenant.name}
      subtitle={`Admin workspace • ${tenant.enabledModuleCodes.length} modules enabled`}
      navItems={tenantNav}
      actorLabel={session.tenantId === tenant.id ? session.actorName : "Tenant login"}
      searchPlaceholder="Search tenant setup, users, roles, org units, and activity"
    >
      <div key={location.pathname} className="px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </div>
    </WorkspaceShell>
  );
}

