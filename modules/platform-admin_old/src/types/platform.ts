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
  category: "Operations" | "Fleet" | "Procurement" | "Finance";
  description: string;
  status: "active" | "inactive";
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

export interface SessionContext {
  actorType: "platform_admin" | "tenant_admin";
  tenantId?: string;
  actorName: string;
  previewTenantRoleId?: string | null;
  activeTenantOrgUnitId?: string | null;
}

export interface PlatformSettings {
  brandingName: string;
  supportEmail: string;
  defaultTrialPlanId: string;
  defaultModuleCodes: string[];
  maintenanceMode: boolean;
  tenantProvisioningGuard: "standard" | "review_required";
}
