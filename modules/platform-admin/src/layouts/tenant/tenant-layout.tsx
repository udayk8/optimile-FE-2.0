import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Boxes,
  Building2,
  Gavel,
  LayoutDashboard,
  MapPin,
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
import { hasPermission } from "@/modules/tenant-admin/lib/tenant-permissions";
import { TenantProfileMenu } from "@/modules/tenant-admin/components/tenant-profile-menu";

export function TenantLayout() {
  const location = useLocation();
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
  const paths = useTenantPaths();
  const { data: users } = useTenantUsers(tenant.id);
  const { data: roles } = useTenantRoles(tenant.id);
  const { data: rolePermissions } = useTenantRolePermissions(tenant.id);
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
    // Administration is the tenant governance module. Visible only when the
    // active role explicitly has the ADMIN module (or is the system Tenant
    // Admin role, which bypasses all RBAC).
    ...(activeRole && ((activeRole.moduleCodes ?? []).includes("ADMIN") || activeRole.id.endsWith("-tenant-admin") || activeRole.name.toLowerCase() === "tenant admin")
      ? [
          {
            label: "Administration",
            icon: Boxes,
            children: [
              { to: paths.hierarchy, label: "Hierarchy Setup", icon: Building2, pageCode: "HIERARCHY" },
              { to: paths.orgUnits, label: "Org Units", icon: Building2, pageCode: "ORG_UNITS" },
              { to: paths.users, label: "Users", icon: Users, pageCode: "USERS" },
              { to: paths.roles, label: "Roles", icon: ShieldCheck, pageCode: "ROLES" },
              { to: paths.rolePermissions, label: "Role Permissions", icon: ShieldCheck, pageCode: "ROLE_PERMISSIONS" },
            ],
          },
        ]
      : []),
    // Booking sidebar groups respect role permissions at the feature level.
    // A user with only Booking Dashboard view permission MUST NOT see
    // Customers / Vendors / LR Config / etc. — module-level access is not
    // sufficient.
    ...(() => {
      // Tenant must have Booking (TMS) module enabled. Cheap pre-filter.
      if (!tenant.enabledModuleCodes.includes("TMS")) return [];

      // Setup-only feature codes (Setup Overview itself doesn't have its own
      // permission — it shows when any of these is granted).
      const SETUP_FEATURE_CODES = [
        "CUSTOMERS",
        "VENDORS",
        "VEHICLE_TYPES",
        "MATERIALS",
        "UOM",
        "ADDRESS_BOOK",
        "LR_CONFIGURATION",
        "ASSIGNMENT_RULES",
        "DOCUMENT_RULES",
        "POD_RULES",
      ];
      const hasAnySetup = SETUP_FEATURE_CODES.some((code) => hasPermission(activeRole, "TMS", code, "view"));

      const bookingSetupChildren: Array<ExplorerNavItem & { featureCode?: string }> = [
        ...(hasAnySetup
          ? [{ to: paths.bookingSetup, label: "Setup Overview", icon: Boxes, pageCode: "BOOKING_SETUP" }]
          : []),
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
      ].filter((item) => !item.featureCode || hasPermission(activeRole, "TMS", item.featureCode, "view"));

      const bookingOpsChildren: Array<ExplorerNavItem & { featureCode: string }> = [
        { to: paths.bookings, label: "Booking Dashboard", icon: Truck, pageCode: "BOOKING_LIST", featureCode: "BOOKING_DASHBOARD" },
        { to: paths.assignment, label: "Booking Assignment", icon: Truck, pageCode: "ASSIGNMENT_QUEUE", featureCode: "BOOKING_ASSIGNMENT" },
        { to: paths.completed, label: "Shipment Documents", icon: Truck, pageCode: "COMPLETED_BOOKINGS", featureCode: "SHIPMENT_DOCUMENTS" },
        { to: `${paths.root}/lr`, label: "LR Management", icon: ShieldCheck, pageCode: "LR_DASHBOARD", featureCode: "LR_MANAGEMENT" },
        { to: paths.liveTracking, label: "POD", icon: ShieldCheck, pageCode: "LIVE_TRACKING", featureCode: "POD" },
        { to: paths.bookings, label: "Reports", icon: ShieldCheck, pageCode: "BOOKING_LIST", featureCode: "BOOKING_REPORTS" },
      ].filter((item) => hasPermission(activeRole, "TMS", item.featureCode, "view"));

      const groups: ExplorerNavItem[] = [];
      if (bookingSetupChildren.length > 0) groups.push({ label: "Booking Setup", icon: Boxes, children: bookingSetupChildren });
      if (bookingOpsChildren.length > 0) groups.push({ label: "Booking Operations", icon: Truck, children: bookingOpsChildren });
      return groups;
    })(),
    ...(() => {
      const groups: ExplorerNavItem[] = [];

      if (activeRole && canAccessTenantPath({
        tenant,
        pathname: "/fleet/dashboard",
        role: activeRole,
        rolePermissions,
      }).allowed) {
        groups.push({
          label: "Fleet Management",
          icon: Truck,
          children: [
            { to: "/fleet/dashboard", label: "Fleet Dashboard", icon: Truck, pageCode: "FLEET_DASHBOARD" },
          ],
        });
      }

      if (activeRole && canAccessTenantPath({
        tenant,
        pathname: "/auction/dashboard",
        role: activeRole,
        rolePermissions,
      }).allowed) {
        groups.push({
          label: "Auction",
          icon: Gavel,
          children: [
            { to: "/auction/dashboard", label: "Auction Dashboard", icon: Gavel, pageCode: "AUCTION_DASHBOARD" },
          ],
        });
      }

      if (activeRole && canAccessTenantPath({
        tenant,
        pathname: "/vendor",
        role: activeRole,
        rolePermissions,
      }).allowed) {
        groups.push({
          label: "Vendor App",
          icon: Users,
          children: [
            { to: "/vendor", label: "Vendor Dashboard", icon: Users, pageCode: "VENDOR_DASHBOARD" },
          ],
        });
      }

      if (currentTenantUser?.userType === "CUSTOMER" && activeRole && canAccessTenantPath({
        tenant,
        pathname: "/customer",
        role: activeRole,
        rolePermissions,
      }).allowed) {
        groups.push({
          label: "Customer Dashboard",
          icon: UserCog,
          children: [
            { to: "/customer", label: "Customer Dashboard", icon: UserCog, pageCode: "CUSTOMER_DASHBOARD" },
          ],
        });
      }

      if (activeRole && canAccessTenantPath({
        tenant,
        pathname: "/tracking",
        role: activeRole,
        rolePermissions,
      }).allowed) {
        groups.push({
          label: "Track and Trace",
          icon: MapPin,
          children: [
            { to: "/tracking", label: "Tracking Dashboard", icon: MapPin, pageCode: "TRACKING_DASHBOARD" },
          ],
        });
      }

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
