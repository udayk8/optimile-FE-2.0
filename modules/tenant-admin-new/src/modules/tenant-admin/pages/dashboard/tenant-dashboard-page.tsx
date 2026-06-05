import type { ComponentType } from "react";
import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowUpRight,
  Boxes,
  Building2,
  FileDigit,
  Layers,
  MapPin,
  Package,
  ScrollText,
  ShieldCheck,
  Truck,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useTenantOrgUnits } from "@/modules/tenant-admin/hooks/useTenantOrgUnits";
import { useTenantRolePermissions } from "@/modules/tenant-admin/hooks/useTenantRolePermissions";
import { useTenantRoles } from "@/modules/tenant-admin/hooks/useTenantRoles";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import { useTenantCustomers } from "@/modules/tenant-admin/hooks/useTenantCustomers";
import { useTenantVendors } from "@/modules/tenant-admin/hooks/useTenantVendors";
import { useTenantHierarchy } from "@/modules/tenant-admin/hooks/useTenantHierarchy";
import { useSessionContext } from "@/shared/auth/session-context";
import { useTenantPaths } from "@platform-admin/hooks/useTenantPaths";
import { resolveSessionRoleContext } from "@/shared/lib/tenant-rbac";
import { StatusDot } from "@/modules/tenant-admin/components/admin-ui";
import { isTenantAdminRole, TENANT_ADMIN_MODULE_CODE } from "@/modules/tenant-admin/lib/tenant-modules";
import { pickTenantLandingPath } from "@/modules/tenant-admin/lib/tenant-landing";
import { hasPermission } from "@/modules/tenant-admin/lib/tenant-permissions";
import { canRoleViewPage } from "@/shared/lib/tenant-page-access";

const BOOKING_SETUP_STORAGE_KEY = "optimile.tenant.bookingSetup";

interface BookingSetupSnapshot {
  addressCount: number;
  hasAssignmentRules: boolean;
  hasDocumentRules: boolean;
  hasPodRules: boolean;
}

function loadBookingSetup(tenantId: string): BookingSetupSnapshot {
  const blank: BookingSetupSnapshot = {
    addressCount: 0,
    hasAssignmentRules: false,
    hasDocumentRules: false,
    hasPodRules: false,
  };
  if (typeof window === "undefined") return blank;
  try {
    const raw = window.localStorage.getItem(BOOKING_SETUP_STORAGE_KEY);
    if (!raw) return blank;
    const all = JSON.parse(raw) as Record<string, {
      addresses?: unknown[];
      assignmentRules?: unknown;
      documentRules?: unknown;
      podRules?: unknown;
    }>;
    const entry = all[tenantId] ?? {};
    return {
      addressCount: Array.isArray(entry.addresses) ? entry.addresses.length : 0,
      hasAssignmentRules: Boolean(entry.assignmentRules),
      hasDocumentRules: Boolean(entry.documentRules),
      hasPodRules: Boolean(entry.podRules),
    };
  } catch {
    return blank;
  }
}

