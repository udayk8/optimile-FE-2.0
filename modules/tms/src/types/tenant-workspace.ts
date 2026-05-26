export type HierarchyTemplateCode =
  | "region-zone"
  | "region-branch"
  | "region-zone-branch-subbranch"
  | "custom";

export interface TenantContact {
  name: string;
  email: string;
}

export interface HierarchyLevelRecord {
  id: string;
  tenantId: string;
  order: number;
  name: string;
  active: boolean;
}

export interface TenantHierarchyConfig {
  tenantId: string;
  startingBlueprint: HierarchyTemplateCode;
  levels: HierarchyLevelRecord[];
  lastUpdated: string;
}

export interface TenantWorkspaceState {
  tenantId: string;
  startingBlueprint: HierarchyTemplateCode;
  hierarchy: TenantHierarchyConfig;
}

export interface CreateTenantInput {
  name: string;
  code: string;
  status: "active" | "trial" | "paused";
  planId: string;
  tenantType: "DIRECT_CUSTOMER" | "LOGISTICS_PROVIDER_3PL";
  customerPortalEnabled: boolean;
  primaryContactName: string;
  primaryContactEmail: string;
  starterRole: "tenant_admin" | "ceo";
  enabledModuleCodes: string[];
  defaultHierarchyTemplate: HierarchyTemplateCode;
  notes: string;
}
