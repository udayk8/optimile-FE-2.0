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

export interface TenantRecord {
  id: string;
  name: string;
  code: string;
  region: string;
  industry: string;
  planId: string;
  status: "active" | "trial" | "paused";
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
}

export interface PlatformSettings {
  brandingName: string;
  supportEmail: string;
  defaultTrialPlanId: string;
  defaultModuleCodes: string[];
  maintenanceMode: boolean;
  tenantProvisioningGuard: "standard" | "review_required";
}
