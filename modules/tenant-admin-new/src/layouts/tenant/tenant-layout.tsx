import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Boxes,
  Building2,
  Gavel,
  Landmark,
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
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { computeEffectiveUserScope } from "@/modules/tenant-admin/lib/user-scope";
import { useSessionContext } from "@/shared/auth/session-context";
import {
  canAccessTenantPath,
  filterTenantNavItems,
  getSessionPortalModule,
  resolveSessionRoleContext,
} from "@/shared/lib/tenant-rbac";
import { useTenantPaths } from "@platform-admin/hooks/useTenantPaths";
import { hasPermission, usePermissionMatrixVersion, type PermissionAction } from "@/modules/tenant-admin/lib/tenant-permissions";
import { isTenantAdminRole } from "@/modules/tenant-admin/lib/tenant-modules";
import { TenantProfileMenu } from "@/modules/tenant-admin/components/tenant-profile-menu";
import { HeaderNotificationBell } from "@vendor/components/shared/HeaderNotificationBell";
import { manifestSidebarToTenantChildren } from "@/embedded-module";
import { vendorManifest } from "@vendor/app/manifest";
import { auctionManifest } from "@auction/app/manifest";
import { NAV as FINANCE_NAV, PAGES as FINANCE_PAGES } from "@finance/modules/finance/nav";
import { resolveFinanceMode } from "@/modules/tenant-admin/lib/finance-mode";

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

  // External-party portal sessions (vendor/customer signed in from tenant
  // master data). These have no tenant role — they only ever see their own
  // portal, with no Administration / Booking / internal pages in the sidebar.
  const portalModule = getSessionPortalModule(session);
  const portalNav: ExplorerNavItem[] =
    portalModule === "VENDOR"
      ? [
          {
            label: "Vendor Portal",
            icon: Users,
            to: paths.vendorPortal,
            children: manifestSidebarToTenantChildren(vendorManifest, paths.vendorPortal).map(
              (item) => ({
                label: item.label,
                to: item.to,
                icon: (item.icon ?? Users) as typeof Truck,
              }),
            ),
          },
        ]
      : portalModule === "CUSTOMER"
        ? (() => {
            // Surface the Customer Dashboard's own sections as expandable
            // submenu items in the main sidebar (same pattern as Vendor/Booking).
            // Sections are addressed via ?section= so the embedded dashboard can
            // deep-link and active-highlight while still sharing one pathname.
            const customerSection = new URLSearchParams(location.search).get("section") ?? "overview";
            const sectionItem = (id: string, label: string, icon: typeof UserCog) => ({
              label,
              icon,
              to: id === "overview" ? paths.customerPortal : `${paths.customerPortal}?section=${id}`,
              isActiveOverride: id === "overview" ? customerSection === "overview" : customerSection === id,
            });
            return [
              {
                label: "Customer Dashboard",
                icon: UserCog,
                to: paths.customerPortal,
                children: [
                  sectionItem("overview", "Overview", LayoutDashboard),
                  sectionItem("bookings", "Bookings", Boxes),
                  sectionItem("create", "Create Booking", Plus),
                  sectionItem("tracking", "Track & ePOD", MapPin),
                  sectionItem("finance", "Finance", Landmark),
                  sectionItem("reports", "Reports", Building2),
                ],
              },
            ];
          })()
        : [];

  const showGovernanceDashboard = !portalModule && !!activeRole && isTenantAdminRole(activeRole);
  const tenantNav = [
    // The tenant governance dashboard is only relevant for the Tenant Admin
    // role — everyone else lands directly on their module dashboard and
    // doesn't need this entry cluttering the sidebar.
    ...(showGovernanceDashboard
      ? [{ to: paths.dashboard, label: "Dashboard", icon: LayoutDashboard, pageCode: "TENANT_DASHBOARD" }]
      : []),
    // Administration covers tenant governance (hierarchy, users, roles) AND
    // all booking onboarding/setup data (master data, rules, LR config).
    // The group is shown when the role has ANY administration child granted
    // — either the ADMIN module or any TMS setup feature.
    ...(() => {
      // Administration governance (Hierarchy, Org Units, Users, Roles,
      // Permissions) is reserved for the system Tenant Admin role only.
      // We don't expand the gate based on `moduleCodes.includes("ADMIN")`
      // anymore — legacy roles may have a stray ADMIN code from when the
      // wizard default added it; we no longer treat that as a real grant.
      const adminModuleChildren: Array<ExplorerNavItem & { featureCode?: string }> =
        activeRole && isTenantAdminRole(activeRole)
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
            { to: paths.vehicles, label: "Vehicles", icon: Truck, pageCode: "VEHICLES", featureCode: "VEHICLE_TYPES" },
            { to: paths.drivers, label: "Drivers", icon: Users, pageCode: "DRIVERS", featureCode: "VEHICLE_TYPES" },
            { to: paths.vehicleTypes, label: "Vehicle Types", icon: Truck, pageCode: "VEHICLE_TYPES", featureCode: "VEHICLE_TYPES" },
            { to: paths.materials, label: "Materials", icon: Boxes, pageCode: "MATERIALS", featureCode: "MATERIALS" },
            { to: paths.uomConfig, label: "UOM", icon: Boxes, pageCode: "UOM_CONFIG", featureCode: "UOM" },
            { to: paths.addressBook, label: "Address Book", icon: Building2, pageCode: "ADDRESS_BOOK", featureCode: "ADDRESS_BOOK" },
            { to: paths.lrConfig, label: "LR Configuration", icon: ShieldCheck, pageCode: "LR_CONFIG", featureCode: "LR_CONFIGURATION" },
            { to: paths.lrManagement, label: "LR Management", icon: ShieldCheck, pageCode: "LR_DASHBOARD", featureCode: "LR_MANAGEMENT" },
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
      // Clicking the Booking group header lands on Booking Dashboard if
      // permitted, else the first allowed sub-item.
      const bookingHeaderTo = bookingOpsChildren.find((child) => child.to === paths.bookings)?.to
        ?? bookingOpsChildren[0]?.to;
      return [{ label: "Booking", icon: Truck, to: bookingHeaderTo, children: bookingOpsChildren }];
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

      // Every external-module portal is rendered as an expandable group of
      // its internal pages. Each child links to a TENANT-SHELL route
      // (/platform-admin/tenant/:id/<module>/<page>) so the tenant
      // sidebar/header stay visible — no jump to a standalone /auction,
      // /fleet, or /vendor URL.
      //
      // A child only shows when the role has view permission for its
      // feature; a whole group only shows when the tenant has the module
      // enabled AND at least one child is permitted.
      //
      // (Driver App is intentionally not surfaced — it's a driver-facing
      // app, not a tenant-admin workspace. Its routes/permissions stay.)
      type ModulePortal = {
        moduleCode: string;
        label: string;
        icon: typeof Truck;
        // Optional `to` makes the group header itself navigable — clicking
        // "Auction / AMS" jumps to its dashboard. Children stay visible.
        to?: string;
        children: Array<{ label: string; featureCode: string; to: string; icon: typeof Truck; isActiveOverride?: boolean }>;
      };

      const portals: ModulePortal[] = [
        {
          moduleCode: "AUCTION",
          label: "Auction / AMS",
          icon: Gavel,
          to: `${paths.auctionAms}/dashboard`,
          children: manifestSidebarToTenantChildren(auctionManifest, paths.auctionAms).map(
            (item) => ({
              label: item.label,
              featureCode: "AUCTION_DASHBOARD",
              to: item.to,
              icon: (item.icon ?? Gavel) as typeof Truck,
            }),
          ),
        },
        {
          moduleCode: "TRACKING",
          label: "Track and Trace",
          icon: MapPin,
          to: `${paths.trackAndTrace}/dashboard`,
          // Mirrors the actual pages under TrackingRoutes. "Active Trips" and
          // "Analytics" were legacy labels that landed on redirect-only
          // routes — replaced with their real destinations (Dispatch and
          // Route Performance) so the tenant sidebar surfaces every section
          // of the embedded track-and-trace app at one navigation level.
          children: [
            { label: "Dashboard", featureCode: "TRACKING_DASHBOARD", to: `${paths.trackAndTrace}/dashboard`, icon: MapPin },
            { label: "Live Map", featureCode: "TRACKING_LIVE_MAP", to: `${paths.trackAndTrace}/live-map`, icon: MapPin },
            { label: "Dispatch", featureCode: "TRACKING_TRIPS", to: `${paths.trackAndTrace}/dispatch`, icon: Truck },
            { label: "Alerts", featureCode: "TRACKING_ALERTS", to: `${paths.trackAndTrace}/alerts`, icon: ShieldCheck },
            { label: "Geofences", featureCode: "TRACKING_GEOFENCES", to: `${paths.trackAndTrace}/geofences`, icon: MapPin },
            { label: "Route Performance", featureCode: "TRACKING_ANALYTICS", to: `${paths.trackAndTrace}/route-performance`, icon: ShieldCheck },
          ],
        },
        // Vendor Portal is intentionally NOT surfaced to internal tenant users.
        // Vendors sign in with their own credentials (external portal session)
        // and land directly on their portal via `portalNav` above. Internal
        // users manage vendors through Administration → Vendors (onboarding).
        {
          moduleCode: "FLEET",
          label: "Fleet Management",
          icon: Truck,
          to: `${paths.fleetManagement}/dashboard`,
          children: [
            { label: "Fleet Dashboard", featureCode: "FLEET_DASHBOARD", to: `${paths.fleetManagement}/dashboard`, icon: Truck },
            { label: "Ops Intelligence", featureCode: "FLEET_OPS_INTEL", to: `${paths.fleetManagement}/ops-intel`, icon: ShieldCheck },
            { label: "Exception Center", featureCode: "FLEET_EXCEPTIONS", to: `${paths.fleetManagement}/exceptions`, icon: ShieldCheck },
            { label: "Live Map", featureCode: "FLEET_LIVE_MAP", to: `${paths.fleetManagement}/live-map`, icon: MapPin },
            { label: "Dispatch", featureCode: "FLEET_DISPATCH", to: `${paths.fleetManagement}/dispatch`, icon: Truck },
            { label: "Vehicles", featureCode: "FLEET_VEHICLES", to: `${paths.fleetManagement}/vehicles`, icon: Truck },
            { label: "Drivers", featureCode: "FLEET_DRIVERS", to: `${paths.fleetManagement}/drivers`, icon: Users },
            { label: "Compliance", featureCode: "FLEET_COMPLIANCE", to: `${paths.fleetManagement}/compliance`, icon: ShieldCheck },
            { label: "Maintenance", featureCode: "FLEET_MAINTENANCE", to: `${paths.fleetManagement}/maintenance`, icon: ShieldCheck },
            { label: "Garage", featureCode: "FLEET_GARAGE", to: `${paths.fleetManagement}/garage`, icon: ShieldCheck },
            { label: "Tyres", featureCode: "FLEET_TYRES", to: `${paths.fleetManagement}/tyres`, icon: ShieldCheck },
            { label: "Fuel", featureCode: "FLEET_FUEL", to: `${paths.fleetManagement}/fuel`, icon: ShieldCheck },
            { label: "Cost Health", featureCode: "FLEET_COST", to: `${paths.fleetManagement}/cost`, icon: ShieldCheck },
            { label: "Fleet Settings", featureCode: "FLEET_SETTINGS", to: `${paths.fleetManagement}/settings`, icon: ShieldCheck },
          ],
        },
        // Customer Portal is intentionally NOT surfaced to internal tenant
        // users either. Customers sign in with their own credentials and land
        // on their dashboard via `portalNav` above; internal users manage
        // customers through Administration → Customers (onboarding).
        // Finance is intentionally NOT listed here — it renders as a flat
        // top-level leaf (no nested children) so the tenant sidebar shows a
        // single "Finance" entry that opens the variant-resolved finance
        // workspace directly. See the leaf push below.
      ];

      portals.forEach((portal) => {
        if (!enabled.has(portal.moduleCode)) return;
        const allowedChildren = portal.children.filter((child) =>
          hasPermission(activeRole, portal.moduleCode, child.featureCode, "view"),
        );
        if (allowedChildren.length === 0) return;
        // Only attach `to` if the dashboard target is actually permitted —
        // otherwise clicking the group label would land on a route the user
        // can't view. Falls back to the first permitted child's URL.
        const headerTo = portal.to && allowedChildren.some((child) => child.to === portal.to)
          ? portal.to
          : allowedChildren[0]?.to;
        groups.push({
          label: portal.label,
          icon: portal.icon,
          to: headerTo,
          children: allowedChildren,
        });
      });

      // Finance — variant-aware nested children. The embedded finance routes
      // render one page at a time with no inner sidebar; the tenant sidebar
      // owns navigation by mirroring NAV[mode] for the tenant's resolved
      // finance variant (3PL / own-fleet / enterprise).
      if (
        enabled.has("FINANCE")
        && hasPermission(activeRole, "FINANCE", "FINANCE_DASHBOARD", "view")
      ) {
        const financeMode = resolveFinanceMode(tenant.tenantType, tenant.customerPortalEnabled);
        const financeChildren: ExplorerNavItem[] = FINANCE_NAV[financeMode].flatMap((grp) => {
          const items = grp.items.map<ExplorerNavItem>((id) => {
            const meta = FINANCE_PAGES[financeMode][id];
            return {
              label: meta.label,
              icon: meta.icon as unknown as typeof Truck,
              to: `${paths.finance}/${id}`,
            };
          });
          // Top-level (un-grouped) items — like Command Centre — appear as
          // direct children of Finance. Grouped items get a sub-folder header
          // so the user keeps the original section structure.
          if (grp.group === null) return items;
          return [
            {
              label: grp.group,
              icon: (items[0]?.icon ?? Landmark) as typeof Truck,
              children: items,
            },
          ];
        });
        groups.push({
          label: "Finance",
          icon: Landmark,
          to: paths.finance,
          pageCode: "FINANCE_WORKSPACE",
          children: financeChildren,
        });
      }

      return groups;
    })(),
  ];

  const filteredTenantNav = portalModule
    ? portalNav
    : activeRole
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
  const sidebarSubtitle = portalModule
    ? [
        (portalModule === "VENDOR" ? session.vendorName : session.customerName) ??
          session.actorName ??
          "User",
        portalModule === "VENDOR" ? "Vendor" : "Customer",
      ].join("\n")
    : [
        currentTenantUser?.name ?? session.actorName ?? "User",
        activeRole?.name ?? "User",
      ].join("\n");

  // Compute the logged-in user's effective place scope so the header can
  // surface "viewing as Company Root / Region / Branch — <place>" and any
  // data list can filter records through it.
  const { data: scopeOrgUnits } = useTenantOrgUnits(tenant.id);
  const effectiveScope = computeEffectiveUserScope(currentTenantUser, activeRole, scopeOrgUnits);
  const directOrgUnitNames = effectiveScope.directOrgUnitIds
    .map((id) => scopeOrgUnits.find((unit) => unit.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const scopeBannerLabel = effectiveScope.isCompanyRoot
    ? `Company Root — ${tenant.name}`
    : directOrgUnitNames.length > 0
      ? `${directOrgUnitNames.slice(0, 2).join(", ")}${directOrgUnitNames.length > 2 ? ` +${directOrgUnitNames.length - 2}` : ""}`
      : "No place mapping";

  return (
    <WorkspaceShell
      title={tenant.name}
      subtitle={sidebarSubtitle}
      navItems={filteredTenantNav}
      actorLabel={tenant.code || "Tenant"}
      searchPlaceholder="Search tenant setup, users, roles, org units, and activity"
      headerRight={
        <div className="flex items-center gap-2">
          {/* Vendor sessions get the vendor notification bell in the top bar. */}
          {portalModule === "VENDOR" && <HeaderNotificationBell />}
          <TenantProfileMenu />
        </div>
      }
    >
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={bookingFocused ? "flex-1 p-3 xl:p-4" : "flex-1 p-5 xl:p-6"}
      >
        {!routeAccess.allowed && routeAccess.matchedPage ? (
          <TenantEmptyState
            title="Access denied"
            description="You do not have permission to access this page."
          />
        ) : (
          <>
            {/* Scope banner — every page in the tenant shell shows whose
                scope the current view is filtered through. Helps users spot
                "I'm logged in as a Branch manager, so the data is branch-
                scoped" without having to dig into role settings. */}
            {!portalModule && currentTenantUser ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-indigo-100 bg-indigo-50/40 px-3 py-1.5 text-[11px]">
                <span className="inline-flex items-center rounded-md bg-indigo-100 px-1.5 py-0.5 font-semibold uppercase tracking-[0.06em] text-indigo-700">
                  {effectiveScope.isCompanyRoot ? "Company Root" : "Place scope"}
                </span>
                <span className="text-slate-700">{scopeBannerLabel}</span>
                {effectiveScope.isCompanyRoot ? null : (
                  <span className="text-slate-500">
                    · Lists are filtered to records inside this scope.
                  </span>
                )}
              </div>
            ) : null}
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-24 text-[13px] text-muted-foreground">
                  Loading…
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </>
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
