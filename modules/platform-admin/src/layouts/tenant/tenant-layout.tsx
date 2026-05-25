import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Boxes,
  Building2,
  Gavel,
  LayoutDashboard,
  MapPin,
  Plus,
  ShieldCheck,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import { WorkspaceShell } from "@layouts/shared/workspace-shell";
import type { ExplorerNavItem } from "@/shared/components/layout/sidebar-explorer";
import { TenantEmptyState } from "@/modules/tenant-admin/components/tenant-primitives";
import { useTenantRolePermissions } from "@/modules/tenant-admin/hooks/useTenantRolePermissions";
import { useTenantRoles } from "@/modules/tenant-admin/hooks/useTenantRoles";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import { useSessionContext } from "@/shared/auth/session-context";
import {
  canAccessTenantPath,
  filterTenantNavItems,
  resolveSessionRoleContext,
} from "@/shared/lib/tenant-rbac";
import { useTenantPaths } from "@platform-admin/hooks/useTenantPaths";
import { hasPermission, usePermissionMatrixVersion, type PermissionAction } from "@/modules/tenant-admin/lib/tenant-permissions";
import { TenantProfileMenu } from "@/modules/tenant-admin/components/tenant-profile-menu";

export function TenantLayout() {
  const location = useLocation();
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
  const paths = useTenantPaths();
  const { data: users } = useTenantUsers(tenant.id);
  const { data: roles } = useTenantRoles(tenant.id);
  const { data: rolePermissions } = useTenantRolePermissions(tenant.id);
  usePermissionMatrixVersion();
  const bookingFocused = location.pathname.includes("/bookings");
  // No preview mode anymore. The active role is the logged-in user's role,
  // resolved by matching session.actorName against tenant users.
  const { activeRole, currentTenantUser } = resolveSessionRoleContext({
    tenant,
    session,
    users,
    roles,
    rolePermissions,
  });

  const tenantNav = [
    { to: paths.dashboard, label: "Dashboard", icon: LayoutDashboard, pageCode: "TENANT_DASHBOARD" },
    // Administration covers tenant governance (hierarchy, users, roles) AND
    // all booking onboarding/setup data (master data, rules, LR config).
    // The group is shown when the role has ANY administration child granted
    // — either the ADMIN module or any TMS setup feature.
    ...(() => {
      const adminModuleChildren: Array<ExplorerNavItem & { featureCode?: string }> =
        activeRole && ((activeRole.moduleCodes ?? []).includes("ADMIN") || activeRole.id.endsWith("-tenant-admin") || activeRole.name.toLowerCase() === "tenant admin")
          ? [
              { to: paths.hierarchy, label: "Hierarchy Setup", icon: Building2, pageCode: "HIERARCHY" },
              { to: paths.orgUnits, label: "Org Units", icon: Building2, pageCode: "ORG_UNITS" },
              { to: paths.users, label: "Users", icon: Users, pageCode: "USERS" },
              { to: paths.roles, label: "Roles", icon: ShieldCheck, pageCode: "ROLES" },
              { to: paths.rolePermissions, label: "Role Permissions", icon: ShieldCheck, pageCode: "ROLE_PERMISSIONS" },
            ]
          : [];

      const setupChildren: Array<ExplorerNavItem & { featureCode?: string }> = tenant.enabledModuleCodes.includes("TMS")
        ? [
            { to: paths.customers, label: "Customers", icon: Users, pageCode: "CUSTOMERS", featureCode: "CUSTOMERS" },
            { to: paths.vendors, label: "Vendors", icon: Truck, pageCode: "VENDORS", featureCode: "VENDORS" },
            { to: paths.vehicleTypes, label: "Vehicle Types", icon: Truck, pageCode: "VEHICLE_TYPES", featureCode: "VEHICLE_TYPES" },
            { to: paths.materials, label: "Materials", icon: Boxes, pageCode: "MATERIALS", featureCode: "MATERIALS" },
            { to: paths.uomConfig, label: "UOM", icon: Boxes, pageCode: "UOM_CONFIG", featureCode: "UOM" },
            { to: paths.addressBook, label: "Address Book", icon: Building2, pageCode: "ADDRESS_BOOK", featureCode: "ADDRESS_BOOK" },
            { to: paths.lrConfig, label: "LR Configuration", icon: ShieldCheck, pageCode: "LR_CONFIG", featureCode: "LR_CONFIGURATION" },
            { to: paths.assignmentRules, label: "Assignment Rules", icon: ShieldCheck, pageCode: "ASSIGNMENT_RULES", featureCode: "ASSIGNMENT_RULES" },
            { to: paths.documentRules, label: "Document Rules", icon: ShieldCheck, pageCode: "DOCUMENT_RULES", featureCode: "DOCUMENT_RULES" },
            { to: paths.podRules, label: "POD Rules", icon: ShieldCheck, pageCode: "POD_RULES", featureCode: "POD_RULES" },
          ].filter((item) => !item.featureCode || hasPermission(activeRole, "TMS", item.featureCode, "view"))
        : [];

      const administrationChildren = [...adminModuleChildren, ...setupChildren];
      if (administrationChildren.length === 0) return [];
      return [{ label: "Administration", icon: Boxes, children: administrationChildren }];
    })(),
    // Booking group contains operational workflows only. Setup/master data
    // lives under Administration above.
    ...(() => {
      if (!tenant.enabledModuleCodes.includes("TMS")) return [];

      const bookingOpsChildren: Array<ExplorerNavItem & { featureCode: string; action?: PermissionAction }> = ([
        { to: paths.bookings, label: "Booking Dashboard", icon: Truck, pageCode: "BOOKING_LIST", featureCode: "BOOKING_DASHBOARD" },
        { to: paths.createBooking, label: "Create Booking", icon: Plus, pageCode: "CREATE_BOOKING", featureCode: "CREATE_BOOKING", action: "create" as PermissionAction },
        { to: paths.assignment, label: "Booking Assignment", icon: Truck, pageCode: "ASSIGNMENT_QUEUE", featureCode: "BOOKING_ASSIGNMENT" },
        { to: `${paths.root}/shipment-documents`, label: "Shipment Documents", icon: Truck, pageCode: "SHIPMENT_DOCUMENTS", featureCode: "SHIPMENT_DOCUMENTS" },
        { to: paths.completed, label: "POD", icon: ShieldCheck, pageCode: "COMPLETED_BOOKINGS", featureCode: "POD" },
      ] as Array<ExplorerNavItem & { featureCode: string; action?: PermissionAction }>).filter((item) => hasPermission(activeRole, "TMS", item.featureCode, item.action ?? "view"));

      if (bookingOpsChildren.length === 0) return [];
      return [{ label: "Booking", icon: Truck, children: bookingOpsChildren }];
    })(),
    // External module portals — exposed as sidebar entries when the tenant
    // has the module enabled AND the role has view permission for at least
    // one feature inside it.
    //
    // Two modes:
    //   - `external` portals (Driver App, Track and Trace, Customer Portal)
    //     navigate into their standalone app at its own URL prefix.
    //   - `embedded` portals (Vendor, Fleet, Auction) stay inside the
    //     platform-admin tenant workspace via /platform-admin/tenant/.../<path>
    //     so the tenant sidebar/header remain visible.
    ...(() => {
      const groups: ExplorerNavItem[] = [];
      const enabled = new Set(tenant.enabledModuleCodes);

      type ExternalPortal = {
        mode: "external";
        moduleCode: string;
        label: string;
        icon: typeof Truck;
        children: Array<{ label: string; featureCode: string; to: string; icon: typeof Truck }>;
      };
      type EmbeddedPortal = {
        mode: "embedded";
        moduleCode: string;
        label: string;
        icon: typeof Truck;
        gateFeatureCode: string;
        tenantPath: string;
      };

      // Order matches the business-flow sequence the tenant should see:
      // Auction → Tracking → Vendor → Fleet → Customer.
      // (Driver App is intentionally not surfaced on the tenant sidebar
      // because it's a driver-facing app, not a tenant-admin workspace.
      // Its routes, permissions, and module catalog entry stay intact.)
      const portals: Array<ExternalPortal | EmbeddedPortal> = [
        {
          mode: "embedded",
          moduleCode: "AUCTION",
          label: "Auction / AMS",
          icon: Gavel,
          gateFeatureCode: "AUCTION_DASHBOARD",
          tenantPath: paths.auctionAms,
        },
        {
          mode: "external",
          moduleCode: "TRACKING",
          label: "Track and Trace",
          icon: MapPin,
          children: [
            { label: "Tracking Dashboard", featureCode: "TRACKING_DASHBOARD", to: `${paths.trackAndTrace}/dashboard`, icon: MapPin },
            { label: "Active Trips", featureCode: "TRACKING_TRIPS", to: `${paths.trackAndTrace}/trips`, icon: Truck },
            { label: "Live Map", featureCode: "TRACKING_LIVE_MAP", to: `${paths.trackAndTrace}/live-map`, icon: MapPin },
            { label: "Alerts", featureCode: "TRACKING_ALERTS", to: `${paths.trackAndTrace}/alerts`, icon: ShieldCheck },
            { label: "Geofences", featureCode: "TRACKING_GEOFENCES", to: `${paths.trackAndTrace}/geofences`, icon: MapPin },
            { label: "Analytics", featureCode: "TRACKING_ANALYTICS", to: `${paths.trackAndTrace}/analytics`, icon: ShieldCheck },
          ],
        },
        {
          mode: "embedded",
          moduleCode: "VENDOR",
          label: "Vendor Portal",
          icon: Users,
          gateFeatureCode: "VENDOR_DASHBOARD",
          tenantPath: paths.vendorPortal,
        },
        {
          mode: "embedded",
          moduleCode: "FLEET",
          label: "Fleet Management",
          icon: Truck,
          gateFeatureCode: "FLEET_DASHBOARD",
          tenantPath: paths.fleetManagement,
        },
        {
          mode: "embedded",
          moduleCode: "CUSTOMER",
          label: "Customer Portal",
          icon: UserCog,
          gateFeatureCode: "CUSTOMER_DASHBOARD",
          tenantPath: paths.customerPortal,
        },
      ];

      portals.forEach((portal) => {
        if (!enabled.has(portal.moduleCode)) return;
        if (portal.mode === "external") {
          const allowedChildren = portal.children.filter((child) =>
            hasPermission(activeRole, portal.moduleCode, child.featureCode, "view"),
          );
          if (allowedChildren.length === 0) return;
          groups.push({
            label: portal.label,
            icon: portal.icon,
            children: allowedChildren,
          });
          return;
        }
        // embedded — single tenant-route leaf, gated by the module's
        // dashboard view permission so it never escapes the tenant shell.
        if (!hasPermission(activeRole, portal.moduleCode, portal.gateFeatureCode, "view")) return;
        groups.push({
          to: portal.tenantPath,
          label: portal.label,
          icon: portal.icon,
          pageCode: `${portal.moduleCode}_EMBEDDED`,
        });
      });

      return groups;
    })(),
  ];

  const filteredTenantNav = activeRole
    ? filterTenantNavItems(tenantNav, (pageCode) =>
        pageCode
          ? canAccessTenantPath({
              tenant,
              pathname: pageCodeToPath(pageCode, paths),
              role: activeRole,
              rolePermissions,
            }).allowed
          : true,
      )
    : tenantNav;
  const routeAccess = activeRole
    ? canAccessTenantPath({
        tenant,
        pathname: location.pathname,
        role: activeRole,
        rolePermissions,
      })
    : { allowed: true, matchedPage: null };
  // Sidebar identity: tenant name (title), user name on line 1 of subtitle,
  // role name on line 2. `whitespace-pre-line` inside SidebarExplorer will
  // honour the newline. ActorLabel pill shows the tenant code for context.
  const sidebarSubtitle = [
    currentTenantUser?.name ?? session.actorName ?? "User",
    activeRole?.name ?? "User",
  ].join("\n");

  return (
    <WorkspaceShell
      title={tenant.name}
      subtitle={sidebarSubtitle}
      navItems={filteredTenantNav}
      actorLabel={tenant.code || "Tenant"}
      searchPlaceholder="Search tenant setup, users, roles, org units, and activity"
      headerRight={<TenantProfileMenu />}
    >
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={bookingFocused ? "flex-1 p-4 xl:p-5" : "flex-1 p-5 xl:p-6"}
      >
        {!routeAccess.allowed && routeAccess.matchedPage ? (
          <TenantEmptyState
            title="Access denied"
            description="You do not have permission to access this page."
          />
        ) : (
          <Outlet />
        )}
      </motion.main>
    </WorkspaceShell>
  );
}

