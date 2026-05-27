export type UserStatus = "active" | "invited" | "suspended";
export type UserType = "INTERNAL" | "VENDOR" | "DRIVER" | "CUSTOMER";
export type RolePageAction =
  | "VIEW"
  | "VIEW_MARGIN"
  | "CREATE"
  | "EDIT"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "EXPORT"
  | "PRINT"
  | "UPLOAD"
  | "DOWNLOAD"
  | "SUBMIT_BOOKING"
  | "APPROVE_RATE"
  | "ASSIGN_VENDOR"
  | "ASSIGN_VEHICLE"
  | "CHANGE_ASSIGNMENT"
  | "REPLACE_VEHICLE"
  | "HANDLE_VEHICLE_BREAKDOWN"
  | "START_LOADING"
  | "COMPLETE_LOADING"
  | "UPLOAD_DOCUMENTS"
  | "GENERATE_LR"
  | "MARK_DELIVERED"
  | "UPLOAD_POD"
  | "MARK_COMPLETED"
  | "GENERATE_INVOICE"
  | "VIEW_INVOICE"
  | "PRINT_INVOICE"
  | "MARK_PAID"
  | "RAISE_DISPUTE"
  | "CREATE_LR"
  | "UPLOAD_LR"
  | "ALLOCATE_LR"
  | "REQUEST_LR"
  | "APPROVE_LR"
  | "TRANSFER_LR"
  | "VOID_LR"
  | "VIEW_AUDIT";

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
  dataScope?: "ALL_TENANT" | "REGION" | "BRANCH" | "CUSTOMER" | "VENDOR" | "DRIVER" | "OWN_RECORDS";
  roleAccess?: RoleAccessModule[];
  active: boolean;
}

export interface RoleAccessPage {
  pageCode: string;
  canView: boolean;
  actions: RolePageAction[];
}

export interface RoleAccessModule {
  moduleCode: string;
  pages: RoleAccessPage[];
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
  linkedDriverId?: string | null;
  driverName?: string;
  driverCode?: string;
  status: UserStatus;
  lastActive: string;
  phone?: string;
  // Demo only: plaintext password stored in mock/localStorage. Remove when backend auth is integrated.
  password?: string;
}
