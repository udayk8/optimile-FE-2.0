import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Boxes,
  Building2,
  CirclePlus,
  ClipboardList,
  FileDigit,
  GitBranchPlus,
  LayoutDashboard,
  Package,
  PackageSearch,
  Smartphone,
  Settings2,
  ShieldCheck,
  ShieldUser,
  Truck,
  Users,
  Waypoints,
} from "lucide-react";
import { WorkspaceShell } from "@/layouts/shared/workspace-shell";
import { useSessionContext } from "@/app/session-context";
import { useTenantRouteContext } from "@/hooks/useTenantRouteContext";

export function TenantLayout() {
  const location = useLocation();
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
  const bookingFocused = location.pathname.includes("/bookings");

  const tenantNav = [
    { to: `/tenant/${tenant.id}/dashboard`, label: "Tenant Dashboard", icon: LayoutDashboard },
    {
      label: "Administration",
      icon: Boxes,
      children: [
        {
          label: "Customer Management",
          icon: ClipboardList,
          children: [
            {
              to: `/tenant/${tenant.id}/customers`,
              label: "Add Customer",
              icon: CirclePlus,
              matchMode: "never" as const,
            },
            {
              to: `/tenant/${tenant.id}/customers`,
              label: "Customer List",
              icon: ClipboardList,
            },
          ],
        },
        {
          label: "Vendor Management",
          icon: Truck,
          children: [
            {
              to: `/tenant/${tenant.id}/vendors`,
              label: "Add Vendor",
              icon: CirclePlus,
              matchMode: "never" as const,
            },
            {
              to: `/tenant/${tenant.id}/vendors`,
              label: "Vendor List",
              icon: Truck,
            },
          ],
        },
        {
          label: "Fleet Management",
          icon: Truck,
          children: [
            {
              label: "Vehicles",
              icon: Truck,
              children: [
                {
                  to: `/tenant/${tenant.id}/vehicles`,
                  label: "Add Vehicle",
                  icon: CirclePlus,
                  matchMode: "never" as const,
                },
                {
                  to: `/tenant/${tenant.id}/vehicles`,
                  label: "Vehicle List",
                  icon: Truck,
                },
              ],
            },
            {
              label: "Drivers",
              icon: Users,
              children: [
                {
                  to: `/tenant/${tenant.id}/drivers`,
                  label: "Add Driver",
                  icon: CirclePlus,
                  matchMode: "never" as const,
                },
                {
                  to: `/tenant/${tenant.id}/drivers`,
                  label: "Driver List",
                  icon: Users,
                },
              ],
            },
          ],
        },
        {
          label: "Master Data",
          icon: PackageSearch,
          children: [
            { to: `/tenant/${tenant.id}/vehicle-types`, label: "Vehicle Types", icon: Truck },
            { to: `/tenant/${tenant.id}/materials`, label: "Materials", icon: Package },
            { to: `/tenant/${tenant.id}/uom-config`, label: "UOM Configuration", icon: Waypoints },
            { to: `/tenant/${tenant.id}/lr-config`, label: "LR Configuration", icon: FileDigit },
          ],
        },
        {
          label: "User & Access Control",
          icon: ShieldCheck,
          children: [
            { to: `/tenant/${tenant.id}/users`, label: "Users", icon: Users },
            { to: `/tenant/${tenant.id}/roles`, label: "Roles", icon: ShieldUser },
            { to: `/tenant/${tenant.id}/role-permissions`, label: "Permissions", icon: ShieldUser },
          ],
        },
      ],
    },
    {
      label: "TMS (Booking)",
      icon: Truck,
      children: [
        { to: `/tenant/${tenant.id}/bookings/create`, label: "Create Booking", icon: CirclePlus },
        { to: `/tenant/${tenant.id}/bookings`, label: "Booking List", icon: ClipboardList },
        {
          to: `/tenant/${tenant.id}/bookings/rate-approval`,
          label: "Rate Approval Queue",
          icon: FileDigit,
        },
        {
          to: `/tenant/${tenant.id}/bookings/assignment`,
          label: "Assignment Queue",
          icon: Truck,
        },
        {
          to: `/tenant/${tenant.id}/bookings/live-tracking`,
          label: "In Transit / Control Tower",
          icon: Waypoints,
        },
        {
          to: `/tenant/${tenant.id}/bookings/completed`,
          label: "Completed / POD",
          icon: ClipboardList,
        },
      ],
    },
    {
      label: "Driver App",
      icon: Smartphone,
      children: [
        { to: `/tenant/${tenant.id}/driver-app/login`, label: "Driver Login", icon: Smartphone },
        { to: `/tenant/${tenant.id}/driver-app/dashboard`, label: "Dashboard", icon: LayoutDashboard },
        { to: `/tenant/${tenant.id}/driver-app/trips`, label: "My Trips", icon: ClipboardList },
        { to: `/tenant/${tenant.id}/driver-app/incidents`, label: "Incident Center", icon: FileDigit },
        { to: `/tenant/${tenant.id}/driver-app/profile`, label: "Profile", icon: Users },
      ],
    },
    {
      label: "Workspace Setup",
      icon: Waypoints,
      children: [
        { to: `/tenant/${tenant.id}/hierarchy`, label: "Hierarchy Structure", icon: GitBranchPlus },
        { to: `/tenant/${tenant.id}/org-units`, label: "Org Units", icon: Building2 },
        { to: `/tenant/${tenant.id}/modules`, label: "Modules", icon: Waypoints },
        { to: `/tenant/${tenant.id}/audit-logs`, label: "Audit Logs", icon: Building2 },
        { to: `/tenant/${tenant.id}/settings`, label: "Tenant Settings", icon: Settings2 },
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
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={bookingFocused ? "flex-1 p-4 xl:p-5" : "flex-1 p-5 xl:p-6"}
      >
        <Outlet />
      </motion.main>
    </WorkspaceShell>
  );
}