function pageCodeToPath(pageCode: string, paths: ReturnType<typeof useTenantPaths>) {
  switch (pageCode) {
    case "TENANT_DASHBOARD":
      return paths.dashboard;
    case "HIERARCHY":
      return paths.hierarchy;
    case "ORG_UNITS":
      return paths.orgUnits;
    case "USERS":
      return paths.users;
    case "ROLES":
      return paths.roles;
    case "ROLE_PERMISSIONS":
      return paths.rolePermissions;
    case "CUSTOMERS":
      return paths.customers;
    case "VENDORS":
      return paths.vendors;
    case "VEHICLE_TYPES":
      return `${paths.root}/vehicle-types`;
    case "VEHICLES":
      return paths.vehicles;
    case "DRIVERS":
      return paths.drivers;
    case "MATERIALS":
      return paths.materials;
    case "UOM_CONFIG":
      return `${paths.root}/uom-config`;
    case "LR_CONFIG":
      return `${paths.root}/lr-config`;
    case "TENANT_MODULES":
      return paths.modules;
    case "AUDIT_LOGS":
      return paths.auditLogs;
    case "SETTINGS":
      return paths.settings;
    case "CREATE_BOOKING":
      return paths.createBooking;
    case "BOOKING_LIST":
      return paths.bookings;
    case "RATE_APPROVAL":
      return paths.rateApproval;
    case "ASSIGNMENT_QUEUE":
      return paths.assignment;
    case "LIVE_TRACKING":
      return paths.liveTracking;
    case "COMPLETED_BOOKINGS":
      return paths.completed;
    case "BOOKING_INVOICING":
      return `${paths.root}/bookings/invoicing`;
    case "FINANCE_WORKSPACE":
      return `${paths.root}/finance`;
    case "LR_DASHBOARD":
      return `${paths.root}/lr`;
    case "FLEET_DASHBOARD":
      return "/fleet/dashboard";
    case "AUCTION_DASHBOARD":
      return "/auction/dashboard";
    case "VENDOR_DASHBOARD":
      return "/vendor";
    case "CUSTOMER_DASHBOARD":
      return "/customer";
    case "TRACKING_DASHBOARD":
      return "/tracking";
    case "DRIVER_LOGIN":
      return paths.driverLogin;
    case "DRIVER_DASHBOARD":
      return paths.driverDashboard;
    case "MY_TRIPS":
      return paths.driverTrips;
    case "INCIDENT_CENTER":
      return paths.driverIncidents;
    case "DRIVER_PROFILE":
      return paths.driverProfile;
    default:
      return paths.dashboard;
  }
}
