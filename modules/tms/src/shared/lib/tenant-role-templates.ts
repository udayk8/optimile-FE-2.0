import type { RoleAccessModule, RoleDefinition, RolePageAction } from "@/types/access";
import type { TenantRecord } from "@/types/platform";
import { findTenantPageByCode } from "@/shared/lib/tenant-page-access";

type TemplateSpec = {
  moduleCodes: string[];
  dataScope: RoleDefinition["dataScope"];
  roleAccess: Array<{
    moduleCode: string;
    pages: Array<{
      pageCode: string;
      actions?: RolePageAction[];
    }>;
  }>;
  previewPageCode: string;
};

function normalizeRoleName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildRoleAccess(
  tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled">,
  spec: TemplateSpec["roleAccess"],
): RoleAccessModule[] {
  return spec
    .map((module) => ({
      moduleCode: module.moduleCode,
      pages: module.pages
        .filter((page) => findTenantPageByCode(tenant, page.pageCode))
        .map((page) => ({
          pageCode: page.pageCode,
          canView: true,
          actions: Array.from(new Set<RolePageAction>(["VIEW", ...(page.actions ?? [])])),
        })),
    }))
    .filter((module) => module.pages.length > 0);
}

function getTemplateSpec(roleName: string): TemplateSpec | null {
  const name = normalizeRoleName(roleName);
  switch (name) {
    case "tenant admin":
    case "tenant admin / ceo":
      return {
        moduleCodes: ["TMS", "FINANCE", "FLEET", "PROCUREMENT"],
        dataScope: "ALL_TENANT",
        previewPageCode: "TENANT_DASHBOARD",
        roleAccess: [
          {
            moduleCode: "ADMINISTRATION",
            pages: [
              { pageCode: "TENANT_DASHBOARD" },
              { pageCode: "HIERARCHY", actions: ["CREATE", "EDIT", "DELETE"] },
              { pageCode: "ORG_UNITS", actions: ["CREATE", "EDIT", "DELETE"] },
              { pageCode: "USERS", actions: ["CREATE", "EDIT", "DELETE", "APPROVE"] },
              { pageCode: "ROLES", actions: ["CREATE", "EDIT", "DELETE", "APPROVE"] },
              { pageCode: "ROLE_PERMISSIONS", actions: ["EDIT", "APPROVE"] },
              { pageCode: "CUSTOMERS", actions: ["CREATE", "EDIT", "DELETE", "UPLOAD", "DOWNLOAD", "EXPORT"] },
              { pageCode: "VENDORS", actions: ["CREATE", "EDIT", "DELETE", "UPLOAD", "DOWNLOAD", "EXPORT"] },
              { pageCode: "VEHICLE_TYPES", actions: ["CREATE", "EDIT", "DELETE"] },
              { pageCode: "VEHICLES", actions: ["CREATE", "EDIT", "DELETE"] },
              { pageCode: "DRIVERS", actions: ["CREATE", "EDIT", "DELETE"] },
              { pageCode: "MATERIALS", actions: ["CREATE", "EDIT", "DELETE"] },
              { pageCode: "UOM_CONFIG", actions: ["CREATE", "EDIT", "DELETE"] },
              { pageCode: "LR_CONFIG", actions: ["CREATE", "EDIT", "DELETE", "APPROVE"] },
              { pageCode: "TENANT_MODULES" },
              { pageCode: "AUDIT_LOGS", actions: ["EXPORT", "DOWNLOAD"] },
              { pageCode: "SETTINGS", actions: ["EDIT"] },
            ],
          },
          {
            moduleCode: "BOOKING",
            pages: [
              { pageCode: "BOOKING_LIST", actions: ["EXPORT", "DOWNLOAD"] },
              { pageCode: "BOOKING_DETAIL", actions: ["VIEW_MARGIN"] },
              { pageCode: "RATE_APPROVAL", actions: ["VIEW_MARGIN", "APPROVE_RATE", "APPROVE", "REJECT"] },
              { pageCode: "ASSIGNMENT_QUEUE", actions: ["VIEW_MARGIN"] },
              { pageCode: "LIVE_TRACKING", actions: ["EXPORT"] },
              { pageCode: "COMPLETED_BOOKINGS", actions: ["UPLOAD_POD", "MARK_COMPLETED", "EXPORT"] },
              { pageCode: "BOOKING_INVOICING", actions: ["VIEW_MARGIN", "GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE"] },
              { pageCode: "SHIPMENT_DOCUMENTS", actions: ["UPLOAD", "UPLOAD_DOCUMENTS", "DOWNLOAD"] },
              { pageCode: "LR_VIEW", actions: ["GENERATE_LR", "PRINT", "DOWNLOAD"] },
            ],
          },
          {
            moduleCode: "LR",
            pages: [
              { pageCode: "LR_DASHBOARD" },
              { pageCode: "LR_NUMBER_LIST", actions: ["DOWNLOAD", "EXPORT"] },
              { pageCode: "CREATE_UPLOAD_LR", actions: ["CREATE_LR", "UPLOAD_LR", "DOWNLOAD"] },
              { pageCode: "LR_ALLOCATION", actions: ["ALLOCATE_LR", "APPROVE_LR"] },
              { pageCode: "LR_REQUESTS", actions: ["REQUEST_LR", "APPROVE_LR"] },
              { pageCode: "LR_APPROVALS", actions: ["APPROVE_LR", "REJECT"] },
              { pageCode: "LR_TRANSFER", actions: ["TRANSFER_LR", "APPROVE_LR"] },
              { pageCode: "LR_CONSUMPTION", actions: ["GENERATE_LR"] },
              { pageCode: "LR_VOID", actions: ["VOID_LR"] },
              { pageCode: "LR_AUDIT", actions: ["VOID_LR", "VIEW_AUDIT", "EXPORT"] },
            ],
          },
          {
            moduleCode: "FINANCE",
            pages: [
              { pageCode: "FINANCE_WORKSPACE", actions: ["VIEW_MARGIN", "GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE", "MARK_PAID", "RAISE_DISPUTE"] },
              { pageCode: "INVOICE_PENDING", actions: ["GENERATE_INVOICE", "EXPORT"] },
              { pageCode: "GENERATED_INVOICES", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "EXPORT", "DOWNLOAD"] },
              { pageCode: "INVOICE_DOCUMENT", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"] },
            ],
          },
        ],
      };
    case "system coordinator":
      return {
        moduleCodes: ["TMS", "FINANCE", "FLEET", "PROCUREMENT"],
        dataScope: "ALL_TENANT",
        previewPageCode: "TENANT_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }, { pageCode: "USERS" }, { pageCode: "ROLES" }, { pageCode: "CUSTOMERS", actions: ["EXPORT"] }, { pageCode: "VENDORS", actions: ["EXPORT"] }, { pageCode: "VEHICLES" }, { pageCode: "DRIVERS" }, { pageCode: "AUDIT_LOGS", actions: ["EXPORT"] }] },
          { moduleCode: "BOOKING", pages: [{ pageCode: "BOOKING_LIST", actions: ["EXPORT"] }, { pageCode: "BOOKING_DETAIL" }, { pageCode: "ASSIGNMENT_QUEUE" }, { pageCode: "LIVE_TRACKING", actions: ["EXPORT"] }, { pageCode: "COMPLETED_BOOKINGS" }, { pageCode: "SHIPMENT_DOCUMENTS" }] },
          { moduleCode: "FINANCE", pages: [{ pageCode: "FINANCE_WORKSPACE", actions: ["VIEW_INVOICE", "PRINT_INVOICE"] }, { pageCode: "GENERATED_INVOICES", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "EXPORT"] }, { pageCode: "INVOICE_DOCUMENT", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"] }] },
          { moduleCode: "LR", pages: [{ pageCode: "LR_DASHBOARD" }, { pageCode: "LR_AUDIT", actions: ["VIEW_AUDIT"] }] },
        ],
      };
    case "ceo / executive":
      return {
        moduleCodes: ["TMS", "FINANCE"],
        dataScope: "ALL_TENANT",
        previewPageCode: "TENANT_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }] },
          { moduleCode: "BOOKING", pages: [{ pageCode: "BOOKING_LIST", actions: ["EXPORT"] }, { pageCode: "LIVE_TRACKING", actions: ["EXPORT"] }, { pageCode: "COMPLETED_BOOKINGS" }, { pageCode: "RATE_APPROVAL", actions: ["VIEW_MARGIN", "APPROVE_RATE", "APPROVE", "REJECT"] }] },
          { moduleCode: "FINANCE", pages: [{ pageCode: "FINANCE_WORKSPACE", actions: ["VIEW_MARGIN", "VIEW_INVOICE", "PRINT_INVOICE", "EXPORT"] }, { pageCode: "GENERATED_INVOICES", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "EXPORT"] }, { pageCode: "INVOICE_DOCUMENT", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"] }] },
          { moduleCode: "LR", pages: [{ pageCode: "LR_DASHBOARD" }, { pageCode: "LR_AUDIT", actions: ["VIEW_AUDIT", "EXPORT"] }] },
        ],
      };
    case "operations head / coo":
      return {
        moduleCodes: ["TMS", "FINANCE", "FLEET", "PROCUREMENT"],
        dataScope: "ALL_TENANT",
        previewPageCode: "TENANT_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }, { pageCode: "CUSTOMERS" }, { pageCode: "VENDORS" }, { pageCode: "VEHICLES" }, { pageCode: "DRIVERS" }, { pageCode: "AUDIT_LOGS", actions: ["EXPORT"] }] },
          { moduleCode: "BOOKING", pages: [{ pageCode: "BOOKING_LIST", actions: ["EXPORT"] }, { pageCode: "BOOKING_DETAIL", actions: ["VIEW_MARGIN"] }, { pageCode: "RATE_APPROVAL", actions: ["VIEW_MARGIN", "APPROVE_RATE", "APPROVE", "REJECT"] }, { pageCode: "ASSIGNMENT_QUEUE", actions: ["VIEW_MARGIN"] }, { pageCode: "LIVE_TRACKING", actions: ["EXPORT"] }, { pageCode: "SHIPMENT_DOCUMENTS" }, { pageCode: "COMPLETED_BOOKINGS" }, { pageCode: "BOOKING_INVOICING", actions: ["VIEW_MARGIN", "VIEW_INVOICE", "PRINT_INVOICE"] }] },
          { moduleCode: "LR", pages: [{ pageCode: "LR_DASHBOARD" }, { pageCode: "LR_REQUESTS" }, { pageCode: "LR_APPROVALS", actions: ["APPROVE_LR", "REJECT"] }, { pageCode: "LR_AUDIT", actions: ["VIEW_AUDIT", "EXPORT"] }, { pageCode: "LR_VOID", actions: ["VOID_LR"] }] },
          { moduleCode: "FINANCE", pages: [{ pageCode: "FINANCE_WORKSPACE", actions: ["VIEW_MARGIN", "VIEW_INVOICE", "PRINT_INVOICE"] }, { pageCode: "GENERATED_INVOICES", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "EXPORT"] }, { pageCode: "INVOICE_DOCUMENT", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"] }] },
          { moduleCode: "PROCUREMENT", pages: [{ pageCode: "VENDORS" }] },
        ],
      };
    case "regional manager":
      return {
        moduleCodes: ["TMS", "FINANCE", "FLEET"],
        dataScope: "REGION",
        previewPageCode: "TENANT_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }, { pageCode: "LR_CONFIG", actions: ["VIEW", "EDIT", "APPROVE"] }] },
          { moduleCode: "BOOKING", pages: [{ pageCode: "BOOKING_LIST", actions: ["EXPORT"] }, { pageCode: "BOOKING_DETAIL", actions: ["VIEW_MARGIN", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN"] }, { pageCode: "ASSIGNMENT_QUEUE", actions: ["CHANGE_ASSIGNMENT", "REPLACE_VEHICLE"] }, { pageCode: "LIVE_TRACKING", actions: ["EXPORT", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN"] }, { pageCode: "RATE_APPROVAL", actions: ["VIEW_MARGIN", "APPROVE_RATE", "APPROVE", "REJECT"] }, { pageCode: "COMPLETED_BOOKINGS" }] },
          { moduleCode: "LR", pages: [{ pageCode: "LR_DASHBOARD" }, { pageCode: "LR_NUMBER_LIST" }, { pageCode: "LR_REQUESTS" }, { pageCode: "LR_APPROVALS", actions: ["APPROVE_LR", "REJECT"] }, { pageCode: "LR_ALLOCATION", actions: ["ALLOCATE_LR"] }, { pageCode: "LR_AUDIT", actions: ["VIEW_AUDIT", "EXPORT"] }] },
          { moduleCode: "FINANCE", pages: [{ pageCode: "FINANCE_WORKSPACE", actions: ["VIEW_MARGIN", "VIEW_INVOICE", "PRINT_INVOICE"] }] },
        ],
      };
    case "operations manager":
      return {
        moduleCodes: ["TMS", "FLEET", "FINANCE", "PROCUREMENT"],
        dataScope: "REGION",
        previewPageCode: "TENANT_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }, { pageCode: "CUSTOMERS" }, { pageCode: "VENDORS" }, { pageCode: "VEHICLES" }, { pageCode: "DRIVERS" }] },
          { moduleCode: "BOOKING", pages: [{ pageCode: "CREATE_BOOKING", actions: ["CREATE", "SUBMIT_BOOKING"] }, { pageCode: "EDIT_BOOKING", actions: ["EDIT", "SUBMIT_BOOKING"] }, { pageCode: "BOOKING_LIST", actions: ["EXPORT", "DOWNLOAD"] }, { pageCode: "BOOKING_DETAIL", actions: ["VIEW_MARGIN", "EDIT", "ASSIGN_VENDOR", "ASSIGN_VEHICLE", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN", "START_LOADING", "COMPLETE_LOADING", "UPLOAD_DOCUMENTS", "MARK_DELIVERED", "UPLOAD_POD", "MARK_COMPLETED"] }, { pageCode: "ASSIGNMENT_QUEUE", actions: ["VIEW_MARGIN", "ASSIGN_VENDOR", "ASSIGN_VEHICLE", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "GENERATE_LR"] }, { pageCode: "SHIPMENT_DOCUMENTS", actions: ["UPLOAD", "UPLOAD_DOCUMENTS", "DOWNLOAD"] }, { pageCode: "LIVE_TRACKING", actions: ["EXPORT", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN"] }, { pageCode: "COMPLETED_BOOKINGS", actions: ["UPLOAD_POD", "MARK_COMPLETED", "EXPORT"] }, { pageCode: "LR_VIEW", actions: ["GENERATE_LR", "PRINT", "DOWNLOAD"] }, { pageCode: "BOOKING_INVOICING", actions: ["GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE"] }] },
          { moduleCode: "LR", pages: [{ pageCode: "LR_DASHBOARD" }, { pageCode: "LR_NUMBER_LIST", actions: ["DOWNLOAD", "EXPORT"] }, { pageCode: "LR_REQUESTS", actions: ["REQUEST_LR"] }, { pageCode: "LR_CONSUMPTION", actions: ["GENERATE_LR"] }, { pageCode: "LR_AUDIT", actions: ["VIEW_AUDIT"] }] },
          { moduleCode: "FINANCE", pages: [{ pageCode: "FINANCE_WORKSPACE", actions: ["GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE"] }, { pageCode: "INVOICE_PENDING", actions: ["GENERATE_INVOICE"] }, { pageCode: "GENERATED_INVOICES", actions: ["VIEW_INVOICE", "PRINT_INVOICE"] }, { pageCode: "INVOICE_DOCUMENT", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"] }] },
          { moduleCode: "PROCUREMENT", pages: [{ pageCode: "VENDORS" }] },
        ],
      };
    case "dispatch supervisor":
      return {
        moduleCodes: ["TMS", "FLEET"],
        dataScope: "BRANCH",
        previewPageCode: "TENANT_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }] },
          { moduleCode: "BOOKING", pages: [{ pageCode: "BOOKING_LIST" }, { pageCode: "BOOKING_DETAIL", actions: ["ASSIGN_VEHICLE", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN", "START_LOADING", "COMPLETE_LOADING", "UPLOAD_DOCUMENTS", "MARK_DELIVERED"] }, { pageCode: "RATE_APPROVAL", actions: ["APPROVE_RATE"] }, { pageCode: "ASSIGNMENT_QUEUE", actions: ["ASSIGN_VEHICLE", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "GENERATE_LR"] }, { pageCode: "LIVE_TRACKING", actions: ["CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN"] }, { pageCode: "SHIPMENT_DOCUMENTS", actions: ["UPLOAD_DOCUMENTS"] }, { pageCode: "LR_VIEW", actions: ["GENERATE_LR", "PRINT"] }] },
          { moduleCode: "LR", pages: [{ pageCode: "LR_DASHBOARD" }, { pageCode: "LR_NUMBER_LIST" }, { pageCode: "LR_REQUESTS", actions: ["REQUEST_LR"] }, { pageCode: "LR_CONSUMPTION", actions: ["GENERATE_LR"] }] },
          { moduleCode: "DRIVER_APP", pages: [{ pageCode: "DRIVER_DASHBOARD" }, { pageCode: "MY_TRIPS" }, { pageCode: "TRIP_DETAIL" }] },
        ],
      };
    case "ground supervisor":
      return {
        moduleCodes: ["TMS"],
        dataScope: "OWN_RECORDS",
        previewPageCode: "TENANT_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }] },
          { moduleCode: "BOOKING", pages: [{ pageCode: "BOOKING_DETAIL", actions: ["UPLOAD_DOCUMENTS", "UPLOAD_POD", "MARK_DELIVERED"] }, { pageCode: "SHIPMENT_DOCUMENTS", actions: ["UPLOAD", "UPLOAD_DOCUMENTS"] }, { pageCode: "LIVE_TRACKING" }, { pageCode: "COMPLETED_BOOKINGS", actions: ["UPLOAD_POD"] }] },
        ],
      };
    case "finance manager":
      return {
        moduleCodes: ["FINANCE", "TMS"],
        dataScope: "ALL_TENANT",
        previewPageCode: "TENANT_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }] },
          { moduleCode: "BOOKING", pages: [{ pageCode: "COMPLETED_BOOKINGS" }, { pageCode: "BOOKING_DETAIL", actions: ["VIEW_MARGIN"] }, { pageCode: "BOOKING_INVOICING", actions: ["VIEW_MARGIN", "GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE"] }] },
          { moduleCode: "FINANCE", pages: [{ pageCode: "FINANCE_WORKSPACE", actions: ["VIEW_MARGIN", "GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE", "MARK_PAID", "RAISE_DISPUTE"] }, { pageCode: "INVOICE_PENDING", actions: ["GENERATE_INVOICE", "EXPORT"] }, { pageCode: "GENERATED_INVOICES", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "EXPORT", "DOWNLOAD"] }, { pageCode: "INVOICE_DOCUMENT", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"] }] },
          { moduleCode: "LR", pages: [{ pageCode: "LR_DASHBOARD" }, { pageCode: "LR_AUDIT", actions: ["VIEW_AUDIT", "EXPORT"] }] },
        ],
      };
    case "senior accountant":
      return {
        moduleCodes: ["FINANCE", "TMS"],
        dataScope: "ALL_TENANT",
        previewPageCode: "TENANT_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }] },
          { moduleCode: "BOOKING", pages: [{ pageCode: "BOOKING_INVOICING", actions: ["GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE"] }] },
          { moduleCode: "FINANCE", pages: [{ pageCode: "FINANCE_WORKSPACE", actions: ["GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE", "MARK_PAID"] }, { pageCode: "INVOICE_PENDING", actions: ["GENERATE_INVOICE"] }, { pageCode: "GENERATED_INVOICES", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "MARK_PAID"] }, { pageCode: "INVOICE_DOCUMENT", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"] }] },
        ],
      };
    case "finance executive / accountant":
      return {
        moduleCodes: ["FINANCE"],
        dataScope: "ALL_TENANT",
        previewPageCode: "FINANCE_WORKSPACE",
        roleAccess: [
          { moduleCode: "FINANCE", pages: [{ pageCode: "FINANCE_WORKSPACE", actions: ["GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE"] }, { pageCode: "INVOICE_PENDING", actions: ["GENERATE_INVOICE"] }, { pageCode: "GENERATED_INVOICES", actions: ["VIEW_INVOICE", "PRINT_INVOICE"] }, { pageCode: "INVOICE_DOCUMENT", actions: ["VIEW_INVOICE", "PRINT_INVOICE"] }] },
        ],
      };
    case "procurement manager":
      return {
        moduleCodes: ["PROCUREMENT", "TMS"],
        dataScope: "ALL_TENANT",
        previewPageCode: "TENANT_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }, { pageCode: "VENDORS", actions: ["CREATE", "EDIT", "UPLOAD", "DOWNLOAD", "EXPORT"] }] },
          { moduleCode: "BOOKING", pages: [{ pageCode: "BOOKING_LIST" }, { pageCode: "BOOKING_DETAIL" }, { pageCode: "ASSIGNMENT_QUEUE", actions: ["ASSIGN_VENDOR"] }] },
          { moduleCode: "VENDOR_APP", pages: [{ pageCode: "VENDOR_DASHBOARD" }, { pageCode: "VENDOR_INVOICE_PAYABLE", actions: ["DOWNLOAD"] }, { pageCode: "VENDOR_POD_DOCUMENTS", actions: ["DOWNLOAD"] }] },
        ],
      };
    case "fleet manager":
      return {
        moduleCodes: ["FLEET", "TMS"],
        dataScope: "ALL_TENANT",
        previewPageCode: "TENANT_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }, { pageCode: "VEHICLE_TYPES", actions: ["CREATE", "EDIT"] }, { pageCode: "VEHICLES", actions: ["CREATE", "EDIT"] }, { pageCode: "DRIVERS", actions: ["CREATE", "EDIT"] }] },
          { moduleCode: "BOOKING", pages: [{ pageCode: "ASSIGNMENT_QUEUE", actions: ["ASSIGN_VEHICLE"] }, { pageCode: "LIVE_TRACKING" }, { pageCode: "BOOKING_DETAIL", actions: ["ASSIGN_VEHICLE"] }, { pageCode: "BOOKING_LIST" }] },
          { moduleCode: "DRIVER_APP", pages: [{ pageCode: "DRIVER_DASHBOARD" }, { pageCode: "MY_TRIPS" }] },
        ],
      };
    case "garage manager":
      return {
        moduleCodes: ["FLEET"],
        dataScope: "OWN_RECORDS",
        previewPageCode: "TENANT_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }, { pageCode: "VEHICLES", actions: ["EDIT"] }] },
        ],
      };
    case "customer user":
      return {
        moduleCodes: ["TMS", "FINANCE"],
        dataScope: "CUSTOMER",
        previewPageCode: "CUSTOMER_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }] },
          { moduleCode: "CUSTOMER_PORTAL", pages: [{ pageCode: "CUSTOMER_DASHBOARD" }, { pageCode: "MY_BOOKINGS", actions: ["DOWNLOAD"] }, { pageCode: "CREATE_BOOKING_REQUEST", actions: ["CREATE", "SUBMIT_BOOKING"] }, { pageCode: "CUSTOMER_TRACKING" }, { pageCode: "CUSTOMER_DOCUMENTS", actions: ["DOWNLOAD", "PRINT"] }, { pageCode: "CUSTOMER_INVOICES", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"] }] },
        ],
      };
    case "vendor user":
      return {
        moduleCodes: ["PROCUREMENT", "TMS"],
        dataScope: "VENDOR",
        previewPageCode: "VENDOR_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }] },
          { moduleCode: "VENDOR_APP", pages: [{ pageCode: "VENDOR_DASHBOARD" }, { pageCode: "ASSIGNED_TRIPS", actions: ["DOWNLOAD"] }, { pageCode: "TRIP_ACCEPTANCE", actions: ["APPROVE", "REJECT"] }, { pageCode: "VENDOR_POD_DOCUMENTS", actions: ["UPLOAD", "UPLOAD_POD", "UPLOAD_DOCUMENTS", "DOWNLOAD"] }, { pageCode: "VENDOR_INVOICE_PAYABLE", actions: ["DOWNLOAD"] }] },
        ],
      };
    case "driver user":
      return {
        moduleCodes: ["FLEET", "TMS"],
        dataScope: "DRIVER",
        previewPageCode: "DRIVER_DASHBOARD",
        roleAccess: [
          { moduleCode: "ADMINISTRATION", pages: [{ pageCode: "TENANT_DASHBOARD" }] },
          { moduleCode: "DRIVER_APP", pages: [{ pageCode: "DRIVER_LOGIN" }, { pageCode: "DRIVER_DASHBOARD" }, { pageCode: "MY_TRIPS" }, { pageCode: "TRIP_DETAIL", actions: ["MARK_DELIVERED", "UPLOAD_POD", "UPLOAD_DOCUMENTS"] }, { pageCode: "INCIDENT_CENTER", actions: ["CREATE", "UPLOAD"] }, { pageCode: "DRIVER_PROFILE", actions: ["EDIT"] }] },
        ],
      };
    default:
      return null;
  }
}

export function hasBrdDefaultTemplate(roleName: string) {
  return Boolean(getTemplateSpec(roleName));
}

export function buildBrdDefaultRoleTemplate(
  tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled">,
  role: Pick<RoleDefinition, "name">,
) {
  const spec = getTemplateSpec(role.name);
  if (!spec) {
    return null;
  }
  return {
    moduleCodes: spec.moduleCodes,
    dataScope: spec.dataScope,
    roleAccess: buildRoleAccess(tenant, spec.roleAccess),
    previewPageCode: spec.previewPageCode,
  };
}

export function getRolePreviewStartPath(
  tenant: Pick<TenantRecord, "id" | "tenantType" | "customerPortalEnabled">,
  role: Pick<RoleDefinition, "name" | "roleAccess"> | null,
) {
  if (!role) {
    return `/tenant/${tenant.id}/dashboard`;
  }
  const template = buildBrdDefaultRoleTemplate(tenant, role);
  const fallbackPageCode = template?.previewPageCode ?? "TENANT_DASHBOARD";
  switch (fallbackPageCode) {
    case "CUSTOMER_DASHBOARD":
      return `/tenant/${tenant.id}/dashboard`;
    case "VENDOR_DASHBOARD":
      return `/tenant/${tenant.id}/dashboard`;
    case "DRIVER_DASHBOARD":
      return `/tenant/${tenant.id}/driver-app/dashboard`;
    case "FINANCE_WORKSPACE":
      return `/tenant/${tenant.id}/finance`;
    default:
      return `/tenant/${tenant.id}/dashboard`;
  }
}
