export interface TenantPlan {
  id: string;
  code: string;
  name: string;
  monthlyPriceUsd: number;
  seatsIncluded: number;
  features: string[];
}

export interface PlatformModule {
  id: string;
  code: string;
  name: string;
  category: "Administration" | "Operations" | "Fleet" | "Procurement" | "Finance";
  description: string;
  status: "active" | "inactive";
  /** Source folder under /modules that implements this module. */
  folderPath?: string;
  /** Start page the module opens to (standalone module-only login landing). */
  startRoute?: string;
}

export interface TenantHealth {
  activeUsers: number;
  monthlyBookings: number;
  policyCount: number;
  auditEvents24h: number;
}

export type TenantType =
  | "DIRECT_CUSTOMER"
  | "LOGISTICS_PROVIDER_3PL";

export type TenantAssignmentMode = "AUTO_VENDOR_FLOW" | "CONTROLLED_3PL_FLOW";
export type TenantCommercialMode = "SIMPLE" | "BUY_SELL_MARGIN";

export interface TenantRecord {
  id: string;
  name: string;
  code: string;
  region: string;
  industry: string;
  defaultTimezone?: string;
  planId: string;
  status: "active" | "trial" | "paused";
  tenantType: TenantType;
  customerPortalEnabled: boolean;
  assignmentMode: TenantAssignmentMode;
  commercialMode: TenantCommercialMode;
  enabledModuleCodes: string[];
  initialHierarchyTemplate: string;
  primaryAdminUserId: string;
  createdAt: string;
  health: TenantHealth;
}

export interface PlatformAuditEvent {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityName: string;
  tenantId?: string;
  timestamp: string;
  result: "success" | "warning" | "denied";
}

/**
 * How a tenant-workspace session was established.
 *  - INTERNAL: a tenant employee (Users module) — role/permission driven.
 *  - VENDOR / CUSTOMER: an external party signed in from tenant master data
 *    (Admin → Vendors / Admin → Customers) via phone + OTP. These sessions are
 *    NOT backed by a tenant user/role and only ever see their own portal.
 */
export type PortalLoginType = "INTERNAL" | "VENDOR" | "CUSTOMER";

export interface SessionContext {
  actorType: "platform_admin" | "tenant_admin";
  tenantId?: string;
  actorName: string;
  previewTenantRoleId?: string | null;
  activeTenantOrgUnitId?: string | null;
  // External-party (vendor/customer) portal login. Absent/"INTERNAL" for the
  // existing platform-admin and tenant-employee sessions, so all current
  // behaviour is unchanged.
  loginType?: PortalLoginType;
  vendorId?: string;
  vendorName?: string;
  customerId?: string;
  customerName?: string;
  phone?: string;
  module?: "VENDOR" | "CUSTOMER";
}

export interface PlatformSettings {
  brandingName: string;
  supportEmail: string;
  defaultTrialPlanId: string;
  defaultModuleCodes: string[];
  maintenanceMode: boolean;
  tenantProvisioningGuard: "standard" | "review_required";
}
