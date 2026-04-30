export type UserStatus = "active" | "invited" | "suspended";
export type UserType = "INTERNAL" | "VENDOR" | "DRIVER" | "CUSTOMER";

export interface TenantSummary {
  id: string;
  name: string;
  code: string;
  region: string;
}

export interface HierarchyLevel {
  id: string;
  tenantId: string;
  order: number;
  name: string;
  active: boolean;
}

export interface OrgUnit {
  id: string;
  tenantId: string;
  name: string;
  hierarchyLevelId: string;
  parentOrgUnitId: string | null;
  status: "active" | "planned";
}

export interface RoleDefinition {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  hierarchyLevelId: string;
  moduleCodes: string[];
  active: boolean;
}

export interface RolePermission {
  id: string;
  tenantId: string;
  roleId: string;
  moduleCode: string;
  featureCode: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export interface UserRecord {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  userType: UserType;
  roleId: string;
  orgUnitIds: string[];
  linkedVendorId?: string | null;
  linkedCustomerId?: string | null;
  driverName?: string;
  driverCode?: string;
  status: UserStatus;
  lastActive: string;
}
