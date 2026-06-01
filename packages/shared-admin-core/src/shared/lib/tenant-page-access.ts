import type { TenantRecord, TenantType } from "@/types/platform";
import type {
  RoleAccessModule,
  RoleAccessPage,
  RoleDefinition,
  RolePageAction,
  RolePermission,
} from "@/types/access";

export type TenantPageModuleCode =
  | "ADMINISTRATION"
  | "BOOKING"
  | "AUCTION"
  | "FLEET_APP"
  | "FINANCE"
  | "LR"
  | "TRACK_TRACE"
  | "DRIVER_APP"
  | "VENDOR_APP"
  | "CUSTOMER_PORTAL";

export interface TenantPageDefinition {
  pageCode: string;
  label: string;
  moduleCode: TenantPageModuleCode;
  description: string;
  routePatterns: string[];
  availableActions: RolePageAction[];
  requiredPlatformModules?: string[];
  allowedTenantTypes?: TenantType[];
  requiresCustomerPortal?: boolean;
}

type GenericActionKey = "view" | "create" | "edit" | "delete" | "approve";

const genericActionMap: Record<GenericActionKey, RolePageAction> = {
  view: "VIEW",
  create: "CREATE",
  edit: "EDIT",
  delete: "DELETE",
  approve: "APPROVE",
};

const pageActionPrerequisites: Partial<Record<RolePageAction, GenericActionKey>> = {
  VIEW: "view",
  VIEW_MARGIN: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
  APPROVE: "approve",
  REJECT: "approve",
  EXPORT: "view",
  PRINT: "view",
  UPLOAD: "create",
  DOWNLOAD: "view",
  SUBMIT_BOOKING: "create",
  APPROVE_RATE: "approve",
  ASSIGN_VENDOR: "edit",
  ASSIGN_VEHICLE: "edit",
  START_LOADING: "edit",
  COMPLETE_LOADING: "edit",
  UPLOAD_DOCUMENTS: "create",
  GENERATE_LR: "create",
  MARK_DELIVERED: "edit",
  UPLOAD_POD: "create",
  MARK_COMPLETED: "approve",
  GENERATE_INVOICE: "create",
  VIEW_INVOICE: "view",
  PRINT_INVOICE: "view",
  MARK_PAID: "edit",
  RAISE_DISPUTE: "create",
  CREATE_LR: "create",
  UPLOAD_LR: "create",
  ALLOCATE_LR: "edit",
  REQUEST_LR: "create",
  APPROVE_LR: "approve",
  TRANSFER_LR: "edit",
  VOID_LR: "delete",
  VIEW_AUDIT: "view",
};