export function TenantDashboardPage() {
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
  const paths = useTenantPaths();
  const { data: orgUnits } = useTenantOrgUnits(tenant.id);
  const { data: users } = useTenantUsers(tenant.id);
  const { data: roles } = useTenantRoles(tenant.id);
  const { data: rolePermissions } = useTenantRolePermissions(tenant.id);
  const { data: customers } = useTenantCustomers(tenant.id);
  const { data: vendors } = useTenantVendors(tenant.id);
  const { data: hierarchyState } = useTenantHierarchy(tenant.id);

  const { activeRole, currentTenantUser, roleAccess } = resolveSessionRoleContext({
    tenant,
    session,
    users,
    roles,
    rolePermissions,
  });

  // The governance dashboard is a Tenant Admin view. Anyone else (Fleet
  // Manager, Procurement, etc.) gets redirected to their first enabled
  // module's dashboard. Covers refresh / direct-URL / already-in-session
  // cases that miss the login-time redirect.
  if (activeRole && !isTenantAdminRole(activeRole)) {
    const landing = pickTenantLandingPath(tenant.id, activeRole, tenant.enabledModuleCodes ?? []);
    if (landing !== `/tenant-admin/tenant/${tenant.id}/dashboard`) {
      return <Navigate to={landing} replace />;
    }
  }

  const canAdmin =
    !!activeRole &&
    (isTenantAdminRole(activeRole) ||
      (activeRole.moduleCodes ?? []).includes(TENANT_ADMIN_MODULE_CODE));
  const can = (featureCode: string) => hasPermission(activeRole, "TMS", featureCode, "view");
  const canViewPage = (pageCode: string) => canRoleViewPage(roleAccess, pageCode);

  const activeUsers = users.filter((user) => user.status === "active").length;
  const editableRoles = useMemo(() => roles.filter((role) => !isTenantAdminRole(role)), [roles]);
  const hierarchyLevels = hierarchyState.hierarchy.levels.length;
  const bookingSetup = loadBookingSetup(tenant.id);

  // ──────────────────────────────────────────────────────────────────────────
  // Setup checklist rows
  // ──────────────────────────────────────────────────────────────────────────
  const hierarchyPercent = hierarchyLevels > 0 ? 100 : 0;
  const orgUnitPercent = Math.min(100, orgUnits.length * 25);
  const userPercent = activeUsers > 1 ? Math.min(100, activeUsers * 20) : activeUsers === 1 ? 25 : 0;
  const rolePercent = editableRoles.length > 0 ? Math.min(100, editableRoles.length * 25) : 0;
  const bookingMasterPercent = Math.min(
    100,
    [customers.length, vendors.length, bookingSetup.addressCount]
      .reduce((accumulator, value) => accumulator + (value > 0 ? 33 : 0), 0),
  );
  const lrPercent = bookingSetup.hasAssignmentRules ? 100 : 0;

  const checklist: Array<{
    id: string;
    area: string;
    percent: number;
    next: string;
    to: string;
    visible: boolean;
  }> = [
    { id: "hierarchy", area: "Hierarchy", percent: hierarchyPercent, next: hierarchyPercent === 100 ? "Review" : "Define levels", to: paths.hierarchy, visible: canAdmin },
    { id: "org-units", area: "Org Units", percent: orgUnitPercent, next: orgUnits.length === 0 ? "Add first unit" : "Manage", to: paths.orgUnits, visible: canAdmin },
    { id: "users", area: "Users", percent: userPercent, next: activeUsers <= 1 ? "Invite users" : "Manage", to: paths.users, visible: canAdmin },
    { id: "roles", area: "Roles & Permissions", percent: rolePercent, next: editableRoles.length === 0 ? "Create roles" : "Manage", to: paths.roles, visible: canAdmin },
    {
      id: "booking-master",
      area: "Booking Master Data",
      percent: bookingMasterPercent,
      next: bookingMasterPercent < 100 ? "Continue setup" : "Review",
      to: paths.bookingSetup,
      visible: tenant.enabledModuleCodes.includes("TMS") &&
        (can("CUSTOMERS") || can("VENDORS") || can("VEHICLE_TYPES") || can("MATERIALS") || can("UOM") || can("ADDRESS_BOOK")),
    },
    {
      id: "lr-config",
      area: "LR Configuration",
      percent: lrPercent,
      next: lrPercent < 100 ? "Configure" : "Review",
      to: paths.lrConfig,
      visible: tenant.enabledModuleCodes.includes("TMS") && can("LR_CONFIGURATION"),
    },
  ];
  const visibleChecklist = checklist.filter((row) => row.visible);

  // ──────────────────────────────────────────────────────────────────────────
  // KPI cards
  // ──────────────────────────────────────────────────────────────────────────
  const bookingSetupComplete = bookingMasterPercent === 100;
  const lrSetupComplete = lrPercent === 100;
  const kpis: Array<{ label: string; value: string | number; helper?: string; to: string; tone?: "warn" | "ok" }> = [
    ...(canAdmin
      ? [
          { label: "Org Units", value: orgUnits.length, helper: orgUnits.length === 0 ? "Not set up" : `${hierarchyLevels} levels`, to: paths.orgUnits },
          { label: "Users", value: activeUsers, helper: `${users.length} total`, to: paths.users },
          { label: "Roles", value: editableRoles.length, helper: "operational", to: paths.roles },
        ]
      : []),
    ...(tenant.enabledModuleCodes.includes("TMS") &&
    (can("CUSTOMERS") || can("VENDORS") || can("VEHICLE_TYPES") || can("MATERIALS") || can("UOM") || can("ADDRESS_BOOK"))
      ? [
          {
            label: "Booking Setup",
            value: bookingSetupComplete ? "Complete" : `${bookingMasterPercent}%`,
            helper: bookingSetupComplete ? "All master data ready" : "Continue setup",
            to: paths.bookingSetup,
            tone: bookingSetupComplete ? ("ok" as const) : ("warn" as const),
          },
        ]
      : []),
    ...(tenant.enabledModuleCodes.includes("TMS") && can("LR_CONFIGURATION")
      ? [
          {
            label: "LR Setup",
            value: lrSetupComplete ? "Complete" : `${lrPercent}%`,
            helper: lrSetupComplete ? "Rules configured" : "Configure rules",
            to: paths.lrConfig,
            tone: lrSetupComplete ? ("ok" as const) : ("warn" as const),
          },
        ]
      : []),
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // Booking Readiness section
  // ──────────────────────────────────────────────────────────────────────────
  const masterDataItems = [
    { label: "Customers", value: customers.length, to: paths.customers, feature: "CUSTOMERS" },
    { label: "Vendors", value: vendors.length, to: paths.vendors, feature: "VENDORS" },
    { label: "Vehicle Types", value: 0, to: paths.vehicleTypes, feature: "VEHICLE_TYPES" },
    { label: "Materials", value: 0, to: paths.materials, feature: "MATERIALS" },
    { label: "UOM", value: 0, to: paths.uomConfig, feature: "UOM" },
    { label: "Address Book", value: bookingSetup.addressCount, to: paths.addressBook, feature: "ADDRESS_BOOK" },
  ].filter((item) => can(item.feature));

  const operationalRules = [
    {
      label: "LR Configuration",
      to: paths.lrConfig,
      feature: "LR_CONFIGURATION",
      configured: bookingSetup.hasAssignmentRules,
    },
    {
      label: "Assignment Rules",
      to: paths.assignmentRules,
      feature: "ASSIGNMENT_RULES",
      configured: bookingSetup.hasAssignmentRules,
    },
    {
      label: "Document Rules",
      to: paths.documentRules,
      feature: "DOCUMENT_RULES",
      configured: bookingSetup.hasDocumentRules,
    },
    {
      label: "POD Rules",
      to: paths.podRules,
      feature: "POD_RULES",
      configured: bookingSetup.hasPodRules,
    },
  ].filter((item) => can(item.feature));

  const showBookingReadiness =
    tenant.enabledModuleCodes.includes("TMS") && (masterDataItems.length > 0 || operationalRules.length > 0);

  // ──────────────────────────────────────────────────────────────────────────
  // Quick Actions
  // ──────────────────────────────────────────────────────────────────────────
  const quickActions: Array<{ label: string; icon: ComponentType<{ className?: string }>; to: string }> = [
    ...(canAdmin
      ? [
          { label: "Add User", icon: UserRound, to: paths.users },
          { label: "Add Role", icon: ShieldCheck, to: paths.roles },
          { label: "Add Org Unit", icon: Building2, to: paths.orgUnits },
        ]
      : []),
    ...(can("CUSTOMERS") ? [{ label: "Add Customer", icon: UserCog, to: paths.customers }] : []),
    ...(can("LR_CONFIGURATION") ? [{ label: "Configure LR", icon: FileDigit, to: paths.lrConfig }] : []),
    ...(can("VEHICLE_TYPES") ? [{ label: "Vehicle Types", icon: Truck, to: paths.vehicleTypes }] : []),
    ...(can("MATERIALS") ? [{ label: "Add Material", icon: Package, to: paths.materials }] : []),
    ...(can("ADDRESS_BOOK") ? [{ label: "Address Book", icon: MapPin, to: paths.addressBook }] : []),
    ...(can("DOCUMENT_RULES") ? [{ label: "Document Rules", icon: ScrollText, to: paths.documentRules }] : []),
    // Booking operations — surface for operational roles who don't see admin actions.
    ...(can("BOOKING_DASHBOARD") ? [{ label: "Booking Dashboard", icon: Truck, to: paths.bookings }] : []),
    ...(can("BOOKING_ASSIGNMENT") ? [{ label: "Booking Assignment", icon: Truck, to: paths.assignment }] : []),
    ...(can("SHIPMENT_DOCUMENTS") ? [{ label: "Shipment Documents", icon: ScrollText, to: paths.completed }] : []),
    ...(can("POD") ? [{ label: "POD", icon: ShieldCheck, to: paths.liveTracking }] : []),
    ...(can("BOOKING_REPORTS") ? [{ label: "Dashboard", icon: ScrollText, to: `${paths.root}/booking-reports` }] : []),
    ...(canViewPage("FLEET_DASHBOARD") ? [{ label: "Fleet Dashboard", icon: Truck, to: "/fleet/dashboard" }] : []),
    ...(canViewPage("AUCTION_DASHBOARD") ? [{ label: "Auction Dashboard", icon: Layers, to: "/auction/dashboard" }] : []),
    ...(canViewPage("VENDOR_DASHBOARD") ? [{ label: "Vendor App", icon: Users, to: "/vendor" }] : []),
    ...(canViewPage("CUSTOMER_DASHBOARD") ? [{ label: "Customer Dashboard", icon: UserCog, to: "/customer" }] : []),
    ...(canViewPage("TRACKING_DASHBOARD") ? [{ label: "Track and Trace", icon: MapPin, to: "/tracking" }] : []),
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // Recent activity from local data (users + role changes)
  // ──────────────────────────────────────────────────────────────────────────
  const activity = useMemo(() => {
    if (!canAdmin) return [];
    const items: Array<{ id: string; title: string; meta: string }> = [];
    [...users]
      .sort((left, right) => right.lastActive.localeCompare(left.lastActive))
      .slice(0, 3)
      .forEach((user) => {
        items.push({
          id: `user-${user.id}`,
          title: `${user.name} (${user.status})`,
          meta: `User · ${new Date(user.lastActive).toLocaleDateString()}`,
        });
      });
    [...editableRoles].slice(0, 2).forEach((role) => {
      items.push({
        id: `role-${role.id}`,
        title: role.name,
        meta: `Role · ${role.active ? "Active" : "Inactive"}`,
      });
    });
    return items.slice(0, 5);
  }, [canAdmin, editableRoles, users]);

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Admin action row, aligned left. Tenant identity is shown by the
          shell header (top-left) and the profile menu (top-right). */}
      {canAdmin ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to={paths.users}>
              <Users className="size-4" />
              Manage Users
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to={paths.roles}>
              <ShieldCheck className="size-4" />
              Manage Roles
            </Link>
          </Button>
        </div>
      ) : null}

      {/* KPI row — clickable */}
      {kpis.length > 0 ? (
        <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-${Math.min(5, kpis.length)}`}>
          {kpis.map((kpi) => (
            <Link
              key={kpi.label}
              to={kpi.to}
              className="group rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start justify-between">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500">{kpi.label}</p>
                <ArrowUpRight className="size-3.5 text-slate-400 opacity-0 transition group-hover:opacity-100" />
              </div>
              <p
                className={`mt-1 text-[20px] font-semibold tracking-[-0.02em] ${
                  kpi.tone === "warn" ? "text-amber-700" : kpi.tone === "ok" ? "text-emerald-700" : "text-slate-900"
                }`}
              >
                {kpi.value}
              </p>
              {kpi.helper ? <p className="mt-0.5 text-[11px] text-slate-500">{kpi.helper}</p> : null}
            </Link>
          ))}
        </div>
      ) : null}

      {/* Tenant Setup Checklist — single source of truth, replaces Setup Progress + Administration */}
      {visibleChecklist.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-700">Tenant Setup Checklist</p>
            <p className="text-[11px] text-slate-500">
              {visibleChecklist.filter((row) => row.percent === 100).length} of {visibleChecklist.length} complete
            </p>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-2 font-medium">Area</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Completion</th>
                <th className="px-4 py-2 text-right font-medium">Next Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleChecklist.map((row) => {
                const status = row.percent === 100 ? "Complete" : row.percent === 0 ? "Pending" : "In progress";
                const tone = row.percent === 100 ? "ok" : row.percent === 0 ? "off" : "warn";
                return (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{row.area}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-700">
                        <StatusDot tone={tone} />
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full ${row.percent === 100 ? "bg-emerald-500" : "bg-slate-700"}`}
                            style={{ width: `${row.percent}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500">{row.percent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link to={row.to} className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-700 hover:text-slate-900">
                        {row.next}
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Booking Readiness — two columns */}
      {showBookingReadiness ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          {masterDataItems.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-2.5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-700">Booking Master Data</p>
              </div>
              <ul className="divide-y divide-slate-100">
                {masterDataItems.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="flex items-center justify-between gap-3 px-4 py-2 transition hover:bg-slate-50"
                    >
                      <span className="text-[13px] text-slate-700">{item.label}</span>
                      <span className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-900">
                        {item.value}
                        <ArrowUpRight className="size-3.5 text-slate-400" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {operationalRules.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-2.5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-700">Operational Rules</p>
              </div>
              <ul className="divide-y divide-slate-100">
                {operationalRules.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="flex items-center justify-between gap-3 px-4 py-2 transition hover:bg-slate-50"
                    >
                      <span className="text-[13px] text-slate-700">{item.label}</span>
                      <span className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] ${
                            item.configured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.configured ? "Configured" : "Pending"}
                        </span>
                        <ArrowUpRight className="size-3.5 text-slate-400" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Quick Actions + Recent Activity */}
      {(quickActions.length > 0 || activity.length > 0) ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          {quickActions.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-2.5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-700">Quick Actions</p>
              </div>
              <ul className="divide-y divide-slate-100">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <li key={action.label}>
                      <Link
                        to={action.to}
                        className="flex items-center justify-between gap-3 px-4 py-2 text-[13px] text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Icon className="size-3.5 text-slate-500" />
                          {action.label}
                        </span>
                        <ArrowUpRight className="size-3.5 text-slate-400" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {canAdmin ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-2.5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-700">Recent Activity</p>
              </div>
              {activity.length === 0 ? (
                <p className="px-4 py-6 text-center text-[12px] text-slate-500">No recent activity.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {activity.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                      <span className="mt-0.5 size-1.5 rounded-full bg-slate-300" />
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-slate-900">{item.title}</p>
                        <p className="text-[11px] text-slate-500">{item.meta}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Silence unused warning for Boxes (kept available for future sections). */}
      <span hidden>
        <Boxes />
        <Layers />
      </span>
    </div>
  );
}