const allPageDefinitions: TenantPageDefinition[] = [
  {
    pageCode: "TENANT_DASHBOARD",
    label: "Dashboard",
    moduleCode: "ADMINISTRATION",
    description: "Tenant workspace landing dashboard.",
    routePatterns: ["/tenant/:tenantId/dashboard"],
    availableActions: ["VIEW", "EXPORT"],
  },
  {
    pageCode: "HIERARCHY",
    label: "Hierarchy",
    moduleCode: "ADMINISTRATION",
    description: "Hierarchy structure management.",
    routePatterns: ["/tenant/:tenantId/hierarchy"],
    availableActions: ["VIEW", "CREATE", "EDIT", "DELETE"],
  },
  {
    pageCode: "ORG_UNITS",
    label: "Org Units",
    moduleCode: "ADMINISTRATION",
    description: "Tenant org-unit management.",
    routePatterns: ["/tenant/:tenantId/org-units"],
    availableActions: ["VIEW", "CREATE", "EDIT", "DELETE"],
  },
  {
    pageCode: "USERS",
    label: "Users",
    moduleCode: "ADMINISTRATION",
    description: "User creation, edit, and assignment.",
    routePatterns: ["/tenant/:tenantId/users", "/tenant/:tenantId/users/:userId"],
    availableActions: ["VIEW", "CREATE", "EDIT", "DELETE", "APPROVE"],
  },
  {
    pageCode: "ROLES",
    label: "Roles",
    moduleCode: "ADMINISTRATION",
    description: "Role setup and governance.",
    routePatterns: ["/tenant/:tenantId/roles", "/tenant/:tenantId/roles/:roleId"],
    availableActions: ["VIEW", "CREATE", "EDIT", "DELETE", "APPROVE"],
  },
  {
    pageCode: "ROLE_PERMISSIONS",
    label: "Role Permissions",
    moduleCode: "ADMINISTRATION",
    description: "Legacy feature permission matrix.",
    routePatterns: ["/tenant/:tenantId/role-permissions"],
    availableActions: ["VIEW", "EDIT", "APPROVE"],
  },
  {
    pageCode: "CUSTOMERS",
    label: "Customers",
    moduleCode: "ADMINISTRATION",
    description: "Customer setup and customer detail management.",
    routePatterns: ["/tenant/:tenantId/customers", "/tenant/:tenantId/customers/:tenantCustomerId"],
    availableActions: ["VIEW", "CREATE", "EDIT", "DELETE", "UPLOAD", "DOWNLOAD", "EXPORT"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "VENDORS",
    label: "Vendors",
    moduleCode: "ADMINISTRATION",
    description: "Vendor setup and vendor rate-card management.",
    routePatterns: ["/tenant/:tenantId/vendors", "/tenant/:tenantId/vendors/:tenantVendorId"],
    availableActions: ["VIEW", "CREATE", "EDIT", "DELETE", "UPLOAD", "DOWNLOAD", "EXPORT"],
    requiredPlatformModules: ["PROCUREMENT", "TMS"],
  },
  {
    pageCode: "VEHICLE_TYPES",
    label: "Vehicle Types",
    moduleCode: "ADMINISTRATION",
    description: "Vehicle type master data.",
    routePatterns: ["/tenant/:tenantId/vehicle-types"],
    availableActions: ["VIEW", "CREATE", "EDIT", "DELETE"],
    requiredPlatformModules: ["FLEET", "TMS"],
  },
  {
    pageCode: "VEHICLES",
    label: "Vehicles",
    moduleCode: "ADMINISTRATION",
    description: "Vehicle master management.",
    routePatterns: ["/tenant/:tenantId/vehicles"],
    availableActions: ["VIEW", "CREATE", "EDIT", "DELETE"],
    requiredPlatformModules: ["FLEET", "TMS"],
  },
  {
    pageCode: "DRIVERS",
    label: "Drivers",
    moduleCode: "ADMINISTRATION",
    description: "Driver master management.",
    routePatterns: ["/tenant/:tenantId/drivers"],
    availableActions: ["VIEW", "CREATE", "EDIT", "DELETE"],
    requiredPlatformModules: ["FLEET", "TMS"],
  },
  {
    pageCode: "MATERIALS",
    label: "Materials",
    moduleCode: "ADMINISTRATION",
    description: "Materials master management.",
    routePatterns: ["/tenant/:tenantId/materials"],
    availableActions: ["VIEW", "CREATE", "EDIT", "DELETE"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "UOM_CONFIG",
    label: "UOM Config",
    moduleCode: "ADMINISTRATION",
    description: "UOM configuration and mapping.",
    routePatterns: ["/tenant/:tenantId/uom-config"],
    availableActions: ["VIEW", "CREATE", "EDIT", "DELETE"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "LR_CONFIG",
    label: "LR Config",
    moduleCode: "ADMINISTRATION",
    description: "Tenant LR configuration workspace.",
    routePatterns: ["/tenant/:tenantId/lr-config"],
    availableActions: ["VIEW", "CREATE", "EDIT", "DELETE", "APPROVE"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "TENANT_MODULES",
    label: "Tenant Modules",
    moduleCode: "ADMINISTRATION",
    description: "Tenant module visibility and feature catalog.",
    routePatterns: ["/tenant/:tenantId/modules", "/tenant/:tenantId/capabilities"],
    availableActions: ["VIEW"],
  },
  {
    pageCode: "AUDIT_LOGS",
    label: "Audit Logs",
    moduleCode: "ADMINISTRATION",
    description: "Tenant audit logs.",
    routePatterns: ["/tenant/:tenantId/audit-logs"],
    availableActions: ["VIEW", "EXPORT", "DOWNLOAD"],
  },
  {
    pageCode: "SETTINGS",
    label: "Settings",
    moduleCode: "ADMINISTRATION",
    description: "Tenant settings view.",
    routePatterns: ["/tenant/:tenantId/settings"],
    availableActions: ["VIEW", "EDIT"],
  },
  {
    pageCode: "BOOKING_LIST",
    label: "Booking List",
    moduleCode: "BOOKING",
    description: "Booking list and state pipeline.",
    routePatterns: ["/tenant/:tenantId/bookings"],
    availableActions: ["VIEW", "EXPORT", "DOWNLOAD"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "CREATE_BOOKING",
    label: "Create Booking",
    moduleCode: "BOOKING",
    description: "Booking creation workspace.",
    routePatterns: ["/tenant/:tenantId/bookings/create"],
    availableActions: ["VIEW", "CREATE", "SUBMIT_BOOKING"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "BOOKING_DETAIL",
    label: "Booking Detail",
    moduleCode: "BOOKING",
    description: "Booking detail workspace.",
    routePatterns: ["/tenant/:tenantId/bookings/:bookingId"],
    availableActions: ["VIEW", "VIEW_MARGIN", "EDIT", "ASSIGN_VENDOR", "ASSIGN_VEHICLE", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN", "START_LOADING", "COMPLETE_LOADING", "MARK_DELIVERED", "UPLOAD_POD", "MARK_COMPLETED"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "EDIT_BOOKING",
    label: "Edit Booking",
    moduleCode: "BOOKING",
    description: "Booking edit flow.",
    routePatterns: ["/tenant/:tenantId/bookings/:bookingId/edit"],
    availableActions: ["VIEW", "EDIT", "SUBMIT_BOOKING"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "RATE_APPROVAL",
    label: "Rate Approval",
    moduleCode: "BOOKING",
    description: "Rate approval queue.",
    routePatterns: ["/tenant/:tenantId/bookings/rate-approval"],
    availableActions: ["VIEW", "VIEW_MARGIN", "APPROVE", "APPROVE_RATE", "REJECT"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "ASSIGNMENT_QUEUE",
    label: "Assignment Queue",
    moduleCode: "BOOKING",
    description: "Assignment queue and dispatch setup.",
    routePatterns: ["/tenant/:tenantId/bookings/assignment"],
    availableActions: ["VIEW", "VIEW_MARGIN", "EDIT", "ASSIGN_VENDOR", "ASSIGN_VEHICLE", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "GENERATE_LR"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "LIVE_TRACKING",
    label: "Live Tracking",
    moduleCode: "BOOKING",
    description: "In-transit control tower board.",
    routePatterns: ["/tenant/:tenantId/bookings/live-tracking"],
    availableActions: ["VIEW", "EXPORT", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "COMPLETED_BOOKINGS",
    label: "Completed Bookings",
    moduleCode: "BOOKING",
    description: "Completed and POD-pending booking board.",
    routePatterns: ["/tenant/:tenantId/bookings/completed"],
    availableActions: ["VIEW", "UPLOAD_POD", "MARK_COMPLETED", "EXPORT"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "BOOKING_INVOICING",
    label: "Invoicing",
    moduleCode: "BOOKING",
    description: "Booking-side invoicing view.",
    routePatterns: ["/tenant/:tenantId/bookings/invoicing"],
    availableActions: ["VIEW", "VIEW_MARGIN", "GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE"],
    requiredPlatformModules: ["TMS", "FINANCE"],
  },
  {
    pageCode: "AUCTION_DASHBOARD",
    label: "Auction Dashboard",
    moduleCode: "AUCTION",
    description: "Auction workspace dashboard in the live auction module.",
    routePatterns: ["/auction/dashboard"],
    availableActions: ["VIEW"],
    requiredPlatformModules: ["AUCTION"],
  },
  {
    pageCode: "FLEET_DASHBOARD",
    label: "Fleet Dashboard",
    moduleCode: "FLEET_APP",
    description: "Fleet management dashboard in the live fleet module.",
    routePatterns: ["/fleet/dashboard"],
    availableActions: ["VIEW"],
    requiredPlatformModules: ["FLEET"],
  },
  {
    pageCode: "SHIPMENT_DOCUMENTS",
    label: "Shipment Documents",
    moduleCode: "BOOKING",
    description: "Shipment document capture page.",
    routePatterns: ["/tenant/:tenantId/bookings/:bookingId/documents"],
    availableActions: ["VIEW", "UPLOAD", "UPLOAD_DOCUMENTS", "DOWNLOAD"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "LR_VIEW",
    label: "LR View",
    moduleCode: "BOOKING",
    description: "Booking LR view/print page.",
    routePatterns: ["/tenant/:tenantId/bookings/:bookingId/lr"],
    availableActions: ["VIEW", "PRINT", "GENERATE_LR", "DOWNLOAD"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "FINANCE_WORKSPACE",
    label: "Finance Workspace",
    moduleCode: "FINANCE",
    description: "Finance workspace with invoice creation and review.",
    routePatterns: ["/tenant/:tenantId/finance", "/tenant/:tenantId/finance/:pageId"],
    availableActions: ["VIEW", "VIEW_MARGIN", "GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE", "MARK_PAID", "RAISE_DISPUTE"],
    requiredPlatformModules: ["FINANCE"],
  },
  {
    pageCode: "INVOICE_PENDING",
    label: "Invoice Pending",
    moduleCode: "FINANCE",
    description: "Pending invoice preparation queue.",
    routePatterns: [],
    availableActions: ["VIEW", "GENERATE_INVOICE", "EXPORT"],
    requiredPlatformModules: ["FINANCE"],
  },
  {
    pageCode: "GENERATED_INVOICES",
    label: "Generated Invoices",
    moduleCode: "FINANCE",
    description: "Generated invoice list and invoice status review.",
    routePatterns: [],
    availableActions: ["VIEW", "VIEW_INVOICE", "PRINT_INVOICE", "EXPORT", "DOWNLOAD"],
    requiredPlatformModules: ["FINANCE"],
  },
  {
    pageCode: "INVOICE_DOCUMENT",
    label: "Invoice Document",
    moduleCode: "FINANCE",
    description: "Invoice document preview page.",
    routePatterns: ["/tenant/:tenantId/finance/invoice/:invoiceId"],
    availableActions: ["VIEW", "VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"],
    requiredPlatformModules: ["FINANCE"],
  },
  {
    pageCode: "LR_DASHBOARD",
    label: "LR Dashboard",
    moduleCode: "LR",
    description: "LR workspace and register dashboard.",
    routePatterns: ["/tenant/:tenantId/lr"],
    availableActions: ["VIEW", "CREATE_LR", "UPLOAD_LR", "ALLOCATE_LR", "REQUEST_LR", "APPROVE_LR", "TRANSFER_LR", "VOID_LR", "VIEW_AUDIT"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "LR_NUMBER_LIST",
    label: "LR Number List",
    moduleCode: "LR",
    description: "List of LR numbers and availability.",
    routePatterns: [],
    availableActions: ["VIEW", "DOWNLOAD", "EXPORT"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "CREATE_UPLOAD_LR",
    label: "Create / Upload LR",
    moduleCode: "LR",
    description: "Create and upload LR records.",
    routePatterns: [],
    availableActions: ["VIEW", "CREATE_LR", "UPLOAD_LR", "DOWNLOAD"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "LR_ALLOCATION",
    label: "Allocation",
    moduleCode: "LR",
    description: "LR allocation management.",
    routePatterns: [],
    availableActions: ["VIEW", "ALLOCATE_LR", "APPROVE_LR"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "LR_REQUESTS",
    label: "Requests",
    moduleCode: "LR",
    description: "LR request management.",
    routePatterns: [],
    availableActions: ["VIEW", "REQUEST_LR", "APPROVE_LR"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "LR_APPROVALS",
    label: "Approvals",
    moduleCode: "LR",
    description: "LR approval queue.",
    routePatterns: [],
    availableActions: ["VIEW", "APPROVE_LR", "REJECT"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "LR_TRANSFER",
    label: "Transfer",
    moduleCode: "LR",
    description: "LR transfer workflow.",
    routePatterns: [],
    availableActions: ["VIEW", "TRANSFER_LR", "APPROVE_LR"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "LR_CONSUMPTION",
    label: "Consumption / Booking Usage",
    moduleCode: "LR",
    description: "Manual LR consumption and booking usage visibility.",
    routePatterns: [],
    availableActions: ["VIEW", "GENERATE_LR"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "LR_VOID",
    label: "Void / Damaged / Lost",
    moduleCode: "LR",
    description: "Void, lost, and damaged LR control.",
    routePatterns: [],
    availableActions: ["VIEW", "VOID_LR"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "LR_AUDIT",
    label: "Audit Trail",
    moduleCode: "LR",
    description: "LR audit and void tracking.",
    routePatterns: [],
    availableActions: ["VIEW", "VOID_LR", "VIEW_AUDIT", "EXPORT"],
    requiredPlatformModules: ["TMS"],
  },
  {
    pageCode: "DRIVER_DASHBOARD",
    label: "Driver Dashboard",
    moduleCode: "DRIVER_APP",
    description: "Driver app dashboard.",
    routePatterns: ["/tenant/:tenantId/driver-app/dashboard"],
    availableActions: ["VIEW"],
    requiredPlatformModules: ["FLEET", "TMS"],
  },
  {
    pageCode: "DRIVER_LOGIN",
    label: "Driver Login",
    moduleCode: "DRIVER_APP",
    description: "Driver login entry page.",
    routePatterns: ["/tenant/:tenantId/driver-app/login"],
    availableActions: ["VIEW"],
    requiredPlatformModules: ["FLEET", "TMS"],
  },
  {
    pageCode: "MY_TRIPS",
    label: "My Trips",
    moduleCode: "DRIVER_APP",
    description: "Driver trips list.",
    routePatterns: ["/tenant/:tenantId/driver-app/trips"],
    availableActions: ["VIEW"],
    requiredPlatformModules: ["FLEET", "TMS"],
  },
  {
    pageCode: "TRIP_DETAIL",
    label: "Trip Detail",
    moduleCode: "DRIVER_APP",
    description: "Driver trip detail page.",
    routePatterns: ["/tenant/:tenantId/driver-app/trips/:bookingId"],
    availableActions: ["VIEW", "MARK_DELIVERED", "UPLOAD_POD", "UPLOAD_DOCUMENTS"],
    requiredPlatformModules: ["FLEET", "TMS"],
  },
  {
    pageCode: "INCIDENT_CENTER",
    label: "Incident Center",
    moduleCode: "DRIVER_APP",
    description: "Driver incident center.",
    routePatterns: ["/tenant/:tenantId/driver-app/incidents"],
    availableActions: ["VIEW", "CREATE", "UPLOAD"],
    requiredPlatformModules: ["FLEET", "TMS"],
  },
  {
    pageCode: "DRIVER_PROFILE",
    label: "Profile",
    moduleCode: "DRIVER_APP",
    description: "Driver profile page.",
    routePatterns: ["/tenant/:tenantId/driver-app/profile"],
    availableActions: ["VIEW", "EDIT"],
    requiredPlatformModules: ["FLEET", "TMS"],
  },
  {
    pageCode: "VENDOR_DASHBOARD",
    label: "Vendor Dashboard",
    moduleCode: "VENDOR_APP",
    description: "Vendor portal dashboard in the live vendor module.",
    routePatterns: ["/vendor"],
    availableActions: ["VIEW"],
    requiredPlatformModules: ["VENDOR"],
  },
  {
    pageCode: "ASSIGNED_TRIPS",
    label: "Assigned Trips",
    moduleCode: "VENDOR_APP",
    description: "Vendor assigned trips list for future integration.",
    routePatterns: [],
    availableActions: ["VIEW", "DOWNLOAD"],
    requiredPlatformModules: ["PROCUREMENT", "TMS"],
  },
  {
    pageCode: "TRIP_ACCEPTANCE",
    label: "Trip Acceptance",
    moduleCode: "VENDOR_APP",
    description: "Vendor trip acceptance actions for future integration.",
    routePatterns: [],
    availableActions: ["VIEW", "APPROVE", "REJECT"],
    requiredPlatformModules: ["PROCUREMENT", "TMS"],
  },
  {
    pageCode: "VENDOR_POD_DOCUMENTS",
    label: "POD / Documents",
    moduleCode: "VENDOR_APP",
    description: "Vendor POD and document upload view for future integration.",
    routePatterns: [],
    availableActions: ["VIEW", "UPLOAD", "UPLOAD_POD", "UPLOAD_DOCUMENTS", "DOWNLOAD"],
    requiredPlatformModules: ["PROCUREMENT", "TMS"],
  },
  {
    pageCode: "VENDOR_INVOICE_PAYABLE",
    label: "Invoice / Payable Visibility",
    moduleCode: "VENDOR_APP",
    description: "Vendor invoice and payable visibility for future integration.",
    routePatterns: [],
    availableActions: ["VIEW", "DOWNLOAD"],
    requiredPlatformModules: ["PROCUREMENT", "FINANCE"],
  },
  {
    pageCode: "CUSTOMER_DASHBOARD",
    label: "Customer Dashboard",
    moduleCode: "CUSTOMER_PORTAL",
    description: "Customer dashboard in the live customer module.",
    routePatterns: ["/customer"],
    availableActions: ["VIEW"],
    requiredPlatformModules: ["CUSTOMER"],
    requiresCustomerPortal: true,
  },
  {
    pageCode: "TRACKING_DASHBOARD",
    label: "Track and Trace Dashboard",
    moduleCode: "TRACK_TRACE",
    description: "Track and trace dashboard in the live tracking module.",
    routePatterns: ["/tracking"],
    availableActions: ["VIEW"],
    requiredPlatformModules: ["TRACKING"],
  },
  {
    pageCode: "MY_BOOKINGS",
    label: "My Bookings",
    moduleCode: "CUSTOMER_PORTAL",
    description: "Customer portal booking list for future integration.",
    routePatterns: [],
    availableActions: ["VIEW", "DOWNLOAD"],
    requiresCustomerPortal: true,
  },
  {
    pageCode: "CREATE_BOOKING_REQUEST",
    label: "Create Booking Request",
    moduleCode: "CUSTOMER_PORTAL",
    description: "Customer portal booking request entry for future integration.",
    routePatterns: [],
    availableActions: ["VIEW", "CREATE", "SUBMIT_BOOKING"],
    requiresCustomerPortal: true,
  },
  {
    pageCode: "CUSTOMER_TRACKING",
    label: "Tracking",
    moduleCode: "CUSTOMER_PORTAL",
    description: "Customer portal tracking for future integration.",
    routePatterns: [],
    availableActions: ["VIEW"],
    requiresCustomerPortal: true,
  },
  {
    pageCode: "CUSTOMER_DOCUMENTS",
    label: "LR/POD/Documents",
    moduleCode: "CUSTOMER_PORTAL",
    description: "Customer portal document visibility for future integration.",
    routePatterns: [],
    availableActions: ["VIEW", "DOWNLOAD", "PRINT"],
    requiresCustomerPortal: true,
  },
  {
    pageCode: "CUSTOMER_INVOICES",
    label: "Invoices",
    moduleCode: "CUSTOMER_PORTAL",
    description: "Customer portal invoice visibility for future integration.",
    routePatterns: [],
    availableActions: ["VIEW", "VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"],
    requiresCustomerPortal: true,
  },
];

export function getRolePageActionLabel(action: RolePageAction) {
  return action
    .toLowerCase()
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function getTenantPageCatalog(tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled">) {
  return allPageDefinitions.filter((page) => {
    if (page.allowedTenantTypes && !page.allowedTenantTypes.includes(tenant.tenantType)) {
      return false;
    }
    if (page.requiresCustomerPortal && !tenant.customerPortalEnabled) {
      return false;
    }
    return true;
  });
}

export function groupTenantPagesByModule(tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled">) {
  return Array.from(
    getTenantPageCatalog(tenant).reduce((map, page) => {
      const current = map.get(page.moduleCode) ?? [];
      current.push(page);
      map.set(page.moduleCode, current);
      return map;
    }, new Map<TenantPageModuleCode, TenantPageDefinition[]>()),
  );
}

export function findTenantPageByCode(
  tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled">,
  pageCode: string,
) {
  return getTenantPageCatalog(tenant).find((page) => page.pageCode === pageCode) ?? null;
}

export function matchTenantPageForPath(
  tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled">,
  pathname: string,
) {
  return (
    getTenantPageCatalog(tenant).find((page) =>
      page.routePatterns.some((pattern) => routePatternToRegex(pattern).test(pathname)),
    ) ?? null
  );
}

export function getRoleAccessModules(
  role: RoleDefinition | null,
  tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled">,
  rolePermissions: RolePermission[],
) {
  if (!role) {
    return [] as RoleAccessModule[];
  }

  if (role.roleAccess?.length) {
    return normalizeRoleAccess(role.roleAccess, tenant);
  }

  return buildDefaultRoleAccess(role, tenant, rolePermissions);
}

export function getRolePageAccessRecord(
  roleAccess: RoleAccessModule[],
  pageCode: string,
) {
  for (const moduleAccess of roleAccess) {
    const page = moduleAccess.pages.find((item) => item.pageCode === pageCode);
    if (page) {
      return page;
    }
  }
  return null;
}

export function canRoleViewPage(roleAccess: RoleAccessModule[], pageCode: string) {
  return getRolePageAccessRecord(roleAccess, pageCode)?.canView ?? false;
}

export function getRolePageActions(roleAccess: RoleAccessModule[], pageCode: string) {
  return getRolePageAccessRecord(roleAccess, pageCode)?.actions ?? [];
}

function normalizeRoleAccess(
  roleAccess: RoleAccessModule[],
  tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled">,
) {
  const allowedPages = new Map(getTenantPageCatalog(tenant).map((page) => [page.pageCode, page]));
  return roleAccess
    .map((moduleAccess) => ({
      moduleCode: moduleAccess.moduleCode,
      pages: moduleAccess.pages
        .filter((page) => allowedPages.has(page.pageCode))
        .map((page) => {
          const definition = allowedPages.get(page.pageCode)!;
          return {
            pageCode: page.pageCode,
            canView: Boolean(page.canView),
            actions: Array.from(new Set(page.actions)).filter((action) =>
              definition.availableActions.includes(action),
            ),
          };
        }),
    }))
    .filter((moduleAccess) => moduleAccess.pages.length > 0);
}

export function buildDefaultRoleAccess(
  role: RoleDefinition,
  tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled">,
  rolePermissions: RolePermission[],
) {
  const legacyPermissions = rolePermissions.filter((permission) => permission.roleId === role.id);
  const aggregateByModule = legacyPermissions.reduce(
    (map, permission) => {
      const current = map.get(permission.moduleCode) ?? {
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
      };
      current.view = current.view || permission.canView;
      current.create = current.create || permission.canCreate;
      current.edit = current.edit || permission.canEdit;
      current.delete = current.delete || permission.canDelete;
      current.approve = current.approve || permission.canApprove;
      map.set(permission.moduleCode, current);
      return map;
    },
    new Map<string, Record<GenericActionKey, boolean>>(),
  );
  const hasModule = (moduleCode: string) => role.moduleCodes.includes(moduleCode);
  const roleName = role.name.toLowerCase();
  // Name-based heuristics used to grant admin / ops / finance pages by
  // *regex on the role name alone* — e.g. "Operational-branch-manager"
  // matched /manager/ and silently received every admin page (Customers,
  // Vendors, Vehicles, etc.) even when the explicit permission matrix
  // didn't grant them. Heuristics now require the role to ALSO have the
  // matching governance module enabled. The persisted permission matrix
  // remains the authoritative source — these defaults only fire when no
  // matrix entry exists for a cell.
  const isAdminLike = /(admin|ceo|head|owner|super)/.test(roleName) && hasModule("ADMIN");
  const isOpsLike =
    /(dispatch|operator|planner|ops|booking|control)/.test(roleName)
    && (hasModule("TMS") || hasModule("ADMIN"));
  const isFinanceLike = /(finance|accounts?)/.test(roleName) && hasModule("FINANCE");
  const isDriverLike = /driver/.test(roleName);
  const isVendorLike = /vendor/.test(roleName);
  const isCustomerLike = /customer/.test(roleName);

  const pageEntries = getTenantPageCatalog(tenant).map((page) => {
    const canView = inferDefaultPageVisibility(page, {
      hasModule,
      isAdminLike,
      isOpsLike,
      isFinanceLike,
      isDriverLike,
      isVendorLike,
      isCustomerLike,
    });
    const aggregate =
      page.requiredPlatformModules
        ?.map((moduleCode) => aggregateByModule.get(moduleCode))
        .find(Boolean) ??
      (isAdminLike
        ? {
            view: true,
            create: true,
            edit: true,
            delete: true,
            approve: true,
          }
        : {
            view: canView,
            create: canView,
            edit: canView,
            delete: false,
            approve: false,
          });
    const actions = page.availableActions.filter((action) => {
      const prerequisite = pageActionPrerequisites[action];
      if (!prerequisite) {
        return canView;
      }
      return aggregate[prerequisite];
    });
    return {
      ...page,
      canView,
      actions,
    };
  });

  return Array.from(
    pageEntries.reduce((map, page) => {
      const current = map.get(page.moduleCode) ?? [];
      current.push({
        pageCode: page.pageCode,
        canView: page.canView,
        actions: page.canView ? page.actions : [],
      });
      map.set(page.moduleCode, current);
      return map;
    }, new Map<TenantPageModuleCode, RoleAccessPage[]>()),
  ).map(([moduleCode, pages]) => ({ moduleCode, pages }));
}

function inferDefaultPageVisibility(
  page: TenantPageDefinition,
  context: {
    hasModule: (moduleCode: string) => boolean;
    isAdminLike: boolean;
    isOpsLike: boolean;
    isFinanceLike: boolean;
    isDriverLike: boolean;
    isVendorLike: boolean;
    isCustomerLike: boolean;
  },
) {
  const {
    hasModule,
    isAdminLike,
    isOpsLike,
    isFinanceLike,
    isDriverLike,
    isVendorLike,
    isCustomerLike,
  } = context;

  if (page.pageCode === "TENANT_DASHBOARD") {
    return true;
  }

  if (page.moduleCode === "FINANCE") {
    return isFinanceLike || hasModule("FINANCE");
  }

  if (page.moduleCode === "AUCTION") {
    return hasModule("AUCTION") || hasModule("PROCUREMENT");
  }

  if (page.moduleCode === "FLEET_APP") {
    return hasModule("FLEET");
  }

  if (page.moduleCode === "BOOKING") {
    if (page.pageCode === "BOOKING_INVOICING" && isFinanceLike) {
      return true;
    }
    return hasModule("TMS") && !isDriverLike && !isVendorLike && !isCustomerLike;
  }

  if (page.moduleCode === "LR") {
    return (hasModule("TMS") || isOpsLike || isAdminLike) && !isDriverLike && !isCustomerLike;
  }

  if (page.moduleCode === "DRIVER_APP") {
    return isDriverLike || (hasModule("FLEET") && (isOpsLike || isAdminLike));
  }

  if (page.moduleCode === "VENDOR_APP") {
    return isVendorLike || hasModule("VENDOR") || hasModule("PROCUREMENT");
  }

  if (page.moduleCode === "CUSTOMER_PORTAL") {
    return isCustomerLike || hasModule("CUSTOMER");
  }

  if (page.moduleCode === "TRACK_TRACE") {
    return hasModule("TRACKING");
  }

  if (page.pageCode === "USERS" || page.pageCode === "ROLES" || page.pageCode === "ROLE_PERMISSIONS") {
    return isAdminLike;
  }

  if (page.pageCode === "SETTINGS" || page.pageCode === "TENANT_MODULES") {
    return isAdminLike;
  }

  if (page.pageCode === "CUSTOMERS" || page.pageCode === "MATERIALS" || page.pageCode === "UOM_CONFIG" || page.pageCode === "LR_CONFIG") {
    return hasModule("TMS") || isAdminLike || isOpsLike;
  }

  if (page.pageCode === "VENDORS") {
    return hasModule("PROCUREMENT") || hasModule("TMS") || isAdminLike || isOpsLike;
  }

  if (page.pageCode === "VEHICLE_TYPES" || page.pageCode === "VEHICLES" || page.pageCode === "DRIVERS") {
    return hasModule("FLEET") || hasModule("TMS") || isAdminLike || isOpsLike;
  }

  if (page.pageCode === "HIERARCHY" || page.pageCode === "ORG_UNITS" || page.pageCode === "AUDIT_LOGS") {
    return isAdminLike || isOpsLike;
  }

  return isAdminLike;
}

function routePatternToRegex(pattern: string) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/:([A-Za-z0-9_]+)/g, "[^/]+")}$`);
}
