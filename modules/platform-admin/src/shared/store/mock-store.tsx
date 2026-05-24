import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  mockCapabilities,
  mockHierarchyLevels,
  mockModules,
  mockOrgUnits,
  mockPlans,
  mockPlatformAuditLogs,
  mockPlatformSettings,
  mockPlatformTenants,
  mockRolePermissions,
  mockRoles,
  mockTenantCustomers,
  mockTenantCustomerAddresses,
  mockTenantCustomerRateCards,
  mockTenantBookings,
  mockTenantMaterials,
  mockTenantUOMDefinitions,
  mockTenantUOMMappings,
  mockTenantDrivers,
  mockTenantVehicles,
  mockTenantVehicleTypes,
  mockTenantVendors,
  mockTenantVendorRateCards,
  mockTenantAuditLogs,
  mockUsers,
} from "@/shared/mocks/data";
import { buildHierarchyConfigForTemplate } from "@/shared/lib/hierarchy-templates";
import {
  readStoredValue,
  storageKeys,
  writeStoredValue,
} from "@/shared/lib/storage/browser-storage";
import {
  getAccessibleModuleCodes,
  normalizeModuleKey,
  normalizeModuleKeys,
} from "@/shared/lib/tenant-admin";
import { buildBrdDefaultRoleTemplate } from "@/shared/lib/tenant-role-templates";
import { isDirectCustomerTenant } from "@/shared/lib/tenant-config";
import { getDefaultAssignmentMode, getDefaultCommercialMode } from "@/shared/lib/tenant-config";
import { canCancelBooking, canTransitionBooking, normalizeBookingId } from "@/modules/tms/booking/services/booking-engine";
import { buildTenantLrAssignmentsForBooking, buildTenantLrPoolsFromConfig, mapLrStatusFromBookingStatus } from "@/modules/tms/booking/services/lr-generation";
import { resolveManualLrFormatForOrgUnit } from "@/modules/tenant-admin/lib/manual-lr";
import { ensureShipmentDocuments } from "@/modules/tms/booking/services/shipment-documents";
import type { AuditLogRecord, Capability } from "@/types/abac";
import type {
  HierarchyLevel,
  OrgUnit,
  RoleAccessModule,
  RoleDefinition,
  RolePageAction,
  RolePermission,
  UserType,
  UserRecord,
} from "@/types/access";
import type {
  CustomerAddressMasterEntry,
  CustomerAddressTag,
  CustomerSetupProgress,
  CustomerSetupStatus,
  TenantCustomer,
  TenantCustomerInput,
  TenantCustomerAddress,
  TenantCustomerAddressInput,
  TenantCustomerRateCard,
  TenantCustomerRateCardInput,
} from "@/types/customer";
import type {
  BookingAssignmentInput,
  BookingInput,
  BookingVehicleReplacementHistoryRecord,
  BookingVehicleReplacementInput,
  BookingVehicleReplacementVendorActionInput,
  BookingReassignmentInput,
  BookingRecord,
  BookingStatusTransitionInput,
  TenantLrAllocationRequestRecord,
  TenantLrPoolRecord,
  TenantLrRecord,
  TenantLrTransferRecord,
  TenantInvoiceRecord,
} from "@/modules/tms/booking/types";
import type {
  TenantDriver,
  TenantDriverInput,
  TenantVehicle,
  TenantVehicleInput,
} from "@/types/fleet";
import type {
  LRAllocationApprovalFlow,
  LRAllocationFlowConfig,
  LRAllocationFlowLevel,
  LRAllocationFlowMode,
  LRAllocationRequestFlow,
  LRPoolOwnershipType,
  LRConsumptionLevel,
  LRAllocationStrategy,
  LRConfigScopeType,
  ManualLRChildGovernanceRule,
  ManualLRDistributionStrategy,
  ManualLRWorkflowPermissionScope,
  ManualLRWorkflowPermissions,
  ManualLRWorkflowMode,
  LRPoolSource,
  LRYearFormat,
  TenantLRConfig,
  TenantLRConfigInput,
  TenantMaterial,
  TenantMaterialInput,
  TenantUOMDefinition,
  TenantUOMDefinitionInput,
  TenantUOMMapping,
  TenantUOMMappingInput,
  TenantVehicleType,
  TenantVehicleTypeInput,
} from "@/types/master-data";
import type {
  TenantVendor,
  TenantVendorInput,
  TenantVendorRateCard,
  TenantVendorRateCardInput,
} from "@/types/vendor";
import type {
  PlatformAuditEvent,
  PlatformModule,
  PlatformSettings,
  TenantPlan,
  TenantRecord,
} from "@/types/platform";
import type {
  CreateTenantInput,
  HierarchyTemplateCode,
  TenantHierarchyConfig,
  TenantWorkspaceState,
} from "@/types/tenant-workspace";

interface MockStoreValue {
  platformTenants: TenantRecord[];
  plans: TenantPlan[];
  modules: PlatformModule[];
  platformAuditLogs: PlatformAuditEvent[];
  platformSettings: PlatformSettings;
  moduleFeatures: Capability[];
  createPlatformModule: (input: Omit<PlatformModule, "id">) => PlatformModule;
  updatePlatformModule: (
    moduleId: string,
    updates: Partial<Omit<PlatformModule, "id">>,
  ) => PlatformModule;
  createTenant: (input: CreateTenantInput) => TenantRecord;
  createSampleTenant: (template: HierarchyTemplateCode) => TenantRecord;
  appendPlatformAuditLog: (input: Omit<PlatformAuditEvent, "id" | "timestamp"> & { timestamp?: string }) => PlatformAuditEvent;
  updatePlatformTenant: (
    tenantId: string,
    updates: Partial<
      Pick<
        TenantRecord,
        | "name"
        | "code"
        | "region"
        | "industry"
        | "planId"
        | "status"
        | "tenantType"
        | "customerPortalEnabled"
        | "assignmentMode"
        | "commercialMode"
        | "enabledModuleCodes"
      >
    >,
  ) => void;
  savePlatformSettings: (settings: PlatformSettings) => void;
  getTenantPrimaryAdminUser: (tenantId: string) => UserRecord | null;
  getTenantById: (tenantId: string) => TenantRecord | null;
  listTenantCustomers: (tenantId: string) => TenantCustomer[];
  getTenantCustomerById: (tenantCustomerId: string) => TenantCustomer | null;
  createTenantCustomer: (
    input: Omit<TenantCustomer, "id" | "createdAt" | "updatedAt">,
  ) => TenantCustomer;
  updateTenantCustomer: (
    tenantCustomerId: string,
    updates: Partial<TenantCustomerInput>,
  ) => TenantCustomer;
  listTenantVendors: (tenantId: string) => TenantVendor[];
  getTenantVendorById: (tenantVendorId: string) => TenantVendor | null;
  createTenantVendor: (
    input: Omit<TenantVendor, "id" | "createdAt" | "updatedAt">,
  ) => TenantVendor;
  updateTenantVendor: (
    tenantVendorId: string,
    updates: Partial<TenantVendorInput>,
  ) => TenantVendor;
  listTenantCustomerAddresses: (tenantCustomerId: string) => TenantCustomerAddress[];
  createTenantCustomerAddress: (
    input: Omit<TenantCustomerAddress, "id" | "createdAt" | "updatedAt">,
  ) => TenantCustomerAddress;
  updateTenantCustomerAddress: (
    addressId: string,
    updates: Partial<TenantCustomerAddressInput>,
  ) => TenantCustomerAddress;
  deleteTenantCustomerAddress: (addressId: string) => boolean;
  listTenantCustomerRateCards: (tenantCustomerId: string) => TenantCustomerRateCard[];
  createTenantCustomerRateCard: (
    input: Omit<TenantCustomerRateCard, "id" | "createdAt" | "updatedAt">,
  ) => TenantCustomerRateCard;
  updateTenantCustomerRateCard: (
    rateCardId: string,
    updates: Partial<TenantCustomerRateCardInput>,
  ) => TenantCustomerRateCard;
  deleteTenantCustomerRateCard: (rateCardId: string) => boolean;
  listTenantBookings: (tenantId: string) => BookingRecord[];
  getTenantBookingById: (bookingId: string) => BookingRecord | null;
  createTenantBooking: (
    input: Omit<BookingRecord, "id" | "bookingId" | "createdAt" | "updatedAt">,
  ) => BookingRecord;
  updateTenantBooking: (
    bookingId: string,
    updates: Partial<BookingInput>,
  ) => BookingRecord;
  transitionTenantBookingStatus: (
    bookingId: string,
    transition: BookingStatusTransitionInput,
  ) => BookingRecord;
  assignTenantBooking: (bookingId: string, input: BookingAssignmentInput) => BookingRecord;
  reassignTenantBooking: (bookingId: string, input: BookingReassignmentInput) => BookingRecord;
  replaceTenantBookingVehicle: (bookingId: string, input: BookingVehicleReplacementInput) => BookingRecord;
  actionTenantBookingVehicleReplacement: (bookingId: string, input: BookingVehicleReplacementVendorActionInput) => BookingRecord;
  listTenantInvoices: (tenantId: string) => TenantInvoiceRecord[];
  createTenantInvoice: (input: TenantInvoiceRecord) => TenantInvoiceRecord;
  listTenantVendorRateCards: (tenantVendorId: string) => TenantVendorRateCard[];
  createTenantVendorRateCard: (
    input: Omit<TenantVendorRateCard, "id" | "createdAt" | "updatedAt">,
  ) => TenantVendorRateCard;
  updateTenantVendorRateCard: (
    rateCardId: string,
    updates: Partial<TenantVendorRateCardInput>,
  ) => TenantVendorRateCard;
  listTenantVehicles: (tenantId: string) => TenantVehicle[];
  getTenantVehicleById: (vehicleId: string) => TenantVehicle | null;
  createTenantVehicle: (
    input: Omit<TenantVehicle, "id" | "createdAt" | "updatedAt">,
  ) => TenantVehicle;
  updateTenantVehicle: (
    vehicleId: string,
    updates: Partial<TenantVehicleInput>,
  ) => TenantVehicle;
  listTenantDrivers: (tenantId: string) => TenantDriver[];
  getTenantDriverById: (driverId: string) => TenantDriver | null;
  createTenantDriver: (
    input: Omit<TenantDriver, "id" | "createdAt" | "updatedAt">,
  ) => TenantDriver;
  updateTenantDriver: (
    driverId: string,
    updates: Partial<TenantDriverInput>,
  ) => TenantDriver;
  listTenantVehicleTypes: (tenantId: string) => TenantVehicleType[];
  createTenantVehicleType: (
    input: Omit<TenantVehicleType, "id" | "createdAt" | "updatedAt">,
  ) => TenantVehicleType;
  updateTenantVehicleType: (
    vehicleTypeId: string,
    updates: Partial<TenantVehicleTypeInput>,
  ) => TenantVehicleType;
  listTenantMaterials: (tenantId: string) => TenantMaterial[];
  createTenantMaterial: (
    input: Omit<TenantMaterial, "id" | "createdAt" | "updatedAt">,
  ) => TenantMaterial;
  updateTenantMaterial: (
    materialId: string,
    updates: Partial<TenantMaterialInput>,
  ) => TenantMaterial;
  listTenantUOMDefinitions: (tenantId: string) => TenantUOMDefinition[];
  createTenantUOMDefinition: (
    input: Omit<TenantUOMDefinition, "id" | "createdAt" | "updatedAt">,
  ) => TenantUOMDefinition;
  updateTenantUOMDefinition: (
    definitionId: string,
    updates: Partial<TenantUOMDefinitionInput>,
  ) => TenantUOMDefinition;
  listTenantUOMMappings: (tenantId: string) => TenantUOMMapping[];
  createTenantUOMMapping: (
    input: Omit<TenantUOMMapping, "id" | "createdAt" | "updatedAt">,
  ) => TenantUOMMapping;
  updateTenantUOMMapping: (
    mappingId: string,
    updates: Partial<TenantUOMMappingInput>,
  ) => TenantUOMMapping;
  deleteTenantUOMMapping: (mappingId: string) => boolean;
  listTenantLRConfigs: (tenantId: string) => TenantLRConfig[];
  createTenantLRConfig: (
    input: TenantLRConfigInput & { tenantId: string },
  ) => TenantLRConfig;
  updateTenantLRConfig: (
    lrConfigId: string,
    updates: Partial<TenantLRConfigInput>,
  ) => TenantLRConfig;
  upsertTenantLrPools: (records: TenantLrPoolRecord[]) => TenantLrPoolRecord[];
  listTenantLrPools: (tenantId: string) => TenantLrPoolRecord[];
  listTenantLrs: (tenantId: string) => TenantLrRecord[];
  createTenantLrs: (records: TenantLrRecord[]) => TenantLrRecord[];
  syncTenantLrsForBooking: (bookingId: string, status: BookingRecord["status"]) => void;
  listTenantLrRequests: (tenantId: string) => TenantLrAllocationRequestRecord[];
  createTenantLrRequest: (
    input: Omit<TenantLrAllocationRequestRecord, "id" | "createdAt" | "updatedAt"> & { tenantId: string },
  ) => TenantLrAllocationRequestRecord;
  approveTenantLrRequest: (
    requestId: string,
    approvedCount: number,
    actor: string,
    note?: string,
  ) => TenantLrAllocationRequestRecord;
  rejectTenantLrRequest: (
    requestId: string,
    actor: string,
    note?: string,
  ) => TenantLrAllocationRequestRecord;
  listTenantLrTransfers: (tenantId: string) => TenantLrTransferRecord[];
  createTenantLrTransfer: (
    input: Omit<TenantLrTransferRecord, "id" | "createdAt" | "updatedAt"> & { tenantId: string },
  ) => TenantLrTransferRecord;
  completeTenantLrTransfer: (
    transferId: string,
    actor: string,
    note?: string,
  ) => TenantLrTransferRecord;
  getTenantHierarchyState: (tenantId: string) => TenantWorkspaceState;
  saveTenantHierarchy: (tenantId: string, hierarchy: TenantHierarchyConfig) => void;
  listTenantLevels: (tenantId: string) => HierarchyLevel[];
  listTenantOrgUnits: (tenantId: string) => OrgUnit[];
  createTenantOrgUnit: (input: Omit<OrgUnit, "id">) => OrgUnit;
  updateTenantOrgUnit: (
    orgUnitId: string,
    updates: Partial<
      Pick<OrgUnit, "name" | "hierarchyLevelId" | "parentOrgUnitId" | "status">
    >,
  ) => void;
  deleteTenantOrgUnit: (orgUnitId: string) => boolean;
  listTenantUsers: (tenantId: string) => UserRecord[];
  createTenantUser: (input: Omit<UserRecord, "id" | "lastActive">) => UserRecord;
  updateTenantUser: (
    userId: string,
    updates: Partial<
      Pick<
        UserRecord,
        | "name"
        | "email"
        | "userType"
        | "roleId"
        | "orgUnitIds"
        | "linkedVendorId"
        | "linkedCustomerId"
        | "linkedDriverId"
        | "driverName"
        | "driverCode"
        | "status"
      >
    >,
  ) => void;
  listTenantRoles: (tenantId: string) => RoleDefinition[];
  createTenantRole: (input: Omit<RoleDefinition, "id">) => RoleDefinition;
  updateTenantRole: (
    roleId: string,
    updates: Partial<
      Pick<RoleDefinition, "name" | "description" | "hierarchyLevelId" | "moduleCodes" | "dataScope" | "roleAccess" | "active">
    >,
  ) => void;
  listTenantRolePermissions: (tenantId: string) => RolePermission[];
  saveRolePermissions: (roleId: string, permissions: RolePermission[]) => void;
  listTenantCapabilities: (tenantId: string) => Capability[];
  listTenantAuditLogs: (tenantId: string) => AuditLogRecord[];
}

const MockStoreContext = createContext<MockStoreValue | null>(null);
const PREGENERATED_LR_CLEANUP_MARKER_KEY = "optimile.tenant.lr.preGenerated.cleanup.2026-05-05";

function ensurePreGeneratedLrCleanupOnce() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storage = window.localStorage;
    if (storage.getItem(PREGENERATED_LR_CLEANUP_MARKER_KEY) === "done") {
      return;
    }

    const lrConfigs = readStoredValue<TenantLRConfig[]>(storageKeys.tenantLRConfigs, []);
    const removedConfigIds = new Set(
      lrConfigs.filter((config) => config.lrType === "PRE_GENERATED").map((config) => config.id),
    );
    const nextConfigs = lrConfigs.filter((config) => config.lrType !== "PRE_GENERATED");

    const lrRecords = readStoredValue<TenantLrRecord[]>(storageKeys.tenantLrs, []);
    const nextLrRecords = lrRecords.filter(
      (record) => record.type !== "PREGENERATED" && !removedConfigIds.has(record.configId ?? ""),
    );

    const lrPools = readStoredValue<TenantLrPoolRecord[]>(storageKeys.tenantLrPools, []);
    const nextPools = lrPools.filter((pool) => !removedConfigIds.has(pool.configId));

    const lrRequests = readStoredValue<TenantLrAllocationRequestRecord[]>(storageKeys.tenantLrRequests, []);
    const nextRequests = lrRequests.filter(
      (request) => request.lrType !== "PREGENERATED" && !removedConfigIds.has(request.configId ?? ""),
    );

    const lrTransfers = readStoredValue<TenantLrTransferRecord[]>(storageKeys.tenantLrTransfers, []);
    const nextTransfers = lrTransfers.filter(
      (transfer) => transfer.lrType !== "PREGENERATED" && !removedConfigIds.has(transfer.configId ?? ""),
    );

    writeStoredValue(storageKeys.tenantLRConfigs, nextConfigs);
    writeStoredValue(storageKeys.tenantLrs, nextLrRecords);
    writeStoredValue(storageKeys.tenantLrPools, nextPools);
    writeStoredValue(storageKeys.tenantLrRequests, nextRequests);
    writeStoredValue(storageKeys.tenantLrTransfers, nextTransfers);
    storage.setItem(PREGENERATED_LR_CLEANUP_MARKER_KEY, "done");
  } catch {
    // Keep existing data if cleanup cannot run safely.
  }
}

const ENTERPRISE_DEMO_CLEANUP_MARKER_KEY = "optimile.tenant.el001Demo.cleanup.2026-05-23";

// One-time cleanup: the old buildEnterpriseTenantEl001Access seeder was
// injecting hardcoded role-el001-* / user-el001-* records and forcing all
// modules onto any tenant whose code matched EL001. That seeder is now
// disabled. This sweep removes the leftover demo records so user-created
// tenants render their own data cleanly.
//
// Demo role IDs follow the pattern `role-el001-<suffix>` (e.g.
// role-el001-tenant-admin, role-el001-system-coordinator, ...).
// The wizard's own bootstrap user is `user-<code-lowercase>-admin` (e.g.
// user-el001-admin) and is linked to a role generated by
// buildStarterRolesForTenant whose IDs do NOT start with `role-el001-`. We
// key cleanup on role-id prefix to avoid touching real user-created records.
function ensureEnterpriseTenantEl001CleanupOnce() {
  if (typeof window === "undefined") return;
  try {
    const storage = window.localStorage;
    if (storage.getItem(ENTERPRISE_DEMO_CLEANUP_MARKER_KEY) === "done") return;

    const storedRoles = readStoredValue<RoleDefinition[]>(storageKeys.tenantRoles, []);
    const storedUsers = readStoredValue<UserRecord[]>(storageKeys.tenantUsers, []);
    const storedPermissions = readStoredValue<RolePermission[]>(storageKeys.tenantRolePermissions, []);
    const storedTenants = readStoredValue<TenantRecord[]>(storageKeys.platformTenants, []);

    const droppedRoleIds = new Set(
      storedRoles.filter((role) => role.id.startsWith("role-el001-")).map((role) => role.id),
    );
    const droppedUserIds = new Set(
      storedUsers.filter((user) => droppedRoleIds.has(user.roleId)).map((user) => user.id),
    );

    const nextRoles = storedRoles.filter((role) => !droppedRoleIds.has(role.id));
    const nextUsers = storedUsers.filter((user) => !droppedUserIds.has(user.id));
    const nextPermissions = storedPermissions.filter((permission) => !droppedRoleIds.has(permission.roleId));

    // Repoint any tenant whose primaryAdminUserId was set by the demo seeder
    // to the wizard's real bootstrap user (user-{code-lowercase}-admin).
    const nextTenants = storedTenants.map((tenant) => {
      if (!droppedUserIds.has(tenant.primaryAdminUserId)) return tenant;
      const wizardAdminId = `user-${tenant.code.trim().toLowerCase()}-admin`;
      const wizardAdminExists = nextUsers.some((user) => user.id === wizardAdminId);
      return { ...tenant, primaryAdminUserId: wizardAdminExists ? wizardAdminId : "" };
    });

    writeStoredValue(storageKeys.tenantRoles, nextRoles);
    writeStoredValue(storageKeys.tenantUsers, nextUsers);
    writeStoredValue(storageKeys.tenantRolePermissions, nextPermissions);
    writeStoredValue(storageKeys.platformTenants, nextTenants);
    storage.setItem(ENTERPRISE_DEMO_CLEANUP_MARKER_KEY, "done");
  } catch {
    // Leave data untouched on any failure.
  }
}

const BOOTSTRAP_ORG_UNIT_CLEANUP_MARKER_KEY = "optimile.tenant.bootstrapOrgUnit.cleanup.2026-05-24";

// One-time cleanup: createTenantInternal used to auto-create a root org unit
// named `${tenant.name} ${rootLevel.name}` with id `ou-{code}-root`. That path
// is removed, but existing localStorage still carries those records. Drop
// them so Tenant Admin starts with a clean slate.
function ensureBootstrapOrgUnitCleanupOnce() {
  if (typeof window === "undefined") return;
  try {
    const storage = window.localStorage;
    if (storage.getItem(BOOTSTRAP_ORG_UNIT_CLEANUP_MARKER_KEY) === "done") return;

    const storedOrgUnits = readStoredValue<OrgUnit[]>(storageKeys.tenantOrgUnits, []);
    const storedUsers = readStoredValue<UserRecord[]>(storageKeys.tenantUsers, []);

    const bootstrapPattern = /^ou-[a-z0-9-]+-root$/i;
    const droppedIds = new Set(
      storedOrgUnits
        .filter((unit) => bootstrapPattern.test(unit.id) && unit.parentOrgUnitId === null)
        .map((unit) => unit.id),
    );
    if (droppedIds.size === 0) {
      storage.setItem(BOOTSTRAP_ORG_UNIT_CLEANUP_MARKER_KEY, "done");
      return;
    }

    const nextOrgUnits = storedOrgUnits.filter((unit) => !droppedIds.has(unit.id));
    const nextUsers = storedUsers.map((user) => {
      if (!user.orgUnitIds?.some((id) => droppedIds.has(id))) return user;
      return { ...user, orgUnitIds: user.orgUnitIds.filter((id) => !droppedIds.has(id)) };
    });

    writeStoredValue(storageKeys.tenantOrgUnits, nextOrgUnits);
    writeStoredValue(storageKeys.tenantUsers, nextUsers);
    storage.setItem(BOOTSTRAP_ORG_UNIT_CLEANUP_MARKER_KEY, "done");
  } catch {
    // Leave data untouched on any failure.
  }
}

const STARTER_CEO_CLEANUP_MARKER_KEY = "optimile.tenant.starterCeoRole.cleanup.2026-05-24";

// One-time cleanup: the bootstrap path used to auto-create a CEO role
// alongside the system Tenant Admin role. That code is removed but legacy
// localStorage still carries those rows. Drop them; Tenant Admin will create
// any non-admin roles manually.
function ensureStarterCeoRoleCleanupOnce() {
  if (typeof window === "undefined") return;
  try {
    const storage = window.localStorage;
    if (storage.getItem(STARTER_CEO_CLEANUP_MARKER_KEY) === "done") return;

    const storedRoles = readStoredValue<RoleDefinition[]>(storageKeys.tenantRoles, []);
    const storedUsers = readStoredValue<UserRecord[]>(storageKeys.tenantUsers, []);
    const storedPermissions = readStoredValue<RolePermission[]>(storageKeys.tenantRolePermissions, []);

    // Bootstrap CEO role id: `role-ceo-{tenantId}`.
    const ceoPattern = /^role-ceo-/i;
    const droppedRoleIds = new Set(
      storedRoles.filter((role) => ceoPattern.test(role.id)).map((role) => role.id),
    );
    if (droppedRoleIds.size === 0) {
      storage.setItem(STARTER_CEO_CLEANUP_MARKER_KEY, "done");
      return;
    }

    const nextRoles = storedRoles.filter((role) => !droppedRoleIds.has(role.id));
    const nextUsers = storedUsers.map((user) =>
      droppedRoleIds.has(user.roleId) ? { ...user, roleId: "" } : user,
    );
    const nextPermissions = storedPermissions.filter((permission) => !droppedRoleIds.has(permission.roleId));

    writeStoredValue(storageKeys.tenantRoles, nextRoles);
    writeStoredValue(storageKeys.tenantUsers, nextUsers);
    writeStoredValue(storageKeys.tenantRolePermissions, nextPermissions);
    storage.setItem(STARTER_CEO_CLEANUP_MARKER_KEY, "done");
  } catch {
    /* leave data untouched on any failure */
  }
}

function buildSeedWorkspaces() {
  const workspaceMap: Record<string, TenantWorkspaceState> = {};
  for (const tenant of mockPlatformTenants) {
    const template = tenant.initialHierarchyTemplate as HierarchyTemplateCode;
    workspaceMap[tenant.id] = {
      tenantId: tenant.id,
      startingBlueprint: template,
      hierarchy: {
        tenantId: tenant.id,
        startingBlueprint: template,
        levels: mockHierarchyLevels
          .filter((level) => level.tenantId === tenant.id)
          .sort((a, b) => a.order - b.order),
        lastUpdated: new Date().toISOString(),
      },
    };
  }
  return workspaceMap;
}

function loadSeededState<T>(key: string, seed: T) {
  return readStoredValue(key, seed);
}

function normalizeStoredPlatformTenants(storedTenants: TenantRecord[]) {
  return storedTenants.map((tenant) => ({
    ...tenant,
    tenantType: tenant.tenantType ?? "LOGISTICS_PROVIDER_3PL",
    customerPortalEnabled: tenant.customerPortalEnabled ?? false,
    assignmentMode: tenant.assignmentMode ?? getDefaultAssignmentMode(tenant.tenantType ?? "LOGISTICS_PROVIDER_3PL"),
    commercialMode: tenant.commercialMode ?? getDefaultCommercialMode(tenant.tenantType ?? "LOGISTICS_PROVIDER_3PL"),
  }));
}

function normalizeStoredRoles(
  storedRoles: RoleDefinition[],
  workspaces: Record<string, TenantWorkspaceState>,
  platformTenants: TenantRecord[],
  rolePermissions: RolePermission[],
) {
  return storedRoles.map((role) => {
    if (role.hierarchyLevelId && Array.isArray(role.moduleCodes)) {
      return role;
    }

    const tenantLevels = [...(workspaces[role.tenantId]?.hierarchy.levels ?? [])].sort(
      (a, b) => a.order - b.order,
    );
    const rootLevelId = tenantLevels[0]?.id ?? "";
    const branchLevelId =
      tenantLevels.find((level) => level.name.toLowerCase().includes("branch"))?.id ?? rootLevelId;
    const deepestLevelId = tenantLevels[tenantLevels.length - 1]?.id ?? rootLevelId;
    const normalizedName = role.name.toLowerCase();
    const tenantEnabledModules =
      platformTenants.find((tenant) => tenant.id === role.tenantId)?.enabledModuleCodes ?? [];

    const inferredFromPermissions = inferRoleModulesFromPermissions(
      role.id,
      rolePermissions,
      tenantEnabledModules,
    );
    const inferredModules =
      Array.isArray(role.moduleCodes) && role.moduleCodes.length
        ? role.moduleCodes
        : inferredFromPermissions.length
          ? inferredFromPermissions
          : normalizedName.includes("fleet")
            ? ["FLEET"]
            : normalizedName.includes("finance") || normalizedName.includes("account")
              ? ["FINANCE"]
              : normalizedName.includes("procurement")
                ? ["PROCUREMENT"]
                : tenantEnabledModules[0]
                  ? [normalizeModuleKey(tenantEnabledModules[0])]
                  : ["TMS"];

    if (normalizedName.includes("branch")) {
      return { ...role, hierarchyLevelId: branchLevelId, moduleCodes: inferredModules };
    }
    if (normalizedName.includes("dispatcher") || normalizedName.includes("operator")) {
      return { ...role, hierarchyLevelId: deepestLevelId, moduleCodes: inferredModules };
    }
    return { ...role, hierarchyLevelId: rootLevelId, moduleCodes: inferredModules };
  });
}

function normalizeStoredUsers(storedUsers: UserRecord[]) {
  return storedUsers.map((user) => {
    if (Array.isArray(user.orgUnitIds) && user.userType) {
      return {
        ...user,
        linkedVendorId: user.linkedVendorId ?? null,
        linkedCustomerId: user.linkedCustomerId ?? null,
        linkedDriverId: user.linkedDriverId ?? null,
        driverName: user.driverName ?? "",
        driverCode: user.driverCode ?? "",
      };
    }

    const legacyOrgUnitId = (user as UserRecord & { orgUnitId?: string }).orgUnitId;
    return {
      ...user,
      userType: "INTERNAL" as const,
      orgUnitIds: legacyOrgUnitId ? [legacyOrgUnitId] : [],
      linkedVendorId: null,
      linkedCustomerId: null,
      linkedDriverId: null,
      driverName: "",
      driverCode: "",
    };
  });
}

const ENTERPRISE_TENANT_ID = "tenant-el001";
const ENTERPRISE_TENANT_CODE = "EL001";

function isEnterpriseTenantTarget(_tenant: Pick<TenantRecord, "id" | "code">) {
  // Demo enterprise seeding disabled: it was hijacking user-created tenants
  // (e.g. anyone who picks the EL001 code) and overwriting their roles, users,
  // modules, and admin identity. No replacement seed needed; the wizard
  // provides everything a real tenant requires.
  return false;
}

function buildEnterpriseTenantEl001ManualLrWorkflowPermissions(roles: RoleDefinition[]) {
  const roleIdByName = new Map(roles.map((role) => [role.name.trim().toLowerCase(), role.id]));
  const byNames = (...names: string[]) =>
    names
      .map((name) => roleIdByName.get(name.trim().toLowerCase()) ?? "")
      .filter(Boolean);

  return {
    UPLOAD_LR: byNames("Tenant Admin / CEO", "System Coordinator"),
    ALLOCATE_LR: byNames("Regional Manager"),
    REQUEST_LR: byNames("Operations Manager", "Dispatch Supervisor"),
    APPROVE_LR: byNames("Regional Manager", "Operations Head / COO"),
    TRANSFER_LR: byNames("Operations Manager", "Regional Manager", "Tenant Admin / CEO"),
    CONSUME_LR: byNames("Operations Manager", "Dispatch Supervisor"),
    VOID_LR: byNames("Tenant Admin / CEO", "Operations Head / COO"),
    VIEW_AUDIT: byNames("Tenant Admin / CEO", "Operations Head / COO", "System Coordinator"),
  } satisfies ManualLRWorkflowPermissions;
}

function applyEnterpriseTenantEl001LrConfigDefaults(params: {
  platformTenants: TenantRecord[];
  workspaces: Record<string, TenantWorkspaceState>;
  roles: RoleDefinition[];
  configs: TenantLRConfig[];
}) {
  const tenant = params.platformTenants.find(isEnterpriseTenantTarget);
  if (!tenant) {
    return params.configs;
  }

  const tenantId = tenant.id;
  const workflowPermissions = buildEnterpriseTenantEl001ManualLrWorkflowPermissions(
    params.roles.filter((role) => role.tenantId === tenantId),
  );
  const levels = [...(params.workspaces[tenantId]?.hierarchy.levels ?? [])].sort((left, right) => left.order - right.order);
  const branchLevelId =
    levels.find((level) => level.name.toLowerCase().includes("branch"))?.id ??
    levels.find((level) => level.name.toLowerCase().includes("hub"))?.id ??
    levels[levels.length - 1]?.id ??
    null;
  const now = new Date().toISOString();
  const manualConfig = params.configs.find(
    (config) => config.tenantId === tenantId && config.lrType === "MANUAL",
  );

  if (!manualConfig) {
    return normalizeStoredTenantLRConfigs([
      ...params.configs,
      {
        id: "lr-config-el001-manual",
        tenantId,
        scopeType: "HIERARCHY",
        scopeOrgUnitIds: [],
        poolOwnershipType: "TENANT",
        customerId: null,
        vendorId: null,
        lrType: "MANUAL",
        allocationStrategy: "HIERARCHICAL",
        prefix: "ELMAN",
        numberSeparator: "-",
        yearFormat: "NONE",
        zeroPaddingLength: 6,
        customerOwnershipEnabled: false,
        poolSource: "RANGE",
        ownershipLevelId: branchLevelId,
        distributionStrategy: "DISTRIBUTED",
        workflowMode: "APPROVAL_BASED",
        numberingPolicy: "STRICT_FORMAT",
        customerLrPolicy: "OPTIONAL_CUSTOMER_TAGGING",
        allowCustomerFallback: true,
        workflowPermissions,
        childGovernanceRules: [],
        placeFormatOverrides: [],
        poolRangeStart: "",
        poolRangeEnd: "",
        poolEntries: "",
        poolAvailableCount: 0,
        poolUsedCount: 0,
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  return normalizeStoredTenantLRConfigs(
    params.configs.map((config) => {
      if (config.id !== manualConfig.id) {
        return config;
      }
      return {
        ...config,
        scopeType: config.scopeType ?? "HIERARCHY",
        allocationStrategy: config.allocationStrategy ?? "HIERARCHICAL",
        ownershipLevelId: config.ownershipLevelId ?? branchLevelId,
        distributionStrategy: config.distributionStrategy ?? "DISTRIBUTED",
        workflowMode: config.workflowMode ?? "APPROVAL_BASED",
        numberingPolicy: config.numberingPolicy ?? "STRICT_FORMAT",
        customerLrPolicy: config.customerLrPolicy ?? "OPTIONAL_CUSTOMER_TAGGING",
        allowCustomerFallback: config.allowCustomerFallback ?? true,
        workflowPermissions: {
          UPLOAD_LR: Array.from(new Set([...(config.workflowPermissions?.UPLOAD_LR ?? []), ...workflowPermissions.UPLOAD_LR])),
          ALLOCATE_LR: Array.from(new Set([...(config.workflowPermissions?.ALLOCATE_LR ?? []), ...workflowPermissions.ALLOCATE_LR])),
          REQUEST_LR: Array.from(new Set([...(config.workflowPermissions?.REQUEST_LR ?? []), ...workflowPermissions.REQUEST_LR])),
          APPROVE_LR: Array.from(new Set([...(config.workflowPermissions?.APPROVE_LR ?? []), ...workflowPermissions.APPROVE_LR])),
          TRANSFER_LR: Array.from(new Set([...(config.workflowPermissions?.TRANSFER_LR ?? []), ...workflowPermissions.TRANSFER_LR])),
          CONSUME_LR: Array.from(new Set([...(config.workflowPermissions?.CONSUME_LR ?? []), ...workflowPermissions.CONSUME_LR])),
          VOID_LR: Array.from(new Set([...(config.workflowPermissions?.VOID_LR ?? []), ...workflowPermissions.VOID_LR])),
          VIEW_AUDIT: Array.from(new Set([...(config.workflowPermissions?.VIEW_AUDIT ?? []), ...workflowPermissions.VIEW_AUDIT])),
        },
        updatedAt: now,
      };
    }),
  );
}

function buildEnterpriseTenantEl001Access(params: {
  platformTenants: TenantRecord[];
  workspaces: Record<string, TenantWorkspaceState>;
  orgUnits: OrgUnit[];
  customers: TenantCustomer[];
  vendors: TenantVendor[];
  drivers: TenantDriver[];
  roles: RoleDefinition[];
  users: UserRecord[];
  rolePermissions: RolePermission[];
}) {
  const tenant = params.platformTenants.find(isEnterpriseTenantTarget);
  if (!tenant) {
    return params;
  }

  const tenantId = tenant.id;
  const levels = [...(params.workspaces[tenantId]?.hierarchy.levels ?? [])].sort((left, right) => left.order - right.order);
  if (!levels.length) {
    return params;
  }

  const orgUnits = params.orgUnits.filter((orgUnit) => orgUnit.tenantId === tenantId);
  const customers = params.customers.filter((customer) => customer.tenantId === tenantId);
  const vendors = params.vendors.filter((vendor) => vendor.tenantId === tenantId);
  const drivers = params.drivers.filter((driver) => driver.tenantId === tenantId);
  const firstCustomer = customers[0] ?? null;
  const firstVendor = vendors[0] ?? null;
  const firstDriver = drivers[0] ?? null;

  const rootLevelId = levels[0]?.id ?? "";
  const regionLevelId = levels.find((level) => level.name.toLowerCase().includes("region"))?.id ?? rootLevelId;
  const zoneLevelId = levels.find((level) => level.name.toLowerCase().includes("zone"))?.id ?? regionLevelId;
  const branchLevelId =
    levels.find((level) => level.name.toLowerCase().includes("branch"))?.id ??
    levels.find((level) => level.name.toLowerCase().includes("hub"))?.id ??
    levels[levels.length - 1]?.id ??
    rootLevelId;
  const subbranchLevelId =
    levels.find((level) =>
      ["subbranch", "depot", "yard", "station"].some((token) => level.name.toLowerCase().includes(token)),
    )?.id ??
    levels[levels.length - 1]?.id ??
    branchLevelId;

  const pickOrgUnitIds = (levelId: string, preferredTerms: string[] = []) => {
    const levelUnits = orgUnits.filter((orgUnit) => orgUnit.hierarchyLevelId === levelId);
    if (!levelUnits.length) {
      const fallback = orgUnits[0]?.id;
      return fallback ? [fallback] : [];
    }
    const preferred =
      levelUnits.find((orgUnit) => preferredTerms.some((term) => orgUnit.name.toLowerCase().includes(term))) ??
      levelUnits[0];
    return preferred ? [preferred.id] : [];
  };

  const getDescendantOrgUnitIds = (parentOrgUnitId: string | null) => {
    if (!parentOrgUnitId) {
      return [] as string[];
    }
    const descendantIds: string[] = [];
    const queue = [parentOrgUnitId];
    while (queue.length) {
      const currentParentId = queue.shift() ?? "";
      const children = orgUnits.filter((orgUnit) => orgUnit.parentOrgUnitId === currentParentId);
      children.forEach((child) => {
        descendantIds.push(child.id);
        queue.push(child.id);
      });
    }
    return descendantIds;
  };

  const findAncestorOrgUnitIdAtLevel = (orgUnitId: string, targetLevelId: string) => {
    let current = orgUnits.find((orgUnit) => orgUnit.id === orgUnitId) ?? null;
    while (current) {
      if (current.hierarchyLevelId === targetLevelId) {
        return current.id;
      }
      const parentOrgUnitId = current.parentOrgUnitId;
      current = current.parentOrgUnitId
        ? orgUnits.find((orgUnit) => orgUnit.id === parentOrgUnitId) ?? null
        : null;
    }
    return null;
  };

  const pickScopedOrgUnitIds = (input: {
    levelId: string;
    anchorOrgUnitId?: string | null;
    preferredTerms?: string[];
    limit?: number;
  }) => {
    const allLevelUnits = orgUnits.filter((orgUnit) => orgUnit.hierarchyLevelId === input.levelId);
    if (!allLevelUnits.length) {
      return pickOrgUnitIds(input.levelId, input.preferredTerms ?? []);
    }
    const scopedUnits = input.anchorOrgUnitId
      ? (() => {
          const descendantIds = new Set(getDescendantOrgUnitIds(input.anchorOrgUnitId));
          descendantIds.add(input.anchorOrgUnitId);
          return allLevelUnits.filter((orgUnit) => descendantIds.has(orgUnit.id));
        })()
      : allLevelUnits;
    const preferredTerms = (input.preferredTerms ?? []).map((term) => term.toLowerCase());
    const orderedUnits = scopedUnits.length ? scopedUnits : allLevelUnits;
    const preferredUnits = preferredTerms.length
      ? orderedUnits.filter((orgUnit) => preferredTerms.some((term) => orgUnit.name.toLowerCase().includes(term)))
      : [];
    const remainingUnits = orderedUnits.filter(
      (orgUnit) => !preferredUnits.some((preferredUnit) => preferredUnit.id === orgUnit.id),
    );
    const selectedUnits = [...preferredUnits, ...remainingUnits].slice(0, Math.max(1, input.limit ?? 1));
    return selectedUnits.length ? selectedUnits.map((orgUnit) => orgUnit.id) : pickOrgUnitIds(input.levelId, input.preferredTerms ?? []);
  };

  const primaryRegionId =
    pickScopedOrgUnitIds({ levelId: regionLevelId, preferredTerms: ["pai", "south", "west"], limit: 1 })[0] ?? "";
  const regionIds = pickScopedOrgUnitIds({
    levelId: regionLevelId,
    preferredTerms: ["pai", "south", "west", "north", "east"],
    limit: 3,
  });
  const allBranchUnits = orgUnits.filter((orgUnit) => orgUnit.hierarchyLevelId === branchLevelId);
  const branchIdsByRegion = new Map<string, string[]>();
  allBranchUnits.forEach((branchUnit) => {
    const ancestorRegionId = findAncestorOrgUnitIdAtLevel(branchUnit.id, regionLevelId);
    if (!ancestorRegionId) {
      return;
    }
    const current = branchIdsByRegion.get(ancestorRegionId) ?? [];
    branchIdsByRegion.set(ancestorRegionId, [...current, branchUnit.id]);
  });
  const discoveredRegionIds = Array.from(branchIdsByRegion.keys());
  const secondaryRegionId = regionIds[1] ?? discoveredRegionIds[1] ?? regionIds[0] ?? discoveredRegionIds[0] ?? "";
  const primaryZoneId =
    zoneLevelId && zoneLevelId !== regionLevelId
      ? pickScopedOrgUnitIds({
          levelId: zoneLevelId,
          anchorOrgUnitId: primaryRegionId,
          preferredTerms: ["pai", "south", "west"],
          limit: 1,
        })[0] ?? ""
      : "";
  const primaryBranchIds = pickScopedOrgUnitIds({
    levelId: branchLevelId,
    anchorOrgUnitId: primaryZoneId || primaryRegionId || null,
    preferredTerms: ["pai", "main", "central"],
    limit: 2,
  });
  const branchIds = pickScopedOrgUnitIds({
    levelId: branchLevelId,
    preferredTerms: ["pai", "main", "central", "north", "east"],
    limit: 4,
  });
  const primaryRegionBranchIds =
    (primaryRegionId ? branchIdsByRegion.get(primaryRegionId) : null)?.slice(0, 2) ??
    pickScopedOrgUnitIds({
      levelId: branchLevelId,
      anchorOrgUnitId: primaryRegionId || null,
      preferredTerms: ["pai", "main", "central"],
      limit: 2,
    });
  const secondaryRegionBranchIds =
    (secondaryRegionId ? branchIdsByRegion.get(secondaryRegionId) : null)?.slice(0, 2) ??
    pickScopedOrgUnitIds({
      levelId: branchLevelId,
      anchorOrgUnitId: secondaryRegionId || null,
      preferredTerms: ["north", "east", "main", "central"],
      limit: 2,
    });
  const primaryBranchId = primaryBranchIds[0] ?? pickOrgUnitIds(branchLevelId)[0] ?? "";
  const secondaryBranchIds =
    primaryBranchIds.length > 1
      ? primaryBranchIds
      : branchIds.length > 1
        ? branchIds.slice(0, 2)
        : pickScopedOrgUnitIds({
          levelId: branchLevelId,
          anchorOrgUnitId: primaryZoneId || primaryRegionId || null,
          preferredTerms: ["pai", "main", "central"],
          limit: 2,
        });
  const secondaryBranchId = secondaryBranchIds[1] ?? secondaryBranchIds[0] ?? primaryBranchId;
  const regionOneBranchOneId = primaryRegionBranchIds[0] ?? branchIds[0] ?? primaryBranchId;
  const regionOneBranchTwoId = primaryRegionBranchIds[1] ?? branchIds[1] ?? secondaryBranchId;
  const regionTwoBranchOneId = secondaryRegionBranchIds[0] ?? branchIds[2] ?? secondaryBranchId;
  const regionTwoBranchTwoId = secondaryRegionBranchIds[1] ?? branchIds[3] ?? regionTwoBranchOneId;
  const primarySubbranchIds = pickScopedOrgUnitIds({
    levelId: subbranchLevelId,
    anchorOrgUnitId: primaryBranchId || primaryZoneId || primaryRegionId || null,
    preferredTerms: ["pai", "yard", "depot"],
    limit: 2,
  });
  const subbranchIds = pickScopedOrgUnitIds({
    levelId: subbranchLevelId,
    preferredTerms: ["pai", "yard", "depot", "north", "east"],
    limit: 4,
  });
  const primarySubbranchId = primarySubbranchIds[0] ?? pickOrgUnitIds(subbranchLevelId)[0] ?? "";
  const secondarySubbranchId = primarySubbranchIds[1] ?? subbranchIds[1] ?? primarySubbranchId;

  const buildRoleAccess = (
    modules: Array<{
      moduleCode: string;
      pages: Array<{
        pageCode: string;
        actions: RolePageAction[];
      }>;
    }>,
  ): RoleAccessModule[] =>
    modules.map((module) => ({
      moduleCode: module.moduleCode,
      pages: module.pages.map((page) => ({
        pageCode: page.pageCode,
        canView: true,
        actions: Array.from(new Set<RolePageAction>(["VIEW", ...page.actions])),
      })),
    }));

  const tenantDashboardAccess = { pageCode: "TENANT_DASHBOARD", actions: [] as RolePageAction[] };
  const lrWorkspacePages = [
    { pageCode: "LR_DASHBOARD", actions: ["CREATE_LR", "UPLOAD_LR", "ALLOCATE_LR", "REQUEST_LR", "APPROVE_LR", "TRANSFER_LR", "VOID_LR", "VIEW_AUDIT"] as RolePageAction[] },
  ];
  const financeWorkspacePages = [
    { pageCode: "FINANCE_WORKSPACE", actions: ["VIEW_MARGIN", "GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE", "MARK_PAID", "RAISE_DISPUTE"] as RolePageAction[] },
    { pageCode: "BOOKING_INVOICING", actions: ["VIEW_MARGIN", "GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE"] as RolePageAction[] },
    { pageCode: "INVOICE_DOCUMENT", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"] as RolePageAction[] },
  ];
  const bookingCorePages = [
    { pageCode: "BOOKING_LIST", actions: ["EXPORT", "DOWNLOAD"] as RolePageAction[] },
    { pageCode: "BOOKING_DETAIL", actions: ["VIEW_MARGIN", "EDIT"] as RolePageAction[] },
    { pageCode: "LIVE_TRACKING", actions: ["EXPORT"] as RolePageAction[] },
    { pageCode: "COMPLETED_BOOKINGS", actions: ["UPLOAD_POD", "MARK_COMPLETED", "EXPORT"] as RolePageAction[] },
    { pageCode: "SHIPMENT_DOCUMENTS", actions: ["UPLOAD", "UPLOAD_DOCUMENTS", "DOWNLOAD"] as RolePageAction[] },
    { pageCode: "LR_VIEW", actions: ["PRINT", "DOWNLOAD", "GENERATE_LR"] as RolePageAction[] },
  ];
  const retainedEnterpriseRoleNames = new Set([
    "Tenant Admin / CEO",
    "System Coordinator",
    "Operations Head / COO",
    "Regional Manager",
    "Operations Manager",
    "Dispatch Supervisor",
    "Ground Supervisor",
  ]);

  const enterpriseRoles: RoleDefinition[] = [
    {
      id: "role-el001-tenant-admin",
      tenantId,
      name: "Tenant Admin / CEO",
      description: "Combined tenant governance and executive oversight role for setup, approvals, profitability visibility, audit, and full operational control.",
      hierarchyLevelId: rootLevelId,
      moduleCodes: ["TMS", "FLEET", "PROCUREMENT", "FINANCE"],
      dataScope: "ALL_TENANT",
      roleAccess: buildRoleAccess([
        {
          moduleCode: "ADMINISTRATION",
          pages: [
            tenantDashboardAccess,
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
            { pageCode: "TENANT_MODULES", actions: [] },
            { pageCode: "AUDIT_LOGS", actions: ["EXPORT", "DOWNLOAD"] },
            { pageCode: "SETTINGS", actions: ["EDIT"] },
          ],
        },
        {
          moduleCode: "BOOKING",
          pages: [
            { pageCode: "CREATE_BOOKING", actions: ["CREATE", "SUBMIT_BOOKING"] },
            { pageCode: "EDIT_BOOKING", actions: ["EDIT", "SUBMIT_BOOKING"] },
            { pageCode: "RATE_APPROVAL", actions: ["VIEW_MARGIN", "APPROVE", "APPROVE_RATE", "REJECT"] },
            { pageCode: "ASSIGNMENT_QUEUE", actions: ["VIEW_MARGIN", "EDIT", "ASSIGN_VENDOR", "ASSIGN_VEHICLE", "GENERATE_LR"] },
            ...bookingCorePages,
          ],
        },
        { moduleCode: "FINANCE", pages: financeWorkspacePages },
        { moduleCode: "LR", pages: lrWorkspacePages },
        {
          moduleCode: "DRIVER_APP",
          pages: [
            { pageCode: "DRIVER_LOGIN", actions: [] },
            { pageCode: "DRIVER_DASHBOARD", actions: [] },
            { pageCode: "MY_TRIPS", actions: [] },
            { pageCode: "TRIP_DETAIL", actions: ["MARK_DELIVERED", "UPLOAD_POD", "UPLOAD_DOCUMENTS"] },
            { pageCode: "INCIDENT_CENTER", actions: ["CREATE", "UPLOAD"] },
            { pageCode: "DRIVER_PROFILE", actions: ["EDIT"] },
          ],
        },
      ]),
      active: true,
    },
    {
      id: "role-el001-system-coordinator",
      tenantId,
      name: "System Coordinator",
      description: "Cross-functional coordinator with limited admin support, operational oversight, and reporting visibility.",
      hierarchyLevelId: branchLevelId,
      moduleCodes: ["TMS", "FINANCE", "PROCUREMENT"],
      dataScope: "ALL_TENANT",
      roleAccess: buildRoleAccess([
        {
          moduleCode: "ADMINISTRATION",
          pages: [
            tenantDashboardAccess,
            { pageCode: "USERS", actions: [] },
            { pageCode: "ROLES", actions: [] },
            { pageCode: "CUSTOMERS", actions: ["EXPORT"] },
            { pageCode: "VENDORS", actions: ["EXPORT"] },
            { pageCode: "AUDIT_LOGS", actions: ["EXPORT"] },
            { pageCode: "TENANT_MODULES", actions: [] },
          ],
        },
        {
          moduleCode: "BOOKING",
          pages: [
            { pageCode: "BOOKING_LIST", actions: ["EXPORT"] },
            { pageCode: "BOOKING_DETAIL", actions: [] },
            { pageCode: "LIVE_TRACKING", actions: ["EXPORT"] },
            { pageCode: "COMPLETED_BOOKINGS", actions: [] },
          ],
        },
        {
          moduleCode: "FINANCE",
          pages: [
            { pageCode: "FINANCE_WORKSPACE", actions: ["VIEW_INVOICE", "PRINT_INVOICE"] },
            { pageCode: "INVOICE_DOCUMENT", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"] },
          ],
        },
      ]),
      active: true,
    },
    {
      id: "role-el001-ceo-executive",
      tenantId,
      name: "CEO / Executive",
      description: "Executive visibility for profitability, approvals, finance summary, and strategic operational oversight.",
      hierarchyLevelId: rootLevelId,
      moduleCodes: ["TMS", "FINANCE", "PROCUREMENT"],
      dataScope: "ALL_TENANT",
      roleAccess: buildRoleAccess([
        {
          moduleCode: "ADMINISTRATION",
          pages: [tenantDashboardAccess, { pageCode: "AUDIT_LOGS", actions: ["EXPORT"] }],
        },
        {
          moduleCode: "BOOKING",
          pages: [
            { pageCode: "BOOKING_LIST", actions: ["EXPORT"] },
            { pageCode: "BOOKING_DETAIL", actions: [] },
            { pageCode: "RATE_APPROVAL", actions: ["VIEW_MARGIN", "APPROVE_RATE", "APPROVE", "REJECT"] },
            { pageCode: "ASSIGNMENT_QUEUE", actions: [] },
            { pageCode: "LIVE_TRACKING", actions: ["EXPORT"] },
            { pageCode: "COMPLETED_BOOKINGS", actions: [] },
          ],
        },
        { moduleCode: "FINANCE", pages: financeWorkspacePages },
      ]),
      active: true,
    },
    {
      id: "role-el001-operations-head",
      tenantId,
      name: "Operations Head / COO",
      description: "Overall operations controller responsible for SLA monitoring, escalation, approvals, and control tower supervision.",
      hierarchyLevelId: regionLevelId,
      moduleCodes: ["TMS", "FLEET", "FINANCE"],
      dataScope: "ALL_TENANT",
      roleAccess: buildRoleAccess([
        {
          moduleCode: "ADMINISTRATION",
          pages: [tenantDashboardAccess, { pageCode: "CUSTOMERS", actions: [] }, { pageCode: "VENDORS", actions: [] }, { pageCode: "VEHICLES", actions: [] }, { pageCode: "DRIVERS", actions: [] }],
        },
        {
          moduleCode: "BOOKING",
          pages: [
            { pageCode: "BOOKING_LIST", actions: ["EXPORT"] },
            { pageCode: "BOOKING_DETAIL", actions: ["VIEW_MARGIN", "ASSIGN_VENDOR", "ASSIGN_VEHICLE", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN", "START_LOADING", "COMPLETE_LOADING", "MARK_COMPLETED"] },
            { pageCode: "RATE_APPROVAL", actions: ["VIEW_MARGIN", "APPROVE_RATE", "APPROVE", "REJECT"] },
            { pageCode: "ASSIGNMENT_QUEUE", actions: ["VIEW_MARGIN", "ASSIGN_VENDOR", "ASSIGN_VEHICLE", "REPLACE_VEHICLE", "GENERATE_LR"] },
            { pageCode: "LIVE_TRACKING", actions: ["EXPORT", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN"] },
            { pageCode: "COMPLETED_BOOKINGS", actions: ["MARK_COMPLETED"] },
            { pageCode: "SHIPMENT_DOCUMENTS", actions: ["UPLOAD_DOCUMENTS"] },
            { pageCode: "LR_VIEW", actions: ["GENERATE_LR", "PRINT"] },
          ],
        },
        { moduleCode: "FINANCE", pages: [{ pageCode: "FINANCE_WORKSPACE", actions: ["VIEW_INVOICE", "PRINT_INVOICE"] }, { pageCode: "INVOICE_DOCUMENT", actions: ["VIEW_INVOICE", "PRINT_INVOICE"] }] },
        { moduleCode: "LR", pages: lrWorkspacePages },
      ]),
      active: true,
    },
    {
      id: "role-el001-regional-manager",
      tenantId,
      name: "Regional Manager",
      description: "Regional operations visibility and issue handling for the assigned operating region.",
      hierarchyLevelId: regionLevelId,
      moduleCodes: ["TMS", "FINANCE"],
      dataScope: "REGION",
      roleAccess: buildRoleAccess([
        { moduleCode: "ADMINISTRATION", pages: [tenantDashboardAccess, { pageCode: "CUSTOMERS", actions: [] }, { pageCode: "VENDORS", actions: [] }] },
        {
          moduleCode: "BOOKING",
          pages: [
            { pageCode: "BOOKING_LIST", actions: ["EXPORT"] },
            { pageCode: "BOOKING_DETAIL", actions: ["VIEW_MARGIN", "EDIT", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN"] },
            { pageCode: "ASSIGNMENT_QUEUE", actions: ["VIEW_MARGIN", "ASSIGN_VENDOR", "ASSIGN_VEHICLE", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE"] },
            { pageCode: "LIVE_TRACKING", actions: ["EXPORT", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN"] },
            { pageCode: "COMPLETED_BOOKINGS", actions: [] },
            { pageCode: "SHIPMENT_DOCUMENTS", actions: [] },
            { pageCode: "LR_VIEW", actions: ["PRINT"] },
          ],
        },
        { moduleCode: "FINANCE", pages: [{ pageCode: "FINANCE_WORKSPACE", actions: ["VIEW_INVOICE"] }] },
      ]),
      active: true,
    },
    {
      id: "role-el001-operations-manager",
      tenantId,
      name: "Operations Manager",
      description: "Primary execution role for booking, assignment, shipment progress, and dispatch coordination.",
      hierarchyLevelId: branchLevelId,
      moduleCodes: ["TMS", "FLEET", "FINANCE"],
      dataScope: "ALL_TENANT",
      roleAccess: buildRoleAccess([
        {
          moduleCode: "ADMINISTRATION",
          pages: [
            tenantDashboardAccess,
            { pageCode: "CUSTOMERS", actions: ["CREATE", "EDIT", "UPLOAD"] },
            { pageCode: "VENDORS", actions: ["CREATE", "EDIT", "UPLOAD"] },
            { pageCode: "VEHICLE_TYPES", actions: [] },
            { pageCode: "VEHICLES", actions: [] },
            { pageCode: "DRIVERS", actions: [] },
            { pageCode: "MATERIALS", actions: [] },
            { pageCode: "UOM_CONFIG", actions: [] },
            { pageCode: "LR_CONFIG", actions: [] },
          ],
        },
        {
          moduleCode: "BOOKING",
          pages: [
            { pageCode: "CREATE_BOOKING", actions: ["CREATE", "SUBMIT_BOOKING"] },
            { pageCode: "BOOKING_LIST", actions: ["EXPORT"] },
            { pageCode: "BOOKING_DETAIL", actions: ["VIEW_MARGIN", "EDIT", "ASSIGN_VENDOR", "ASSIGN_VEHICLE", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN", "START_LOADING", "COMPLETE_LOADING", "UPLOAD_DOCUMENTS", "GENERATE_LR", "MARK_DELIVERED", "UPLOAD_POD", "MARK_COMPLETED"] },
            { pageCode: "EDIT_BOOKING", actions: ["EDIT", "SUBMIT_BOOKING"] },
            { pageCode: "RATE_APPROVAL", actions: ["VIEW_MARGIN", "APPROVE_RATE"] },
            { pageCode: "ASSIGNMENT_QUEUE", actions: ["VIEW_MARGIN", "ASSIGN_VENDOR", "ASSIGN_VEHICLE", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "GENERATE_LR"] },
            { pageCode: "LIVE_TRACKING", actions: ["EXPORT", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN"] },
            { pageCode: "COMPLETED_BOOKINGS", actions: ["UPLOAD_POD", "MARK_COMPLETED"] },
            { pageCode: "BOOKING_INVOICING", actions: ["VIEW_INVOICE"] },
            { pageCode: "SHIPMENT_DOCUMENTS", actions: ["UPLOAD", "UPLOAD_DOCUMENTS"] },
            { pageCode: "LR_VIEW", actions: ["GENERATE_LR", "PRINT", "DOWNLOAD"] },
          ],
        },
        { moduleCode: "LR", pages: lrWorkspacePages },
      ]),
      active: true,
    },
    {
      id: "role-el001-dispatch-supervisor",
      tenantId,
      name: "Dispatch Supervisor",
      description: "Live dispatch controller for active trips, vendor coordination, and exception handling.",
      hierarchyLevelId: branchLevelId,
      moduleCodes: ["TMS", "FLEET"],
      dataScope: "ALL_TENANT",
      roleAccess: buildRoleAccess([
        { moduleCode: "ADMINISTRATION", pages: [tenantDashboardAccess, { pageCode: "VEHICLES", actions: [] }, { pageCode: "DRIVERS", actions: [] }] },
        {
          moduleCode: "BOOKING",
          pages: [
            { pageCode: "BOOKING_LIST", actions: [] },
            { pageCode: "BOOKING_DETAIL", actions: ["VIEW_MARGIN", "ASSIGN_VENDOR", "ASSIGN_VEHICLE", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN", "START_LOADING", "COMPLETE_LOADING", "UPLOAD_DOCUMENTS", "GENERATE_LR", "MARK_DELIVERED"] },
            { pageCode: "ASSIGNMENT_QUEUE", actions: ["VIEW_MARGIN", "ASSIGN_VENDOR", "ASSIGN_VEHICLE", "CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "GENERATE_LR"] },
            { pageCode: "LIVE_TRACKING", actions: ["CHANGE_ASSIGNMENT", "REPLACE_VEHICLE", "HANDLE_VEHICLE_BREAKDOWN"] },
            { pageCode: "COMPLETED_BOOKINGS", actions: ["UPLOAD_POD"] },
            { pageCode: "SHIPMENT_DOCUMENTS", actions: ["UPLOAD_DOCUMENTS"] },
            { pageCode: "LR_VIEW", actions: ["PRINT", "GENERATE_LR"] },
          ],
        },
        { moduleCode: "LR", pages: lrWorkspacePages },
      ]),
      active: true,
    },
    {
      id: "role-el001-ground-supervisor",
      tenantId,
      name: "Ground Supervisor",
      description: "Field execution supervisor for loading, unloading, on-ground remarks, and incident reporting.",
      hierarchyLevelId: branchLevelId,
      moduleCodes: ["TMS"],
      dataScope: "OWN_RECORDS",
      roleAccess: buildRoleAccess([
        { moduleCode: "ADMINISTRATION", pages: [tenantDashboardAccess] },
        {
          moduleCode: "BOOKING",
          pages: [
            { pageCode: "BOOKING_LIST", actions: [] },
            { pageCode: "BOOKING_DETAIL", actions: ["START_LOADING", "COMPLETE_LOADING", "UPLOAD_DOCUMENTS", "UPLOAD_POD", "MARK_DELIVERED"] },
            { pageCode: "LIVE_TRACKING", actions: [] },
            { pageCode: "COMPLETED_BOOKINGS", actions: ["UPLOAD_POD"] },
            { pageCode: "SHIPMENT_DOCUMENTS", actions: ["UPLOAD", "UPLOAD_DOCUMENTS"] },
          ],
        },
      ]),
      active: true,
    },
    {
      id: "role-el001-finance-manager",
      tenantId,
      name: "Finance Manager",
      description: "Finance owner for invoice approvals, payables, disputes, reconciliation, and margin visibility.",
      hierarchyLevelId: rootLevelId,
      moduleCodes: ["FINANCE", "TMS"],
      dataScope: "ALL_TENANT",
      roleAccess: buildRoleAccess([
        { moduleCode: "ADMINISTRATION", pages: [tenantDashboardAccess, { pageCode: "CUSTOMERS", actions: [] }, { pageCode: "VENDORS", actions: [] }, { pageCode: "AUDIT_LOGS", actions: ["EXPORT"] }] },
        {
          moduleCode: "BOOKING",
          pages: [
            { pageCode: "BOOKING_LIST", actions: [] },
            { pageCode: "BOOKING_DETAIL", actions: ["VIEW_MARGIN"] },
            { pageCode: "BOOKING_INVOICING", actions: ["VIEW_MARGIN", "GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE"] },
            { pageCode: "COMPLETED_BOOKINGS", actions: [] },
          ],
        },
        { moduleCode: "FINANCE", pages: financeWorkspacePages },
      ]),
      active: true,
    },
    {
      id: "role-el001-senior-accountant",
      tenantId,
      name: "Senior Accountant",
      description: "Invoice review, reconciliation, and financial processing support.",
      hierarchyLevelId: branchLevelId,
      moduleCodes: ["FINANCE", "TMS"],
      dataScope: "ALL_TENANT",
      roleAccess: buildRoleAccess([
        { moduleCode: "ADMINISTRATION", pages: [tenantDashboardAccess, { pageCode: "CUSTOMERS", actions: [] }] },
        {
          moduleCode: "BOOKING",
          pages: [
            { pageCode: "BOOKING_LIST", actions: [] },
            { pageCode: "BOOKING_INVOICING", actions: ["VIEW_MARGIN", "GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE"] },
            { pageCode: "COMPLETED_BOOKINGS", actions: [] },
          ],
        },
        {
          moduleCode: "FINANCE",
          pages: [
            { pageCode: "FINANCE_WORKSPACE", actions: ["VIEW_MARGIN", "GENERATE_INVOICE", "VIEW_INVOICE", "PRINT_INVOICE"] },
            { pageCode: "INVOICE_DOCUMENT", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"] },
          ],
        },
      ]),
      active: true,
    },
    {
      id: "role-el001-finance-executive",
      tenantId,
      name: "Finance Executive / Accountant",
      description: "Draft invoice preparation, expense verification, and operational finance entries.",
      hierarchyLevelId: branchLevelId,
      moduleCodes: ["FINANCE", "TMS"],
      dataScope: "ALL_TENANT",
      roleAccess: buildRoleAccess([
        { moduleCode: "ADMINISTRATION", pages: [tenantDashboardAccess] },
        {
          moduleCode: "BOOKING",
          pages: [
            { pageCode: "BOOKING_LIST", actions: [] },
            { pageCode: "BOOKING_INVOICING", actions: ["VIEW_MARGIN", "GENERATE_INVOICE", "VIEW_INVOICE"] },
          ],
        },
        {
          moduleCode: "FINANCE",
          pages: [
            { pageCode: "FINANCE_WORKSPACE", actions: ["VIEW_MARGIN", "GENERATE_INVOICE", "VIEW_INVOICE"] },
            { pageCode: "INVOICE_DOCUMENT", actions: ["VIEW_INVOICE", "PRINT_INVOICE"] },
          ],
        },
      ]),
      active: true,
    },
    {
      id: "role-el001-procurement-manager",
      tenantId,
      name: "Procurement Manager",
      description: "Vendor onboarding, buying rate management, contracts, and procurement commercial setup.",
      hierarchyLevelId: rootLevelId,
      moduleCodes: ["PROCUREMENT", "TMS"],
      dataScope: "ALL_TENANT",
      roleAccess: buildRoleAccess([
        { moduleCode: "ADMINISTRATION", pages: [tenantDashboardAccess, { pageCode: "VENDORS", actions: ["CREATE", "EDIT", "DELETE", "UPLOAD", "DOWNLOAD", "EXPORT"] }, { pageCode: "CUSTOMERS", actions: [] }] },
        {
          moduleCode: "BOOKING",
          pages: [
            { pageCode: "BOOKING_LIST", actions: [] },
            { pageCode: "BOOKING_DETAIL", actions: [] },
            { pageCode: "ASSIGNMENT_QUEUE", actions: ["ASSIGN_VENDOR"] },
          ],
        },
      ]),
      active: true,
    },
    {
      id: "role-el001-fleet-manager",
      tenantId,
      name: "Fleet Manager",
      description: "Vehicle and driver readiness, compliance, and fleet availability control.",
      hierarchyLevelId: rootLevelId,
      moduleCodes: ["FLEET", "TMS"],
      dataScope: "ALL_TENANT",
      roleAccess: buildRoleAccess([
        {
          moduleCode: "ADMINISTRATION",
          pages: [
            tenantDashboardAccess,
            { pageCode: "VEHICLE_TYPES", actions: ["CREATE", "EDIT"] },
            { pageCode: "VEHICLES", actions: ["CREATE", "EDIT"] },
            { pageCode: "DRIVERS", actions: ["CREATE", "EDIT"] },
          ],
        },
        {
          moduleCode: "BOOKING",
          pages: [
            { pageCode: "BOOKING_LIST", actions: [] },
            { pageCode: "BOOKING_DETAIL", actions: ["ASSIGN_VEHICLE"] },
            { pageCode: "ASSIGNMENT_QUEUE", actions: ["ASSIGN_VEHICLE"] },
            { pageCode: "LIVE_TRACKING", actions: [] },
          ],
        },
        {
          moduleCode: "DRIVER_APP",
          pages: [
            { pageCode: "DRIVER_LOGIN", actions: [] },
            { pageCode: "DRIVER_DASHBOARD", actions: [] },
            { pageCode: "MY_TRIPS", actions: [] },
            { pageCode: "TRIP_DETAIL", actions: [] },
            { pageCode: "INCIDENT_CENTER", actions: [] },
            { pageCode: "DRIVER_PROFILE", actions: [] },
          ],
        },
      ]),
      active: true,
    },
    {
      id: "role-el001-garage-manager",
      tenantId,
      name: "Garage Manager",
      description: "Workshop and repair owner for maintenance execution and asset readiness.",
      hierarchyLevelId: branchLevelId,
      moduleCodes: ["FLEET"],
      dataScope: "OWN_RECORDS",
      roleAccess: buildRoleAccess([
        { moduleCode: "ADMINISTRATION", pages: [tenantDashboardAccess, { pageCode: "VEHICLES", actions: ["EDIT"] }, { pageCode: "DRIVERS", actions: [] }] },
      ]),
      active: true,
    },
    {
      id: "role-el001-customer-user",
      tenantId,
      name: "Customer User",
      description: "Customer-scoped portal role for booking requests, tracking, invoice, and POD visibility.",
      hierarchyLevelId: branchLevelId,
      moduleCodes: ["TMS", "FINANCE"],
      dataScope: "CUSTOMER",
      roleAccess: buildRoleAccess([
        { moduleCode: "ADMINISTRATION", pages: [tenantDashboardAccess] },
        {
          moduleCode: "CUSTOMER_PORTAL",
          pages: [
            { pageCode: "CUSTOMER_DASHBOARD", actions: [] },
            { pageCode: "MY_BOOKINGS", actions: ["DOWNLOAD"] },
            { pageCode: "CREATE_BOOKING_REQUEST", actions: ["CREATE", "SUBMIT_BOOKING"] },
            { pageCode: "CUSTOMER_TRACKING", actions: [] },
            { pageCode: "CUSTOMER_DOCUMENTS", actions: ["DOWNLOAD", "PRINT"] },
            { pageCode: "CUSTOMER_INVOICES", actions: ["VIEW_INVOICE", "PRINT_INVOICE", "DOWNLOAD"] },
          ],
        },
      ]),
      active: true,
    },
    {
      id: "role-el001-vendor-user",
      tenantId,
      name: "Vendor User",
      description: "Vendor-scoped portal role for trip acceptance, document submission, and payable visibility without selling-rate access.",
      hierarchyLevelId: branchLevelId,
      moduleCodes: ["PROCUREMENT", "TMS"],
      dataScope: "VENDOR",
      roleAccess: buildRoleAccess([
        { moduleCode: "ADMINISTRATION", pages: [tenantDashboardAccess] },
        {
          moduleCode: "VENDOR_APP",
          pages: [
            { pageCode: "VENDOR_DASHBOARD", actions: [] },
            { pageCode: "ASSIGNED_TRIPS", actions: ["DOWNLOAD"] },
            { pageCode: "TRIP_ACCEPTANCE", actions: ["APPROVE", "REJECT"] },
            { pageCode: "VENDOR_POD_DOCUMENTS", actions: ["UPLOAD", "UPLOAD_POD", "UPLOAD_DOCUMENTS", "DOWNLOAD"] },
            { pageCode: "VENDOR_INVOICE_PAYABLE", actions: ["DOWNLOAD"] },
          ],
        },
      ]),
      active: true,
    },
    {
      id: "role-el001-driver-user",
      tenantId,
      name: "Driver User",
      description: "Assigned-trip driver execution role for checklist, POD, incidents, and expenses.",
      hierarchyLevelId: subbranchLevelId,
      moduleCodes: ["FLEET", "TMS"],
      dataScope: "DRIVER",
      roleAccess: buildRoleAccess([
        { moduleCode: "ADMINISTRATION", pages: [tenantDashboardAccess] },
        {
          moduleCode: "DRIVER_APP",
          pages: [
            { pageCode: "DRIVER_LOGIN", actions: [] },
            { pageCode: "DRIVER_DASHBOARD", actions: [] },
            { pageCode: "MY_TRIPS", actions: [] },
            { pageCode: "TRIP_DETAIL", actions: ["MARK_DELIVERED", "UPLOAD_POD", "UPLOAD_DOCUMENTS"] },
            { pageCode: "INCIDENT_CENTER", actions: ["CREATE", "UPLOAD"] },
            { pageCode: "DRIVER_PROFILE", actions: ["EDIT"] },
          ],
        },
      ]),
      active: true,
    },
  ];

  const permissionTemplates: Array<{
    roleId: string;
    grants: Array<{
      moduleCode: string;
      featureCode: string;
      canView?: boolean;
      canCreate?: boolean;
      canEdit?: boolean;
      canDelete?: boolean;
      canApprove?: boolean;
    }>;
  }> = [
    {
      roleId: "role-el001-tenant-admin",
      grants: [
        { moduleCode: "TMS", featureCode: "bookings", canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
        { moduleCode: "TMS", featureCode: "dispatch", canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
        { moduleCode: "TMS", featureCode: "control_tower", canView: true, canEdit: true, canApprove: true },
        { moduleCode: "TMS", featureCode: "exceptions", canView: true, canEdit: true, canApprove: true },
        { moduleCode: "FLEET", featureCode: "vehicles", canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
        { moduleCode: "FLEET", featureCode: "drivers", canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
        { moduleCode: "FLEET", featureCode: "maintenance", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "FLEET", featureCode: "fuel", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "FLEET", featureCode: "tyres", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "PROCUREMENT", featureCode: "vendors", canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
        { moduleCode: "PROCUREMENT", featureCode: "rfq_rfi", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "PROCUREMENT", featureCode: "auctions", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "PROCUREMENT", featureCode: "contracts", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "PROCUREMENT", featureCode: "disputes", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "FINANCE", featureCode: "invoices", canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
        { moduleCode: "FINANCE", featureCode: "payables", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "FINANCE", featureCode: "reconciliation", canView: true, canEdit: true, canApprove: true },
        { moduleCode: "FINANCE", featureCode: "reports", canView: true, canApprove: true },
      ],
    },
    {
      roleId: "role-el001-system-coordinator",
      grants: [
        { moduleCode: "TMS", featureCode: "bookings", canView: true, canCreate: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "dispatch", canView: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "control_tower", canView: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "exceptions", canView: true, canEdit: true },
        { moduleCode: "FINANCE", featureCode: "payables", canView: true },
        { moduleCode: "FINANCE", featureCode: "reconciliation", canView: true },
        { moduleCode: "FINANCE", featureCode: "reports", canView: true },
        { moduleCode: "FINANCE", featureCode: "invoices", canView: true },
        { moduleCode: "PROCUREMENT", featureCode: "vendors", canView: true, canEdit: true },
        { moduleCode: "PROCUREMENT", featureCode: "contracts", canView: true, canEdit: true },
      ],
    },
    {
      roleId: "role-el001-ceo-executive",
      grants: [
        { moduleCode: "TMS", featureCode: "bookings", canView: true },
        { moduleCode: "TMS", featureCode: "dispatch", canView: true, canApprove: true },
        { moduleCode: "TMS", featureCode: "control_tower", canView: true, canApprove: true },
        { moduleCode: "TMS", featureCode: "exceptions", canView: true, canApprove: true },
        { moduleCode: "PROCUREMENT", featureCode: "vendors", canView: true },
        { moduleCode: "PROCUREMENT", featureCode: "contracts", canView: true },
        { moduleCode: "FINANCE", featureCode: "invoices", canView: true, canApprove: true },
        { moduleCode: "FINANCE", featureCode: "payables", canView: true, canApprove: true },
        { moduleCode: "FINANCE", featureCode: "reconciliation", canView: true, canApprove: true },
        { moduleCode: "FINANCE", featureCode: "reports", canView: true, canApprove: true },
      ],
    },
    {
      roleId: "role-el001-operations-head",
      grants: [
        { moduleCode: "TMS", featureCode: "bookings", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "TMS", featureCode: "dispatch", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "TMS", featureCode: "control_tower", canView: true, canEdit: true, canApprove: true },
        { moduleCode: "TMS", featureCode: "exceptions", canView: true, canEdit: true, canApprove: true },
        { moduleCode: "FLEET", featureCode: "vehicles", canView: true, canEdit: true },
        { moduleCode: "FLEET", featureCode: "drivers", canView: true, canEdit: true },
        { moduleCode: "FINANCE", featureCode: "invoices", canView: true, canApprove: true },
        { moduleCode: "FINANCE", featureCode: "payables", canView: true, canApprove: true },
        { moduleCode: "FINANCE", featureCode: "reconciliation", canView: true },
        { moduleCode: "FINANCE", featureCode: "reports", canView: true, canApprove: true },
      ],
    },
    {
      roleId: "role-el001-regional-manager",
      grants: [
        { moduleCode: "TMS", featureCode: "bookings", canView: true, canCreate: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "dispatch", canView: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "control_tower", canView: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "exceptions", canView: true, canEdit: true },
        { moduleCode: "FINANCE", featureCode: "reports", canView: true },
      ],
    },
    {
      roleId: "role-el001-operations-manager",
      grants: [
        { moduleCode: "TMS", featureCode: "bookings", canView: true, canCreate: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "dispatch", canView: true, canCreate: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "control_tower", canView: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "exceptions", canView: true, canEdit: true },
        { moduleCode: "FLEET", featureCode: "vehicles", canView: true },
        { moduleCode: "FLEET", featureCode: "drivers", canView: true },
        { moduleCode: "FINANCE", featureCode: "invoices", canView: true },
        { moduleCode: "FINANCE", featureCode: "reports", canView: true },
      ],
    },
    {
      roleId: "role-el001-dispatch-supervisor",
      grants: [
        { moduleCode: "TMS", featureCode: "bookings", canView: true },
        { moduleCode: "TMS", featureCode: "dispatch", canView: true, canCreate: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "control_tower", canView: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "exceptions", canView: true, canEdit: true },
        { moduleCode: "FLEET", featureCode: "vehicles", canView: true },
        { moduleCode: "FLEET", featureCode: "drivers", canView: true },
      ],
    },
    {
      roleId: "role-el001-ground-supervisor",
      grants: [
        { moduleCode: "TMS", featureCode: "bookings", canView: true },
        { moduleCode: "TMS", featureCode: "dispatch", canView: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "exceptions", canView: true, canCreate: true, canEdit: true },
        { moduleCode: "FLEET", featureCode: "drivers", canView: true },
      ],
    },
    {
      roleId: "role-el001-finance-manager",
      grants: [
        { moduleCode: "FINANCE", featureCode: "invoices", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "FINANCE", featureCode: "payables", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "FINANCE", featureCode: "reconciliation", canView: true, canEdit: true, canApprove: true },
        { moduleCode: "FINANCE", featureCode: "reports", canView: true, canApprove: true },
        { moduleCode: "TMS", featureCode: "bookings", canView: true },
        { moduleCode: "TMS", featureCode: "dispatch", canView: true },
      ],
    },
    {
      roleId: "role-el001-senior-accountant",
      grants: [
        { moduleCode: "FINANCE", featureCode: "invoices", canView: true, canCreate: true, canEdit: true },
        { moduleCode: "FINANCE", featureCode: "payables", canView: true, canCreate: true, canEdit: true },
        { moduleCode: "FINANCE", featureCode: "reconciliation", canView: true, canEdit: true },
        { moduleCode: "FINANCE", featureCode: "reports", canView: true },
        { moduleCode: "TMS", featureCode: "bookings", canView: true },
      ],
    },
    {
      roleId: "role-el001-finance-executive",
      grants: [
        { moduleCode: "FINANCE", featureCode: "invoices", canView: true, canCreate: true, canEdit: true },
        { moduleCode: "FINANCE", featureCode: "payables", canView: true, canCreate: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "bookings", canView: true },
      ],
    },
    {
      roleId: "role-el001-procurement-manager",
      grants: [
        { moduleCode: "PROCUREMENT", featureCode: "vendors", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "PROCUREMENT", featureCode: "rfq_rfi", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "PROCUREMENT", featureCode: "auctions", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "PROCUREMENT", featureCode: "contracts", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "PROCUREMENT", featureCode: "disputes", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "TMS", featureCode: "bookings", canView: true },
        { moduleCode: "TMS", featureCode: "dispatch", canView: true },
      ],
    },
    {
      roleId: "role-el001-fleet-manager",
      grants: [
        { moduleCode: "FLEET", featureCode: "vehicles", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "FLEET", featureCode: "drivers", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "FLEET", featureCode: "maintenance", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "FLEET", featureCode: "fuel", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "FLEET", featureCode: "tyres", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "TMS", featureCode: "bookings", canView: true },
        { moduleCode: "TMS", featureCode: "dispatch", canView: true, canEdit: true },
      ],
    },
    {
      roleId: "role-el001-garage-manager",
      grants: [
        { moduleCode: "FLEET", featureCode: "vehicles", canView: true, canEdit: true },
        { moduleCode: "FLEET", featureCode: "maintenance", canView: true, canCreate: true, canEdit: true, canApprove: true },
        { moduleCode: "FLEET", featureCode: "fuel", canView: true, canEdit: true },
        { moduleCode: "FLEET", featureCode: "tyres", canView: true, canEdit: true },
      ],
    },
    {
      roleId: "role-el001-customer-user",
      grants: [
        { moduleCode: "TMS", featureCode: "bookings", canView: true, canCreate: true },
        { moduleCode: "FINANCE", featureCode: "invoices", canView: true },
      ],
    },
    {
      roleId: "role-el001-vendor-user",
      grants: [
        { moduleCode: "PROCUREMENT", featureCode: "vendors", canView: true },
        { moduleCode: "PROCUREMENT", featureCode: "contracts", canView: true },
        { moduleCode: "PROCUREMENT", featureCode: "disputes", canView: true, canCreate: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "dispatch", canView: true, canEdit: true },
      ],
    },
    {
      roleId: "role-el001-driver-user",
      grants: [
        { moduleCode: "TMS", featureCode: "dispatch", canView: true, canEdit: true },
        { moduleCode: "TMS", featureCode: "exceptions", canView: true, canCreate: true, canEdit: true },
        { moduleCode: "FLEET", featureCode: "drivers", canView: true },
      ],
    },
  ];

  const retainedEnterpriseRoles = enterpriseRoles.filter((role) => retainedEnterpriseRoleNames.has(role.name));
  const retainedEnterpriseRoleIds = new Set(retainedEnterpriseRoles.map((role) => role.id));

  const enterprisePermissions = permissionTemplates
    .filter((template) => retainedEnterpriseRoleIds.has(template.roleId))
    .flatMap((template) =>
    template.grants.map((grant, index) => ({
      id: `perm-${tenantId}-${template.roleId}-${index}`,
      tenantId,
      roleId: template.roleId,
      moduleCode: grant.moduleCode,
      featureCode: grant.featureCode,
      canView: grant.canView ?? false,
      canCreate: grant.canCreate ?? false,
      canEdit: grant.canEdit ?? false,
      canDelete: grant.canDelete ?? false,
      canApprove: grant.canApprove ?? false,
    })),
  );

  const buildUser = (input: {
    id: string;
    name: string;
    email: string;
    roleId: string;
    userType?: UserType;
    orgUnitIds?: string[];
    linkedVendorId?: string | null;
    linkedCustomerId?: string | null;
    linkedDriverId?: string | null;
    driverName?: string;
    driverCode?: string;
  }): UserRecord => ({
    id: input.id,
    tenantId,
    name: input.name,
    email: input.email,
    userType: input.userType ?? "INTERNAL",
    roleId: input.roleId,
    orgUnitIds: input.userType === "INTERNAL" || !input.userType ? input.orgUnitIds ?? [] : [],
    linkedVendorId: input.linkedVendorId ?? null,
    linkedCustomerId: input.linkedCustomerId ?? null,
    linkedDriverId: input.linkedDriverId ?? null,
    driverName: input.driverName ?? "",
    driverCode: input.driverCode ?? "",
    status: "active",
    lastActive: new Date("2026-05-17T09:00:00Z").toISOString(),
  });

  const enterpriseUsers: UserRecord[] = [
    buildUser({
      id: "user-el001-tenant-admin",
      name: "Nisha Kapoor",
      email: "admin@easylane.optimile.co",
      roleId: "role-el001-tenant-admin",
      orgUnitIds: [],
    }),
    buildUser({
      id: "user-el001-system-coordinator",
      name: "Arjun Mehta",
      email: "coordinator@easylane.optimile.co",
      roleId: "role-el001-system-coordinator",
      orgUnitIds: [],
    }),
    buildUser({
      id: "user-el001-coo",
      name: "Sandeep Iyer",
      email: "coo@easylane.optimile.co",
      roleId: "role-el001-operations-head",
      orgUnitIds: [],
    }),
    buildUser({
      id: "user-el001-regional-manager",
      name: "Priya Sharma",
      email: "regional.manager@easylane.optimile.co",
      roleId: "role-el001-regional-manager",
      orgUnitIds: primaryRegionId ? [primaryRegionId] : pickOrgUnitIds(regionLevelId),
    }),
    buildUser({
      id: "user-el001-regional-manager-2",
      name: "Vikram Rao",
      email: "regional.manager.2@easylane.optimile.co",
      roleId: "role-el001-regional-manager",
      orgUnitIds: secondaryRegionId ? [secondaryRegionId] : primaryRegionId ? [primaryRegionId] : pickOrgUnitIds(regionLevelId),
    }),
    buildUser({
      id: "user-el001-ops-manager",
      name: "Kunal Deshmukh",
      email: "ops.manager@easylane.optimile.co",
      roleId: "role-el001-operations-manager",
      orgUnitIds: regionOneBranchOneId ? [regionOneBranchOneId] : pickOrgUnitIds(branchLevelId),
    }),
    buildUser({
      id: "user-el001-ops-manager-2",
      name: "Aarti Nair",
      email: "ops.manager.2@easylane.optimile.co",
      roleId: "role-el001-operations-manager",
      orgUnitIds: regionOneBranchTwoId ? [regionOneBranchTwoId] : regionOneBranchOneId ? [regionOneBranchOneId] : pickOrgUnitIds(branchLevelId),
    }),
    buildUser({
      id: "user-el001-ops-manager-3",
      name: "Neeraj Singh",
      email: "ops.manager.3@easylane.optimile.co",
      roleId: "role-el001-operations-manager",
      orgUnitIds: regionTwoBranchOneId ? [regionTwoBranchOneId] : regionOneBranchOneId ? [regionOneBranchOneId] : pickOrgUnitIds(branchLevelId),
    }),
    buildUser({
      id: "user-el001-ops-manager-4",
      name: "Farhan Ali",
      email: "ops.manager.4@easylane.optimile.co",
      roleId: "role-el001-operations-manager",
      orgUnitIds: regionTwoBranchTwoId ? [regionTwoBranchTwoId] : regionTwoBranchOneId ? [regionTwoBranchOneId] : pickOrgUnitIds(branchLevelId),
    }),
    buildUser({
      id: "user-el001-dispatch-supervisor",
      name: "Neeraj Singh",
      email: "dispatch@easylane.optimile.co",
      roleId: "role-el001-dispatch-supervisor",
      orgUnitIds: regionOneBranchOneId ? [regionOneBranchOneId] : pickOrgUnitIds(branchLevelId),
    }),
    buildUser({
      id: "user-el001-ground-supervisor",
      name: "Deepak Yadav",
      email: "ground.supervisor@easylane.optimile.co",
      roleId: "role-el001-ground-supervisor",
      orgUnitIds: regionTwoBranchOneId ? [regionTwoBranchOneId] : pickOrgUnitIds(branchLevelId),
    }),
    buildUser({ id: "user-el001-finance-manager", name: "Meera Shah", email: "finance.manager@easylane.optimile.co", roleId: "role-el001-finance-manager", orgUnitIds: pickOrgUnitIds(rootLevelId) }),
    buildUser({ id: "user-el001-senior-accountant", name: "Varun Jain", email: "accounts.senior@easylane.optimile.co", roleId: "role-el001-senior-accountant", orgUnitIds: pickOrgUnitIds(branchLevelId) }),
    buildUser({ id: "user-el001-finance-exec", name: "Pooja Gupta", email: "accounts@easylane.optimile.co", roleId: "role-el001-finance-executive", orgUnitIds: pickOrgUnitIds(branchLevelId) }),
    buildUser({ id: "user-el001-procurement-manager", name: "Akash Bansal", email: "procurement@easylane.optimile.co", roleId: "role-el001-procurement-manager", orgUnitIds: pickOrgUnitIds(rootLevelId) }),
    buildUser({ id: "user-el001-fleet-manager", name: "Manish Rathore", email: "fleet.manager@easylane.optimile.co", roleId: "role-el001-fleet-manager", orgUnitIds: pickOrgUnitIds(rootLevelId) }),
    buildUser({ id: "user-el001-garage-manager", name: "Ravi Chauhan", email: "garage.manager@easylane.optimile.co", roleId: "role-el001-garage-manager", orgUnitIds: pickOrgUnitIds(branchLevelId) }),
    ...(firstCustomer
      ? [
          buildUser({
            id: "user-el001-customer-user",
            name: `${firstCustomer.name} Portal User`,
            email: "customer.user@acc.optimile.co",
            roleId: "role-el001-customer-user",
            userType: "CUSTOMER",
            linkedCustomerId: firstCustomer.id,
          }),
        ]
      : []),
    ...(firstVendor
      ? [
          buildUser({
            id: "user-el001-vendor-user",
            name: `${firstVendor.name} Vendor User`,
            email: "vendor.user@vendor.optimile.co",
            roleId: "role-el001-vendor-user",
            userType: "VENDOR",
            linkedVendorId: firstVendor.id,
          }),
        ]
      : []),
    buildUser({
      id: "user-el001-driver-user",
      name: firstDriver?.name ?? "Driver User",
      email: "driver.user@driver.optimile.co",
      roleId: "role-el001-driver-user",
      userType: "DRIVER",
      linkedDriverId: firstDriver?.id ?? null,
      driverName: firstDriver?.name ?? "Driver User",
      driverCode: firstDriver?.licenseNumber ? firstDriver.licenseNumber.slice(-6) : "DRV001",
    }),
  ].filter((user) => retainedEnterpriseRoleIds.has(user.roleId));

  const nextTenant = {
    ...tenant,
    tenantType: "LOGISTICS_PROVIDER_3PL" as const,
    customerPortalEnabled: true,
    assignmentMode: "CONTROLLED_3PL_FLOW" as const,
    commercialMode: "BUY_SELL_MARGIN" as const,
    enabledModuleCodes: tenant.enabledModuleCodes,
    primaryAdminUserId: "user-el001-tenant-admin",
    health: {
      ...tenant.health,
      activeUsers: enterpriseUsers.length,
    },
  };
  const normalizedEnterpriseRoles = retainedEnterpriseRoles.map((role) => {
    const template = buildBrdDefaultRoleTemplate(nextTenant, role);
    return template
      ? {
          ...role,
          moduleCodes: template.moduleCodes,
          dataScope: template.dataScope,
          roleAccess: template.roleAccess,
        }
      : role;
  });
  return {
    ...params,
    platformTenants: params.platformTenants.map((item) => (item.id === tenantId ? nextTenant : item)),
    roles: [
      ...params.roles.filter((role) => role.tenantId !== tenantId),
      ...normalizedEnterpriseRoles,
    ],
    users: [
      ...params.users.filter((user) => user.tenantId !== tenantId),
      ...enterpriseUsers,
    ],
    rolePermissions: [
      ...params.rolePermissions.filter((permission) => permission.tenantId !== tenantId),
      ...enterprisePermissions,
    ],
  };
}

function getActiveModuleMap(modules: PlatformModule[]) {
  return new Map(
    modules
      .filter((module) => module.status === "active")
      .flatMap((module) => [
        [module.code, module] as const,
        [normalizeModuleKey(module.code), module] as const,
      ]),
  );
}

function getModuleFeatureMap(moduleFeatures: Capability[]) {
  return new Map(
    moduleFeatures.map((moduleFeature) => [
      `${normalizeModuleKey(moduleFeature.moduleCode)}::${moduleFeature.code}`,
      moduleFeature,
    ]),
  );
}

function areRoleModulesEnabled(role: RoleDefinition, enabledModuleCodes: string[]) {
  const enabledSet = new Set(enabledModuleCodes);
  const normalizedRoleModules = normalizeModuleKeys(role.moduleCodes);
  return normalizedRoleModules.length > 0 && normalizedRoleModules.every((moduleCode) => enabledSet.has(moduleCode));
}

function inferRoleModulesFromPermissions(
  roleId: string,
  permissions: RolePermission[],
  tenantEnabledModules: string[],
) {
  const moduleCodes = Array.from(
    new Set(
      permissions
        .filter((permission) => permission.roleId === roleId)
        .map((permission) => normalizeModuleKey(permission.moduleCode))
        .filter(Boolean),
    ),
  );
  return moduleCodes.length ? moduleCodes : normalizeModuleKeys(tenantEnabledModules).slice(0, 1);
}

type LegacyGlobalCustomer = {
  id: string;
  name: string;
  legalName?: string;
  code?: string;
  gstNumber?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

type LegacyGlobalVendor = {
  id: string;
  name: string;
  legalName?: string;
  code?: string;
  gstNumber?: string;
  vendorType?: string;
  contactPerson?: string;
  contactNumber?: string;
  email?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

type LegacyTenantCustomer = {
  id: string;
  tenantId: string;
  customerId?: string;
  status: "active" | "inactive";
  enabledAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type LegacyTenantVendor = {
  id: string;
  tenantId: string;
  vendorId?: string;
  status: "active" | "inactive";
  enabledAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

function getLegacyAddressTypes(addressType: TenantCustomerAddress["addressType"]): CustomerAddressTag[] {
  if (addressType === "both") {
    return ["Consignor", "Consignee"];
  }
  if (addressType === "consignee") {
    return ["Consignee"];
  }
  return ["Consignor"];
}

function normalizeAddressUsage(
  usage?: TenantCustomerAddress["addressUsage"],
  addressType?: TenantCustomerAddress["addressType"],
) {
  if (usage === "ORIGIN" || usage === "DESTINATION" || usage === "BOTH") {
    return usage;
  }
  if (addressType === "consignee") {
    return "DESTINATION" as const;
  }
  if (addressType === "consignor") {
    return "ORIGIN" as const;
  }
  return "BOTH" as const;
}

function deriveLegacyAddressType(addressTypes: CustomerAddressTag[]): TenantCustomerAddress["addressType"] {
  const typeSet = new Set(addressTypes);
  if (typeSet.has("Consignor") && typeSet.has("Consignee")) {
    return "both";
  }
  if (typeSet.has("Consignee")) {
    return "consignee";
  }
  return "consignor";
}

function normalizeCustomerAddressMasterEntry(
  address: CustomerAddressMasterEntry,
): CustomerAddressMasterEntry {
  const line1 = address.line1.trim();
  const line2 = address.line2?.trim() || undefined;
  const city = address.city.trim();
  const state = address.state.trim();
  const pincode = address.pincode.trim();
  return {
    id: address.id,
    addressCode: address.addressCode?.trim() || undefined,
    type: Array.from(new Set((address.type ?? []).filter(Boolean))),
    consigneeId: address.consigneeId?.trim() || undefined,
    consigneeName: address.consigneeName?.trim() || undefined,
    operationalAddressType: address.operationalAddressType ?? "PRIMARY",
    addressUsage: normalizeAddressUsage(address.addressUsage),
    contactCode: address.contactCode?.trim() || undefined,
    name: address.name.trim(),
    addressLabel: address.addressLabel?.trim() || undefined,
    fullAddress:
      address.fullAddress?.trim() ||
      [line1, line2, city, state, pincode].filter(Boolean).join(", "),
    line1,
    line2,
    city,
    state,
    country: address.country?.trim() || undefined,
    pincode,
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
    gstin: address.gstin?.trim().toUpperCase() || undefined,
    contactPerson: address.contactPerson?.trim() || undefined,
    contactNumber: address.contactNumber?.trim() || undefined,
    emailId: address.emailId?.trim().toLowerCase() || undefined,
    isActive: address.isActive ?? true,
    isTemporary: address.isTemporary ?? false,
    remarks: address.remarks?.trim() || undefined,
  };
}

function normalizeCustomerUOMOverrideEntry(
  override: NonNullable<TenantCustomer["uomOverrides"]>[number],
) {
  return {
    id: override.id,
    quantityUOM: override.quantityUOM.trim().toUpperCase(),
    weightUOM: override.weightUOM.trim().toUpperCase(),
    conversionValue: Number(override.conversionValue) || 0,
    status: override.status ?? "active",
  } satisfies NonNullable<TenantCustomer["uomOverrides"]>[number];
}

function normalizeTenantUOMDefinition(definition: TenantUOMDefinition): TenantUOMDefinition {
  return {
    ...definition,
    code: definition.code.trim().toUpperCase(),
    label: definition.label.trim(),
    isCustom: definition.isCustom ?? false,
    status: definition.status ?? "active",
  };
}

function normalizeTenantUOMMapping(mapping: TenantUOMMapping): TenantUOMMapping {
  return {
    ...mapping,
    quantityUOM: mapping.quantityUOM.trim().toUpperCase(),
    weightUOM: mapping.weightUOM.trim().toUpperCase(),
    conversionValue: Number(mapping.conversionValue) || 0,
    status: mapping.status ?? "active",
  };
}

function normalizeTenantMaterial(material: TenantMaterial): TenantMaterial {
  const quantityUOM = (material.quantityUOM ?? material.uom).trim().toUpperCase();
  return {
    ...material,
    uom: quantityUOM,
    quantityUOM,
    defaultWeightUOM: material.defaultWeightUOM?.trim().toUpperCase() || "KG",
    conversionValue: material.conversionValue ?? null,
  };
}

function buildCustomerAddressMasterFromRecord(address: TenantCustomerAddress): CustomerAddressMasterEntry {
  return normalizeCustomerAddressMasterEntry({
    id: address.id,
    addressCode: address.addressCode,
    type:
      address.addressTypes && address.addressTypes.length
        ? address.addressTypes
        : getLegacyAddressTypes(address.addressType),
    consigneeId: address.consigneeId,
    consigneeName: address.consigneeName,
    operationalAddressType: address.operationalAddressType ?? "PRIMARY",
    addressUsage: normalizeAddressUsage(address.addressUsage, address.addressType),
    contactCode: address.contactCode,
    name: address.addressName,
    addressLabel: address.addressLabel ?? address.addressName,
    fullAddress: address.fullAddress,
    line1: address.addressLine1,
    line2: address.addressLine2,
    city: address.city,
    state: address.state,
    country: address.country,
    pincode: address.pincode,
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
    gstin: address.gstin,
    contactPerson: address.contactPersonName ?? address.contactPerson,
    contactNumber: address.phone ?? address.contactNumber,
    emailId: address.email ?? address.emailId,
    isActive: address.status === "active",
    isTemporary: address.isTemporary ?? false,
    remarks: address.remarks,
  });
}

function buildFallbackCustomerAddress(customer: Pick<TenantCustomer, "id" | "billingAddress" | "name" | "gstin" | "gstNumber">): CustomerAddressMasterEntry | null {
  if (!customer.billingAddress?.trim()) {
    return null;
  }
  return normalizeCustomerAddressMasterEntry({
    id: `legacy-billing-${customer.id}`,
    addressCode: "CUSTADDR-0001",
    type: ["Billing"],
    contactCode: "",
    name: `${customer.name} Billing Address`,
    line1: customer.billingAddress,
    line2: "",
    city: "Pending",
    state: "Pending",
    country: "India",
    pincode: "000000",
    gstin: customer.gstin ?? customer.gstNumber,
    contactPerson: "",
    contactNumber: "",
    emailId: "",
  });
}

function syncCustomerAddresses(
  customers: TenantCustomer[],
  addressRecords: TenantCustomerAddress[],
): TenantCustomer[] {
  return customers.map((customer) => {
    const mappedAddresses = addressRecords
      .filter((address) => address.tenantCustomerId === customer.id)
      .map((address) => buildCustomerAddressMasterFromRecord(address));
    const fallbackAddress = mappedAddresses.length
      ? null
      : buildFallbackCustomerAddress(customer);

    return {
      ...customer,
      addresses: mappedAddresses.length ? mappedAddresses : fallbackAddress ? [fallbackAddress] : [],
    };
  });
}

function normalizeStoredTenantCustomers(
  storedCustomers: Array<TenantCustomer | LegacyTenantCustomer>,
  legacyCustomers: LegacyGlobalCustomer[],
) {
  return storedCustomers.map((customer) => {
    if ("name" in customer) {
      return {
        ...customer,
        tier: customer.tier ?? "Standard",
        gstin: customer.gstin ?? customer.gstNumber,
        preferredVehicleTypes: customer.preferredVehicleTypes ?? [],
        communicationChannel: customer.communicationChannel ?? "Email",
        defaultPaymentMode: customer.defaultPaymentMode ?? "Bank Transfer",
        allowAutoBooking: customer.allowAutoBooking ?? false,
        rateMatchingBasis: customer.rateMatchingBasis ?? "LANE_TO_LANE",
        addresses: (customer.addresses ?? []).map((address) =>
          normalizeCustomerAddressMasterEntry(address),
        ),
        uomOverrides: (customer.uomOverrides ?? []).map((override) =>
          normalizeCustomerUOMOverrideEntry(override),
        ),
        setupStatus: customer.setupStatus ?? "BASIC_COMPLETED",
        setupProgress: {
          basicDetailsCompleted: customer.setupProgress?.basicDetailsCompleted ?? true,
          contactsCompleted: customer.setupProgress?.contactsCompleted ?? false,
          creditBillingCompleted: customer.setupProgress?.creditBillingCompleted ?? false,
          contractsCompleted: customer.setupProgress?.contractsCompleted ?? false,
          preferencesCompleted: customer.setupProgress?.preferencesCompleted ?? false,
        } satisfies CustomerSetupProgress,
      };
    }

    const legacyCustomer = legacyCustomers.find(
      (item) => item.id === (customer as TenantCustomer & { customerId?: string }).customerId,
    );

    return {
      id: customer.id,
      tenantId: customer.tenantId,
      name: legacyCustomer?.name ?? "Imported Customer",
      legalName: legacyCustomer?.legalName,
      tier: "Standard",
      code: legacyCustomer?.code,
      gstin: legacyCustomer?.gstNumber,
      gstNumber: legacyCustomer?.gstNumber,
      preferredVehicleTypes: [],
      communicationChannel: "Email",
      defaultPaymentMode: "Bank Transfer",
      allowAutoBooking: false,
      rateMatchingBasis: "LANE_TO_LANE" as const,
      addresses: [],
      uomOverrides: [],
      setupStatus: "BASIC_COMPLETED" as CustomerSetupStatus,
      setupProgress: {
        basicDetailsCompleted: true,
        contactsCompleted: false,
        creditBillingCompleted: false,
        contractsCompleted: false,
        preferencesCompleted: false,
      } satisfies CustomerSetupProgress,
      status: customer.status,
      createdAt:
        (customer as TenantCustomer & { enabledAt?: string }).createdAt ??
        (customer as TenantCustomer & { enabledAt?: string }).enabledAt ??
        legacyCustomer?.createdAt ??
        new Date().toISOString(),
      updatedAt:
        (customer as TenantCustomer & { enabledAt?: string }).updatedAt ??
        legacyCustomer?.updatedAt ??
        new Date().toISOString(),
    };
  });
}

function normalizeStoredTenantCustomerAddresses(
  storedAddresses: TenantCustomerAddress[],
  customers: TenantCustomer[],
) {
  const normalizedStored = storedAddresses.map((address) => ({
    ...address,
    customerId: address.customerId ?? address.tenantCustomerId,
    addressCode: address.addressCode?.trim() || undefined,
    addressLabel: address.addressLabel?.trim() || address.addressName?.trim() || undefined,
    fullAddress:
      address.fullAddress?.trim() ||
      [address.addressLine1?.trim(), address.addressLine2?.trim(), address.city?.trim(), address.state?.trim(), address.pincode?.trim()]
        .filter(Boolean)
        .join(", "),
    addressTypes:
      address.addressTypes && address.addressTypes.length
        ? Array.from(new Set(address.addressTypes.filter(Boolean)))
        : getLegacyAddressTypes(address.addressType),
    consigneeId: address.consigneeId?.trim() || undefined,
    consigneeName: address.consigneeName?.trim() || undefined,
    operationalAddressType: address.operationalAddressType ?? "PRIMARY",
    addressUsage: normalizeAddressUsage(address.addressUsage, address.addressType),
    gstin: address.gstin?.trim().toUpperCase() || undefined,
    contactPersonName: address.contactPersonName?.trim() || address.contactPerson?.trim() || undefined,
    contactPerson: address.contactPerson?.trim() || address.contactPersonName?.trim() || undefined,
    phone: address.phone?.trim() || address.contactNumber?.trim() || undefined,
    contactNumber: address.contactNumber?.trim() || address.phone?.trim() || undefined,
    email: address.email?.trim().toLowerCase() || address.emailId?.trim().toLowerCase() || undefined,
    emailId: address.emailId?.trim().toLowerCase() || address.email?.trim().toLowerCase() || undefined,
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
    isTemporary: address.isTemporary ?? false,
    remarks: address.remarks?.trim() || undefined,
  }));
  const generatedFromBilling = customers
    .filter(
      (customer) =>
        !normalizedStored.some((address) => address.tenantCustomerId === customer.id) &&
        Boolean(customer.billingAddress?.trim()),
    )
    .map((customer) => ({
      id: `customer-address-legacy-${customer.id}`,
      tenantId: customer.tenantId,
      tenantCustomerId: customer.id,
      customerId: customer.id,
      addressCode: "CUSTADDR-0001",
      addressType: "consignor" as const,
      addressTypes: ["Billing"] as CustomerAddressTag[],
      operationalAddressType: "PRIMARY" as const,
      addressUsage: "BOTH" as const,
      addressName: `${customer.name} Billing Address`,
      addressLabel: "Billing Address",
      fullAddress: customer.billingAddress?.trim() ?? "",
      gstin: customer.gstin ?? customer.gstNumber,
      contactCode: undefined,
      contactPersonName: customer.primaryContactName,
      contactPerson: customer.primaryContactName,
      phone: customer.primaryContactPhone,
      contactNumber: customer.primaryContactPhone,
      email: customer.primaryContactEmail,
      emailId: customer.primaryContactEmail,
      addressLine1: customer.billingAddress?.trim() ?? "",
      addressLine2: "",
      landmark: "",
      city: "Pending",
      state: "Pending",
      country: "India",
      pincode: "000000",
      latitude: null,
      longitude: null,
      isDefault: true,
      status: "active" as const,
      isTemporary: false,
      remarks: undefined,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    }));

  return [...generatedFromBilling, ...normalizedStored];
}

function normalizeStoredTenantCustomerRateCard(rateCard: TenantCustomerRateCard): TenantCustomerRateCard {
  const normalizedRateType =
    rateCard.rateType === "FIXED"
      ? "PER_TRIP"
      : rateCard.rateType === "PER_TON"
        ? "PER_MT"
        : rateCard.rateType;
  const resolvedRate = Number(rateCard.rate ?? rateCard.baseRate ?? rateCard.underloadRate ?? 0) || 0;
  const resolvedFromLocation = rateCard.fromLocation?.trim() || rateCard.sourcePincode;
  const resolvedToLocation = rateCard.toLocation?.trim() || rateCard.destinationPincode;

  return {
    ...rateCard,
    lanes: rateCard.lanes?.trim() || `${resolvedFromLocation} -> ${resolvedToLocation}`,
    fromCity: rateCard.fromCity?.trim() || resolvedFromLocation,
    toCity: rateCard.toCity?.trim() || resolvedToLocation,
    fromLocation: resolvedFromLocation,
    toLocation: resolvedToLocation,
    sourcePincode: rateCard.sourcePincode?.trim() || "",
    destinationPincode: rateCard.destinationPincode?.trim() || "",
    rateType: normalizedRateType,
    vehicleType: rateCard.vehicleType?.trim() || null,
    underloadRate: Number(rateCard.underloadRate ?? rateCard.baseRate ?? rateCard.rate ?? 0) || 0,
    overloadRate:
      rateCard.overloadRate == null
        ? null
        : Number(rateCard.overloadRate) || null,
    tat: rateCard.tat?.trim() || rateCard.transitTime?.trim() || undefined,
    baseRate: Number(rateCard.baseRate ?? rateCard.underloadRate ?? rateCard.rate ?? 0) || resolvedRate,
    rate: resolvedRate,
    minLoad: rateCard.minLoad ?? null,
    maxLoad: rateCard.maxLoad ?? null,
    transitTime: rateCard.transitTime?.trim() || rateCard.tat?.trim() || undefined,
    effectiveFromDate: rateCard.effectiveFromDate?.trim() || undefined,
    effectiveToDate: rateCard.effectiveToDate?.trim() || undefined,
    remarks: rateCard.remarks?.trim() || undefined,
  };
}

function normalizeStoredTenantVendorRateCard(rateCard: TenantVendorRateCard): TenantVendorRateCard {
  const normalizedRateType =
    rateCard.rateType === "PER_KM" ? "PER_KM" : rateCard.rateType === "PER_MT" ? "PER_MT" : "PER_TRIP";
  const resolvedRate = Number(rateCard.rate ?? rateCard.buyingRate ?? rateCard.underloadRate ?? 0) || 0;
  const resolvedFromLocation = rateCard.fromLocation?.trim() || rateCard.sourcePincode;
  const resolvedToLocation = rateCard.toLocation?.trim() || rateCard.destinationPincode;

  return {
    ...rateCard,
    contractName: rateCard.contractName?.trim() || undefined,
    contractCode: rateCard.contractCode?.trim() || undefined,
    effectiveFromDate: rateCard.effectiveFromDate?.trim() || undefined,
    effectiveToDate: rateCard.effectiveToDate?.trim() || undefined,
    lanes: rateCard.lanes?.trim() || `${resolvedFromLocation} -> ${resolvedToLocation}`,
    fromCity: rateCard.fromCity?.trim() || resolvedFromLocation,
    toCity: rateCard.toCity?.trim() || resolvedToLocation,
    fromLocation: resolvedFromLocation,
    toLocation: resolvedToLocation,
    sourcePincode: rateCard.sourcePincode?.trim() || "",
    destinationPincode: rateCard.destinationPincode?.trim() || "",
    rateType: normalizedRateType,
    vehicleType: rateCard.vehicleType?.trim() || null,
    buyingRate: Number(rateCard.buyingRate ?? rateCard.underloadRate ?? rateCard.rate ?? 0) || resolvedRate,
    underloadRate: Number(rateCard.underloadRate ?? rateCard.buyingRate ?? rateCard.rate ?? 0) || resolvedRate,
    overloadRate: rateCard.overloadRate == null ? null : Number(rateCard.overloadRate) || null,
    tat: rateCard.tat?.trim() || undefined,
    rate: resolvedRate,
    remarks: rateCard.remarks?.trim() || undefined,
  };
}

function getHighestCustomerAddressSequence(addresses: TenantCustomerAddress[]) {
  const sequences = addresses.flatMap((address) =>
    [address.addressCode, address.contactCode]
      .map((value) => {
        const match = value?.match(/(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .filter((value) => Number.isFinite(value)),
  );
  return sequences.length ? Math.max(...sequences) : 0;
}

function formatCustomerAddressCode(prefix: string, sequence: number) {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

function deriveCustomerSetupStatus(addressCount: number, rateCardCount: number): CustomerSetupStatus {
  if (addressCount > 0 && rateCardCount > 0) {
    return "FULLY_CONFIGURED";
  }
  if (addressCount > 0) {
    return "RATE_CARD_PENDING";
  }
  return "ADDRESS_PENDING";
}

function normalizeStoredTenantVendors(
  storedVendors: Array<TenantVendor | LegacyTenantVendor>,
  legacyVendors: LegacyGlobalVendor[],
) {
  return storedVendors.map((vendor) => {
    if ("name" in vendor) {
      return {
        ...vendor,
        gstin: vendor.gstin ?? vendor.gstNumber,
        gstNumber: vendor.gstNumber ?? vendor.gstin,
        phone: vendor.phone ?? vendor.contactNumber,
        contactNumber: vendor.contactNumber ?? vendor.phone,
        serviceableLocations: vendor.serviceableLocations ?? [],
        supportedVehicleTypes: vendor.supportedVehicleTypes ?? [],
      };
    }

    const legacyVendor = legacyVendors.find(
      (item) => item.id === (vendor as TenantVendor & { vendorId?: string }).vendorId,
    );

    return {
      id: vendor.id,
      tenantId: vendor.tenantId,
      name: legacyVendor?.name ?? "Imported Vendor",
      legalName: legacyVendor?.legalName,
      code: legacyVendor?.code,
      gstin: legacyVendor?.gstNumber,
      gstNumber: legacyVendor?.gstNumber,
      pan: undefined,
      address: undefined,
      vendorType: legacyVendor?.vendorType,
      contactPerson: legacyVendor?.contactPerson,
      phone: legacyVendor?.contactNumber,
      contactNumber: legacyVendor?.contactNumber,
      email: legacyVendor?.email,
      serviceableLocations: [],
      supportedVehicleTypes: [],
      status: vendor.status,
      createdAt:
        (vendor as TenantVendor & { enabledAt?: string }).createdAt ??
        (vendor as TenantVendor & { enabledAt?: string }).enabledAt ??
        legacyVendor?.createdAt ??
        new Date().toISOString(),
      updatedAt:
        (vendor as TenantVendor & { enabledAt?: string }).updatedAt ??
        legacyVendor?.updatedAt ??
        new Date().toISOString(),
    };
  });
}

function normalizeStoredTenantVehicles(storedVehicles: TenantVehicle[]) {
  return storedVehicles.map((vehicle) => ({
    ...vehicle,
    vendorId: vehicle.vendorId ?? null,
    chassisNo: vehicle.chassisNo?.trim() || undefined,
    odometer: `${vehicle.odometer ?? ""}`.trim(),
    insurance: {
      number: vehicle.insurance?.number?.trim() ?? "",
      expiry: vehicle.insurance?.expiry ?? "",
    },
    fitness: {
      number: vehicle.fitness?.number?.trim() ?? "",
      expiry: vehicle.fitness?.expiry ?? "",
    },
    puc: {
      number: vehicle.puc?.number?.trim() ?? "",
      expiry: vehicle.puc?.expiry ?? "",
    },
    permit: {
      type: vehicle.permit?.type?.trim() ?? "",
      expiry: vehicle.permit?.expiry ?? "",
    },
  }));
}

function normalizeStoredTenantDrivers(storedDrivers: TenantDriver[]) {
  return storedDrivers.map((driver) => ({
    ...driver,
    vendorId: driver.vendorId ?? null,
    assignedVehicleId: driver.assignedVehicleId ?? null,
    photoUrl: driver.photoUrl ?? null,
    endorsements: Array.from(new Set(driver.endorsements ?? [])),
  }));
}

function getDefaultYearFormat(lrType: TenantLRConfig["lrType"]): LRYearFormat {
  return lrType === "AUTO" ? "YYYY" : "NONE";
}

function getDefaultPoolSource(lrType: TenantLRConfig["lrType"]): LRPoolSource {
  if (lrType === "PRE_GENERATED" || lrType === "VENDOR") {
    return "CSV";
  }
  if (lrType === "MANUAL") {
    return "RANGE";
  }
  return "LIST";
}

function parsePoolEntryCount(poolSource: LRPoolSource, rangeStart: string, rangeEnd: string, poolEntries: string) {
  if (poolSource === "RANGE") {
    const start = Number(rangeStart);
    const end = Number(rangeEnd);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      return end - start + 1;
    }
    return 0;
  }

  return poolEntries
    .split(/[\r\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

function normalizeLRAllocationFlowLevel(level: LRAllocationFlowLevel): LRAllocationFlowLevel {
  return {
    levelId: level.levelId,
    canAllocateQuota: level.canAllocateQuota ?? false,
    allocateToLevelIds: Array.from(new Set((level.allocateToLevelIds ?? []).filter(Boolean))),
    canAllocateToCustomer: level.canAllocateToCustomer ?? false,
    customerScope: (level.customerScope ?? "ALL"),
    customerIds: Array.from(new Set((level.customerIds ?? []).filter(Boolean))),
    canRequestQuota: level.canRequestQuota ?? false,
    canApproveRequests: level.canApproveRequests ?? false,
    canConsumeLR: level.canConsumeLR ?? false,
  };
}

function normalizeLRAllocationFlow(
  flow: TenantLRConfig["allocationFlow"],
): LRAllocationFlowConfig | undefined {
  if (!flow) {
    return undefined;
  }

  return {
    mode: (flow.mode ?? "FLAT") as LRAllocationFlowMode,
    requestFlow: (flow.requestFlow ?? "CHILD_TO_PARENT") as LRAllocationRequestFlow,
    approvalFlow: (flow.approvalFlow ?? "PARENT_APPROVES") as LRAllocationApprovalFlow,
    consumptionLevel: (flow.consumptionLevel ?? "TENANT") as LRConsumptionLevel,
    customConsumptionLevelId: flow.customConsumptionLevelId ?? null,
    levels: Array.isArray(flow.levels) ? flow.levels.map((level) => normalizeLRAllocationFlowLevel(level)) : [],
  };
}

function normalizeTenantLRConfig(config: TenantLRConfig): TenantLRConfig {
  const isLegacyLocationConfig =
    !config.scopeType &&
    !config.allocationStrategy &&
    (config.locationOrgUnitId !== undefined || config.locationCounter !== undefined);
  const scopeOrgUnitIds =
    config.scopeOrgUnitIds && config.scopeOrgUnitIds.length
      ? Array.from(new Set(config.scopeOrgUnitIds.filter(Boolean)))
      : config.locationOrgUnitId
        ? [config.locationOrgUnitId]
        : [];
  const lrType = isLegacyLocationConfig ? "AUTO" : config.lrType ?? "AUTO";
  const poolOwnershipType: LRPoolOwnershipType =
    config.poolOwnershipType ??
    (config.vendorId ? "VENDOR" : config.customerId ? "CUSTOMER" : "TENANT");
  const isLegacyOwnedPoolScope =
    config.scopeType === "CUSTOMER" &&
    (lrType === "PRE_GENERATED" || lrType === "VENDOR") &&
    (config.customerId || config.vendorId);
  const scopeType: LRConfigScopeType =
    isLegacyOwnedPoolScope
      ? scopeOrgUnitIds.length
        ? "HIERARCHY"
        : "TENANT"
      : config.scopeType ?? (scopeOrgUnitIds.length ? "HIERARCHY" : "TENANT");
  const poolSource = config.poolSource ?? getDefaultPoolSource(lrType);
  const poolRangeStart = config.poolRangeStart ?? "";
  const poolRangeEnd = config.poolRangeEnd ?? "";
  const poolEntries = config.poolEntries ?? "";
  const derivedPoolCount = parsePoolEntryCount(poolSource, poolRangeStart, poolRangeEnd, poolEntries);
  const locationOrgUnitId = config.locationOrgUnitId ?? scopeOrgUnitIds[0] ?? "";
  const locationCounter = config.locationCounter ?? 0;

  return {
    ...config,
    scopeType,
    scopeOrgUnitIds,
    poolOwnershipType,
    customerId: config.customerId ?? null,
    vendorId: config.vendorId ?? null,
    allocationStrategy: config.allocationStrategy ?? "FLAT",
    prefix: config.prefix.trim().toUpperCase(),
    numberSeparator: config.numberSeparator ?? "-",
    yearFormat: config.yearFormat ?? getDefaultYearFormat(lrType),
    zeroPaddingLength: config.zeroPaddingLength ?? 6,
    customerOwnershipEnabled:
      config.customerOwnershipEnabled ??
      (lrType === "PRE_GENERATED" ? Boolean(config.customerId) : false),
    poolSource,
    ownershipLevelId: config.ownershipLevelId ?? null,
    distributionStrategy: (config.distributionStrategy ?? "DISTRIBUTED") as ManualLRDistributionStrategy,
    workflowMode: (config.workflowMode ?? "APPROVAL_BASED") as ManualLRWorkflowMode,
    numberingPolicy: config.numberingPolicy ?? "STRICT_FORMAT",
    customerLrPolicy: config.customerLrPolicy ?? "NOT_CUSTOMER_SPECIFIC",
    allowCustomerFallback: config.allowCustomerFallback ?? true,
    workflowPermissions: {
      UPLOAD_LR: Array.from(new Set(config.workflowPermissions?.UPLOAD_LR ?? [])),
      ALLOCATE_LR: Array.from(new Set(config.workflowPermissions?.ALLOCATE_LR ?? [])),
      REQUEST_LR: Array.from(new Set(config.workflowPermissions?.REQUEST_LR ?? [])),
      APPROVE_LR: Array.from(new Set(config.workflowPermissions?.APPROVE_LR ?? [])),
      TRANSFER_LR: Array.from(new Set(config.workflowPermissions?.TRANSFER_LR ?? [])),
      CONSUME_LR: Array.from(new Set(config.workflowPermissions?.CONSUME_LR ?? [])),
      VOID_LR: Array.from(new Set(config.workflowPermissions?.VOID_LR ?? [])),
      VIEW_AUDIT: Array.from(new Set(config.workflowPermissions?.VIEW_AUDIT ?? [])),
    },
    workflowPermissionScopes: (config.workflowPermissionScopes ?? []).map((scope) => ({
      scopeLevelId: scope.scopeLevelId ?? null,
      scopeOrgUnitId: scope.scopeOrgUnitId ?? null,
      managedLevelId: scope.managedLevelId ?? null,
      permissions: {
        UPLOAD_LR: Array.from(new Set(scope.permissions?.UPLOAD_LR ?? [])),
        ALLOCATE_LR: Array.from(new Set(scope.permissions?.ALLOCATE_LR ?? [])),
        REQUEST_LR: Array.from(new Set(scope.permissions?.REQUEST_LR ?? [])),
        APPROVE_LR: Array.from(new Set(scope.permissions?.APPROVE_LR ?? [])),
        TRANSFER_LR: Array.from(new Set(scope.permissions?.TRANSFER_LR ?? [])),
        CONSUME_LR: Array.from(new Set(scope.permissions?.CONSUME_LR ?? [])),
        VOID_LR: Array.from(new Set(scope.permissions?.VOID_LR ?? [])),
        VIEW_AUDIT: Array.from(new Set(scope.permissions?.VIEW_AUDIT ?? [])),
      },
    } satisfies ManualLRWorkflowPermissionScope)),
    childGovernanceRules: (config.childGovernanceRules ?? [])
      .filter((rule) => rule.childLevelId)
      .map((rule) => ({
        childLevelId: rule.childLevelId,
        canConsumeParentLr: rule.canConsumeParentLr ?? false,
        childCanRequestLr: rule.childCanRequestLr ?? false,
        childCanConsumeLr: rule.childCanConsumeLr ?? true,
        canMaintainOwnSequence: rule.canMaintainOwnSequence ?? false,
        canDefineChildFormat: rule.canDefineChildFormat ?? false,
        parentCanGenerateLr: rule.parentCanGenerateLr ?? true,
        parentCanAllocateLrToChild: rule.parentCanAllocateLrToChild ?? false,
        canAllocateChildLr: rule.canAllocateChildLr ?? false,
        canApproveChildRequests: rule.canApproveChildRequests ?? false,
        canConfigureChildWorkflow: rule.canConfigureChildWorkflow ?? false,
        canDelegateChildGovernance: rule.canDelegateChildGovernance ?? false,
        inheritParentFormat: rule.inheritParentFormat ?? true,
        formatMode: rule.formatMode ?? "GLOBAL_PARENT_FORMAT",
        allocationRequired: rule.allocationRequired ?? false,
        approvalRequired: rule.approvalRequired ?? false,
        canTransferLr: rule.canTransferLr ?? false,
      } satisfies ManualLRChildGovernanceRule)),
    placeFormatOverrides: (config.placeFormatOverrides ?? [])
      .filter((override) => override.orgUnitId && override.prefix?.trim())
      .map((override) => ({
        orgUnitId: override.orgUnitId,
        prefix: override.prefix.trim().toUpperCase(),
        yearFormat: override.yearFormat ?? config.yearFormat ?? getDefaultYearFormat(lrType),
        numberSeparator: override.numberSeparator ?? config.numberSeparator ?? "-",
        zeroPaddingLength: override.zeroPaddingLength ?? config.zeroPaddingLength ?? 6,
        numberingPolicy: override.numberingPolicy ?? config.numberingPolicy ?? "STRICT_FORMAT",
      })),
    poolRangeStart,
    poolRangeEnd,
    poolEntries,
    poolAvailableCount: config.poolAvailableCount ?? derivedPoolCount,
    poolUsedCount: config.poolUsedCount ?? 0,
    locationOrgUnitId,
    locationCounter,
    allocationFlow: normalizeLRAllocationFlow(config.allocationFlow),
  };
}

function normalizeStoredTenantLRConfigs(storedConfigs: TenantLRConfig[]) {
  const normalizedConfigs = storedConfigs.map((config) => normalizeTenantLRConfig(config));
  const uniqueConfigs = new Map<string, TenantLRConfig>();

  normalizedConfigs.forEach((config) => {
    const key = `${config.tenantId}::${config.lrType}`;
    const existing = uniqueConfigs.get(key);

    if (!existing) {
      uniqueConfigs.set(key, config);
      return;
    }

    const existingUpdatedAt = new Date(existing.updatedAt).getTime();
    const configUpdatedAt = new Date(config.updatedAt).getTime();

    if (Number.isNaN(existingUpdatedAt) || configUpdatedAt >= existingUpdatedAt) {
      uniqueConfigs.set(key, config);
    }
  });

  return Array.from(uniqueConfigs.values());
}

function getLrYearToken(yearFormat: LRYearFormat | undefined) {
  const currentYear = new Date().getFullYear();
  if (yearFormat === "YY") {
    return String(currentYear).slice(-2);
  }
  if (yearFormat === "YYYY") {
    return String(currentYear);
  }
  return "";
}

function buildStoreFormattedLrNumber(
  config: Pick<TenantLRConfig, "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength">,
  sequenceNumber: number,
) {
  const separator = config.numberSeparator ?? "-";
  const prefix = config.prefix.trim().toUpperCase() || "LR";
  const yearToken = getLrYearToken(config.yearFormat);
  const parts = [prefix];
  if (yearToken) {
    parts.push(yearToken);
  }
  parts.push(String(sequenceNumber).padStart(Math.max(config.zeroPaddingLength ?? 6, 1), "0"));
  return parts.join(separator);
}

function resolveStoreLrFormatForOrgUnit(
  config: Pick<TenantLRConfig, "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength" | "numberingPolicy" | "placeFormatOverrides" | "childGovernanceRules"> | null,
  orgUnitId: string | null | undefined,
  orgUnits: OrgUnit[],
) {
  if (!config) {
    return config;
  }
  return resolveManualLrFormatForOrgUnit(config, orgUnitId, orgUnits);
}

function rewritePoolsToOwnerFormat(params: {
  pools: TenantLrPoolRecord[];
  config: Pick<TenantLRConfig, "id" | "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength" | "numberingPolicy" | "placeFormatOverrides" | "childGovernanceRules"> | null;
  ownerLevelId: string | null | undefined;
  orgUnits: OrgUnit[];
  timestamp: string;
}) {
  const { pools, config, ownerLevelId, orgUnits, timestamp } = params;
  if (!config || !ownerLevelId) {
    return pools;
  }
  const format = resolveStoreLrFormatForOrgUnit(config, ownerLevelId, orgUnits);
  if (!format) {
    return pools;
  }
  let sequence = 1;
  return pools.map((pool) => {
    if (
      pool.configId !== config.id ||
      pool.ownerLevelId !== ownerLevelId ||
      pool.status !== "AVAILABLE"
    ) {
      return pool;
    }
    const nextPool = {
      ...pool,
      lrNumber: buildStoreFormattedLrNumber(format, sequence),
      updatedAt: timestamp,
    };
    sequence += 1;
    return nextPool;
  });
}

function formatLrTypeLabel(lrType: TenantLRConfig["lrType"]) {
  return lrType
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function assertUniqueTenantLrTypeConfig(
  configs: TenantLRConfig[],
  tenantId: string,
  lrType: TenantLRConfig["lrType"],
  excludeId?: string,
) {
  const duplicate = configs.find(
    (config) => config.tenantId === tenantId && config.lrType === lrType && config.id !== excludeId,
  );

  if (duplicate) {
    throw new Error(`Only one ${formatLrTypeLabel(lrType)} LR configuration is allowed for this tenant.`);
  }
}

function normalizeTenantLrRequest(record: TenantLrAllocationRequestRecord): TenantLrAllocationRequestRecord {
  const createdAt = record.createdAt ?? new Date().toISOString();
  return {
    ...record,
    tenantId: record.tenantId,
    sourceOrgUnitId: record.sourceOrgUnitId ?? null,
    targetOrgUnitId: record.targetOrgUnitId ?? null,
    sourceUserId: record.sourceUserId ?? null,
    targetUserId: record.targetUserId ?? null,
    lrType: record.lrType ?? "MANUAL",
    configId: record.configId ?? null,
    customerId: record.customerId ?? null,
    branchName: record.branchName ?? null,
    branchCode: record.branchCode ?? null,
    lastSequenceNumber: record.lastSequenceNumber ?? null,
    requestedCount: Number(record.requestedCount ?? 0),
    approvedCount: Number(record.approvedCount ?? 0),
    status: record.status ?? "PENDING",
    createdAt,
    updatedAt: record.updatedAt ?? createdAt,
    decidedAt: record.decidedAt ?? null,
    note: record.note ?? null,
    rejectionReason: record.rejectionReason ?? null,
  };
}

function normalizeTenantLrTransfer(record: TenantLrTransferRecord): TenantLrTransferRecord {
  const createdAt = record.createdAt ?? new Date().toISOString();
  return {
    ...record,
    tenantId: record.tenantId,
    fromOrgUnitId: record.fromOrgUnitId ?? null,
    toOrgUnitId: record.toOrgUnitId ?? null,
    fromUserId: record.fromUserId ?? null,
    toUserId: record.toUserId ?? null,
    lrType: record.lrType ?? "MANUAL",
    customerId: record.customerId ?? null,
    configId: record.configId ?? null,
    lrIds: Array.from(new Set((record.lrIds ?? []).filter(Boolean))),
    status: record.status ?? "PENDING",
    createdAt,
    updatedAt: record.updatedAt ?? createdAt,
    completedAt: record.completedAt ?? null,
    note: record.note ?? null,
  };
}

function normalizeStoredTenantLrRequests(storedRequests: TenantLrAllocationRequestRecord[]) {
  return storedRequests.map((record) => normalizeTenantLrRequest(record));
}

function normalizeStoredTenantLrTransfers(storedTransfers: TenantLrTransferRecord[]) {
  return storedTransfers.map((record) => normalizeTenantLrTransfer(record));
}

function buildTrackingId(bookingId: string, deliveryNo: number) {
  const bookingSuffix = bookingId.replace(/[^A-Z0-9]/gi, "").slice(-6).toUpperCase();
  return `TRK-${bookingSuffix}-${String(deliveryNo).padStart(2, "0")}`;
}

function normalizeBookingDeliveries(booking: BookingRecord) {
  if (Array.isArray(booking.deliveries) && booking.deliveries.length) {
    return booking.deliveries.map((delivery, index) => ({
      ...delivery,
      deliveryNo: delivery.deliveryNo ?? index + 1,
      trackingId: delivery.trackingId?.trim() || buildTrackingId(booking.bookingId, index + 1),
      originAddressId: delivery.originAddressId || booking.sourceAddressId,
      destinationAddressId: delivery.destinationAddressId || booking.destinationAddressId,
      materialId: delivery.materialId || booking.materialIds[0] || "",
      status: delivery.status ?? booking.status,
      lrNumber: delivery.lrNumber ?? booking.assignment?.lrNumber ?? null,
      quantity: delivery.quantity ?? booking.quantity,
      uom: delivery.uom ?? booking.uom,
      weight: delivery.weight ?? booking.weight,
      weightUom: delivery.weightUom ?? booking.weightUom ?? booking.uom,
      distanceKm: delivery.distanceKm ?? booking.pricing.distanceKm ?? null,
      pod: delivery.pod ?? null,
      lrId: delivery.lrId ?? null,
      routeLabel: delivery.routeLabel ?? `${delivery.originCity ?? "Origin"} -> ${delivery.destinationCity ?? "Destination"}`,
      eta: delivery.eta ?? null,
      deliverySequence: delivery.deliverySequence ?? delivery.deliveryNo ?? index + 1,
      freightRate: delivery.freightRate ?? booking.pricing.calculatedFreight ?? null,
      tripImpactSummary: delivery.tripImpactSummary ?? "Base delivery record.",
      contactPerson: delivery.contactPerson ?? null,
      contactNumber: delivery.contactNumber ?? null,
      unloadingNotes: delivery.unloadingNotes ?? null,
      instructions: delivery.instructions ?? null,
      activeRevisionId: delivery.activeRevisionId ?? null,
      revisions: Array.isArray(delivery.revisions) ? delivery.revisions : [],
    }));
  }

  return [
    {
      id: `${booking.id}-delivery-1`,
      deliveryNo: 1,
      trackingId: buildTrackingId(booking.bookingId, 1),
      originAddressId: booking.sourceAddressId,
      destinationAddressId: booking.destinationAddressId,
      materialId: booking.materialIds[0] ?? "",
      quantity: booking.quantity,
      uom: booking.uom,
      weight: booking.weight,
      weightUom: booking.weightUom ?? booking.uom,
      distanceKm: booking.pricing.distanceKm ?? null,
      status: booking.status,
      lrNumber: booking.assignment?.lrNumber ?? null,
      lrId: booking.deliveries?.[0]?.lrId ?? null,
      pod: booking.pod ?? null,
      routeLabel: `${booking.sourceAddressId} -> ${booking.destinationAddressId}`,
      eta: null,
      deliverySequence: 1,
      freightRate: booking.pricing.calculatedFreight ?? null,
      tripImpactSummary: "Base delivery record.",
      contactPerson: null,
      contactNumber: null,
      unloadingNotes: null,
      instructions: null,
      activeRevisionId: null,
      revisions: [],
    },
  ];
}

function syncBookingDeliveriesStatus(
  deliveries: BookingRecord["deliveries"],
  status: BookingRecord["status"],
  lrNumber?: string | null,
) {
  return (deliveries ?? []).map((delivery) => ({
    ...delivery,
    status,
    lrNumber: lrNumber !== undefined ? lrNumber : delivery.lrNumber ?? null,
  }));
}

function normalizeBookingStatus(status: BookingRecord["status"]) {
  if (status === "ACCEPTED") {
    return "ACCEPTED" as const;
  }
  if (status === "ASSIGNED") {
    return "ASSIGNED" as const;
  }
  if (status === "LOADING") {
    return "LOADING" as const;
  }
  if (status === "LOADED") {
    return "LOADED" as const;
  }
  return status;
}

function normalizeStoredTenantBookings(storedBookings: BookingRecord[]) {
  return storedBookings.map((booking) => {
    const normalizedStatus = normalizeBookingStatus(booking.status);
    const normalizedTimeline = booking.statusTimeline.map((event) => ({
      ...event,
      status: normalizeBookingStatus(event.status),
    }));
    const deliveries = normalizeBookingDeliveries(booking);

    return {
      ...booking,
      status: normalizedStatus,
      modeOfTransport: booking.modeOfTransport ?? "ROAD",
      numberOfDeliveries: booking.numberOfDeliveries ?? deliveries.length,
      poNumber: booking.poNumber ?? null,
      doNumber: booking.doNumber ?? null,
      ewayBillNumber: booking.ewayBillNumber ?? null,
      pickupDate: booking.pickupDate ?? null,
      pickupTime: booking.pickupTime ?? null,
      tat: booking.tat ?? null,
      chargeType: booking.chargeType ?? (booking.commercialType === "CONTRACT" ? "Freight" : null),
      subBrand: booking.subBrand ?? null,
      weightUom: booking.weightUom ?? booking.uom,
      manualLrPoolPreference: booking.manualLrPoolPreference ?? "GENERAL",
      pod: booking.pod ?? null,
      isInvoiced: booking.isInvoiced ?? Boolean(booking.invoiceId),
      invoiceId: booking.invoiceId ?? null,
      documents: Array.isArray(booking.documents) ? booking.documents : [],
      shipmentDocuments: ensureShipmentDocuments({
        deliveries,
        shipmentDocuments: booking.shipmentDocuments ?? null,
      }),
      deliveries: syncBookingDeliveriesStatus(deliveries, normalizedStatus, booking.assignment?.lrNumber ?? null),
      expenses: Array.isArray(booking.expenses) ? booking.expenses : [],
      assignment: booking.assignment ?? null,
      remarks: Array.isArray(booking.remarks) ? booking.remarks : [],
      destinationChangeRequests: Array.isArray(booking.destinationChangeRequests) ? booking.destinationChangeRequests : [],
      operationalFlags: Array.isArray(booking.operationalFlags) ? booking.operationalFlags : [],
      statusTimeline: normalizedTimeline,
    };
  });
}

function normalizeStoredTenantLrs(storedLrs: TenantLrRecord[]) {
  return storedLrs.map((record) => ({
    ...record,
    configId: record.configId ?? null,
    updatedAt: record.updatedAt ?? record.createdAt,
  }));
}

function normalizeStoredTenantLrPools(storedPools: TenantLrPoolRecord[]) {
  return storedPools.map((pool) => ({
    ...pool,
    lrNumberId: pool.lrNumberId ?? pool.id,
    poolType: pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL"),
    customerId: pool.customerId ?? null,
    vendorId: pool.vendorId ?? null,
    ownerPlaceId: pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
    currentPlaceId: pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
    ownerLevelId: pool.ownerLevelId ?? null,
    ownerUserId: pool.ownerUserId ?? null,
    bookingId: pool.bookingId ?? null,
    deliveryId: pool.deliveryId ?? null,
    usedAt: pool.usedAt ?? null,
    voidReason: pool.voidReason ?? null,
    createdBy: pool.createdBy ?? null,
    auditEvents: Array.isArray(pool.auditEvents) ? pool.auditEvents : [],
    updatedAt: pool.updatedAt ?? pool.createdAt,
  }));
}

function appendPoolAuditEvent(
  pool: TenantLrPoolRecord,
  event: Omit<NonNullable<TenantLrPoolRecord["auditEvents"]>[number], "id">,
): TenantLrPoolRecord {
  return {
    ...pool,
    auditEvents: [
      ...((pool.auditEvents ?? []).filter(Boolean)),
      {
        id: `lr-audit-${Math.random().toString(36).slice(2, 9)}`,
        ...event,
      },
    ],
  };
}

function matchesBookingId(booking: BookingRecord, bookingId: string) {
  const normalizedTarget = normalizeBookingId(bookingId);
  return normalizedTarget.length > 0 && (
    normalizeBookingId(booking.id) === normalizedTarget ||
    normalizeBookingId(booking.bookingId) === normalizedTarget
  );
}

export function MockStoreProvider({ children }: PropsWithChildren) {
  ensurePreGeneratedLrCleanupOnce();
  ensureEnterpriseTenantEl001CleanupOnce();
  ensureBootstrapOrgUnitCleanupOnce();
  ensureStarterCeoRoleCleanupOnce();
  const seededWorkspaces = loadSeededState(storageKeys.tenantWorkspaces, buildSeedWorkspaces());
  const seededPlatformTenants = normalizeStoredPlatformTenants(
    loadSeededState(storageKeys.platformTenants, mockPlatformTenants),
  );
  const seededRolePermissions = loadSeededState(storageKeys.tenantRolePermissions, mockRolePermissions);
  const legacyStoredCustomers = loadSeededState<LegacyGlobalCustomer[]>(storageKeys.globalCustomers, []);
  const legacyStoredVendors = loadSeededState<LegacyGlobalVendor[]>(storageKeys.globalVendors, []);
  const seededCustomers = normalizeStoredTenantCustomers(
    loadSeededState(storageKeys.tenantCustomers, mockTenantCustomers),
    legacyStoredCustomers,
  );
  const seededCustomerAddresses = normalizeStoredTenantCustomerAddresses(
    loadSeededState(storageKeys.tenantCustomerAddresses, mockTenantCustomerAddresses),
    seededCustomers,
  );
  const seededVendors = normalizeStoredTenantVendors(
    loadSeededState(storageKeys.tenantVendors, mockTenantVendors),
    legacyStoredVendors,
  );
  const seededDrivers = normalizeStoredTenantDrivers(loadSeededState(storageKeys.tenantDrivers, mockTenantDrivers));
  const seededOrgUnits = loadSeededState(storageKeys.tenantOrgUnits, mockOrgUnits);
  const seededRoles = normalizeStoredRoles(
    loadSeededState(storageKeys.tenantRoles, mockRoles),
    seededWorkspaces,
    seededPlatformTenants,
    seededRolePermissions,
  );
  const seededUsers = normalizeStoredUsers(loadSeededState(storageKeys.tenantUsers, mockUsers));
  const enterpriseTenantEl001 = buildEnterpriseTenantEl001Access({
    platformTenants: seededPlatformTenants,
    workspaces: seededWorkspaces,
    orgUnits: seededOrgUnits,
    customers: seededCustomers,
    vendors: seededVendors,
    drivers: seededDrivers,
    roles: seededRoles,
    users: seededUsers,
    rolePermissions: seededRolePermissions,
  });
  const seededTenantLrConfigs = applyEnterpriseTenantEl001LrConfigDefaults({
    platformTenants: enterpriseTenantEl001.platformTenants,
    workspaces: seededWorkspaces,
    roles: enterpriseTenantEl001.roles,
    configs: normalizeStoredTenantLRConfigs(loadSeededState(storageKeys.tenantLRConfigs, [])),
  });
  const [platformTenants, setPlatformTenants] = useState<TenantRecord[]>(() =>
    enterpriseTenantEl001.platformTenants,
  );
  const [modules, setModules] = useState<PlatformModule[]>(() =>
    loadSeededState(storageKeys.platformModules, mockModules),
  );
  const [platformAuditLogs, setPlatformAuditLogs] = useState<PlatformAuditEvent[]>(() =>
    loadSeededState(storageKeys.platformAuditLogs, mockPlatformAuditLogs),
  );
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() =>
    loadSeededState(storageKeys.platformSettings, mockPlatformSettings),
  );
  const [tenantCustomers, setTenantCustomers] = useState<TenantCustomer[]>(() =>
    syncCustomerAddresses(seededCustomers, seededCustomerAddresses),
  );
  const [tenantVendors, setTenantVendors] = useState<TenantVendor[]>(() =>
    seededVendors,
  );
  const [tenantCustomerAddresses, setTenantCustomerAddresses] = useState<TenantCustomerAddress[]>(() =>
    seededCustomerAddresses,
  );
  const [tenantCustomerRateCards, setTenantCustomerRateCards] = useState<TenantCustomerRateCard[]>(() =>
    loadSeededState(storageKeys.tenantCustomerRateCards, mockTenantCustomerRateCards).map((rateCard) =>
      normalizeStoredTenantCustomerRateCard(rateCard),
    ),
  );
  const [tenantVendorRateCards, setTenantVendorRateCards] = useState<TenantVendorRateCard[]>(() =>
    loadSeededState(storageKeys.tenantVendorRateCards, mockTenantVendorRateCards).map((rateCard) =>
      normalizeStoredTenantVendorRateCard(rateCard),
    ),
  );
  const [tenantVehicleTypes, setTenantVehicleTypes] = useState<TenantVehicleType[]>(() =>
    loadSeededState(storageKeys.tenantVehicleTypes, mockTenantVehicleTypes),
  );
  const [tenantVehicles, setTenantVehicles] = useState<TenantVehicle[]>(() =>
    normalizeStoredTenantVehicles(loadSeededState(storageKeys.tenantVehicles, mockTenantVehicles)),
  );
  const [tenantDrivers, setTenantDrivers] = useState<TenantDriver[]>(() =>
    seededDrivers,
  );
  const [tenantMaterials, setTenantMaterials] = useState<TenantMaterial[]>(() =>
    loadSeededState(storageKeys.tenantMaterials, mockTenantMaterials).map((material) =>
      normalizeTenantMaterial(material),
    ),
  );
  const [tenantUOMDefinitions, setTenantUOMDefinitions] = useState<TenantUOMDefinition[]>(() =>
    loadSeededState(storageKeys.tenantUOMDefinitions, mockTenantUOMDefinitions).map((definition) =>
      normalizeTenantUOMDefinition(definition),
    ),
  );
  const [tenantUOMMappings, setTenantUOMMappings] = useState<TenantUOMMapping[]>(() =>
    loadSeededState(storageKeys.tenantUOMMappings, mockTenantUOMMappings).map((mapping) =>
      normalizeTenantUOMMapping(mapping),
    ),
  );
  const [tenantLRConfigs, setTenantLRConfigs] = useState<TenantLRConfig[]>(() => seededTenantLrConfigs);
  const [tenantBookings, setTenantBookings] = useState<BookingRecord[]>(() =>
    normalizeStoredTenantBookings(loadSeededState(storageKeys.tenantBookings, mockTenantBookings)),
  );
  const [tenantInvoices, setTenantInvoices] = useState<TenantInvoiceRecord[]>(() =>
    loadSeededState(storageKeys.tenantInvoices, []),
  );
  const [tenantLrs, setTenantLrs] = useState<TenantLrRecord[]>(() =>
    normalizeStoredTenantLrs(loadSeededState(storageKeys.tenantLrs, [])),
  );
  const [tenantLrPools, setTenantLrPools] = useState<TenantLrPoolRecord[]>(() =>
    normalizeStoredTenantLrPools(loadSeededState(storageKeys.tenantLrPools, [])),
  );
  const [tenantLrRequests, setTenantLrRequests] = useState<TenantLrAllocationRequestRecord[]>(() =>
    normalizeStoredTenantLrRequests(loadSeededState(storageKeys.tenantLrRequests, [])),
  );
  const [tenantLrTransfers, setTenantLrTransfers] = useState<TenantLrTransferRecord[]>(() =>
    normalizeStoredTenantLrTransfers(loadSeededState(storageKeys.tenantLrTransfers, [])),
  );
  const [workspaces, setWorkspaces] = useState<Record<string, TenantWorkspaceState>>(() => seededWorkspaces);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>(() =>
    seededOrgUnits,
  );
  const [users, setUsers] = useState<UserRecord[]>(() =>
    enterpriseTenantEl001.users,
  );
  const [roles, setRoles] = useState<RoleDefinition[]>(() =>
    enterpriseTenantEl001.roles,
  );
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>(() =>
    enterpriseTenantEl001.rolePermissions,
  );

  useEffect(() => {
    writeStoredValue(storageKeys.platformTenants, platformTenants);
  }, [platformTenants]);

  useEffect(() => {
    writeStoredValue(storageKeys.platformModules, modules);
  }, [modules]);

  useEffect(() => {
    writeStoredValue(storageKeys.platformAuditLogs, platformAuditLogs);
  }, [platformAuditLogs]);

  useEffect(() => {
    writeStoredValue(storageKeys.platformSettings, platformSettings);
  }, [platformSettings]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantCustomers, tenantCustomers);
  }, [tenantCustomers]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantVendors, tenantVendors);
  }, [tenantVendors]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantCustomerAddresses, tenantCustomerAddresses);
  }, [tenantCustomerAddresses]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantCustomerRateCards, tenantCustomerRateCards);
  }, [tenantCustomerRateCards]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantVendorRateCards, tenantVendorRateCards);
  }, [tenantVendorRateCards]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantVehicleTypes, tenantVehicleTypes);
  }, [tenantVehicleTypes]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantVehicles, tenantVehicles);
  }, [tenantVehicles]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantDrivers, tenantDrivers);
  }, [tenantDrivers]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantMaterials, tenantMaterials);
  }, [tenantMaterials]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantUOMDefinitions, tenantUOMDefinitions);
  }, [tenantUOMDefinitions]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantUOMMappings, tenantUOMMappings);
  }, [tenantUOMMappings]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantLRConfigs, tenantLRConfigs);
  }, [tenantLRConfigs]);

  useEffect(() => {
    setTenantLrPools((current) => {
      const configDrivenPools = tenantLRConfigs
        .filter((config) => config.lrType !== "AUTO")
        .flatMap((config) =>
          buildTenantLrPoolsFromConfig({
            tenantId: config.tenantId,
            config,
            existingPools: current,
            timestamp: new Date().toISOString(),
          }),
        );
      const remainingPools = current.filter(
        (pool) => !tenantLRConfigs.some((config) => config.id === pool.configId),
      );
      return [...configDrivenPools, ...remainingPools];
    });
  }, [tenantLRConfigs]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantBookings, tenantBookings);
  }, [tenantBookings]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantInvoices, tenantInvoices);
  }, [tenantInvoices]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantLrs, tenantLrs);
  }, [tenantLrs]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantLrPools, tenantLrPools);
  }, [tenantLrPools]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantLrRequests, tenantLrRequests);
  }, [tenantLrRequests]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantLrTransfers, tenantLrTransfers);
  }, [tenantLrTransfers]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantWorkspaces, workspaces);
  }, [workspaces]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantOrgUnits, orgUnits);
  }, [orgUnits]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantUsers, users);
  }, [users]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantRoles, roles);
  }, [roles]);

  useEffect(() => {
    writeStoredValue(storageKeys.tenantRolePermissions, rolePermissions);
  }, [rolePermissions]);

  function createTenantInternal(input: CreateTenantInput) {
    const normalizedCode = input.code.trim().toLowerCase();
    const tenantId = `tenant-${normalizedCode}`;
    const activeModuleMap = getActiveModuleMap(modules);
    if (platformTenants.some((tenant) => tenant.id === tenantId || tenant.code.toLowerCase() === normalizedCode)) {
      throw new Error("A tenant with this code already exists.");
    }
    if (!input.enabledModuleCodes.length) {
      throw new Error("Enable at least one module for this tenant.");
    }
    const invalidModuleCode = input.enabledModuleCodes.find(
      (moduleCode) => !activeModuleMap.has(normalizeModuleKey(moduleCode)),
    );
    if (invalidModuleCode) {
      throw new Error(`Module ${invalidModuleCode} is not active in the platform catalog.`);
    }
    const hierarchy = buildHierarchyConfigForTemplate(tenantId, input.defaultHierarchyTemplate);
    const rootLevel = hierarchy.levels[0];
    const starterRoles = buildStarterRolesForTenant(tenantId, input.enabledModuleCodes);
    // Only the system Tenant Admin role exists by default. Other roles
    // (CEO, Regional Manager, etc.) are created manually from the Roles page.
    starterRoles.tenantAdmin.hierarchyLevelId = rootLevel.id;
    const starterRoleId = starterRoles.tenantAdmin.id;
    // No bootstrap org unit. Tenant Admin must create org units manually
    // from the Org Units page; hierarchy only defines level names.
    const bootstrapUser: UserRecord = {
      id: `user-${normalizedCode}-admin`,
      tenantId,
      name: input.primaryContactName.trim(),
      email: input.primaryContactEmail.trim().toLowerCase(),
      userType: "INTERNAL",
      roleId: starterRoleId,
      orgUnitIds: [],
      linkedVendorId: null,
      linkedCustomerId: null,
      linkedDriverId: null,
      driverName: "",
      driverCode: "",
      status: "active",
      lastActive: new Date().toISOString(),
      phone: input.primaryContactPhone?.trim() || undefined,
      // Demo only: plaintext password stored in mock/localStorage. Remove when backend auth is integrated.
      password: input.primaryContactPassword || undefined,
    };

    const tenant: TenantRecord = {
      id: tenantId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      region: "Pending Region",
      industry: "Logistics",
      planId: input.planId,
      status: input.status,
      tenantType: input.tenantType,
      customerPortalEnabled: input.customerPortalEnabled,
      assignmentMode: getDefaultAssignmentMode(input.tenantType),
      commercialMode: getDefaultCommercialMode(input.tenantType),
      enabledModuleCodes: input.enabledModuleCodes,
      initialHierarchyTemplate: input.defaultHierarchyTemplate,
      primaryAdminUserId: bootstrapUser.id,
      createdAt: new Date().toISOString(),
      health: {
        activeUsers: 1,
        monthlyBookings: 0,
        policyCount: 0,
        auditEvents24h: 0,
      },
    };

    setPlatformTenants((current) => {
      const next = [tenant, ...current];
      writeStoredValue(storageKeys.platformTenants, next);
      return next;
    });
    setWorkspaces((current) => ({
      ...current,
      [tenantId]: {
        tenantId,
        startingBlueprint: input.defaultHierarchyTemplate,
        hierarchy,
      },
    }));
    setRoles((current) => [starterRoles.tenantAdmin, ...current]);
    setRolePermissions((current) => [
      ...buildStarterPermissionsForTenant(tenantId, starterRoles),
      ...current,
    ]);
    setUsers((current) => [bootstrapUser, ...current]);
    if (isDirectCustomerTenant(tenant)) {
      const now = new Date().toISOString();
      setTenantCustomers((current) => [
        {
          id: `tenant-customer-self-${normalizedCode}`,
          tenantId,
          name: input.name.trim(),
          legalName: input.name.trim(),
          tier: "Primary",
          code: input.code.trim().toUpperCase(),
          internalAccountOwner: input.primaryContactName.trim(),
          primaryContactName: input.primaryContactName.trim(),
          primaryContactEmail: input.primaryContactEmail.trim().toLowerCase(),
          allowAutoBooking: true,
          rateMatchingBasis: "LANE_TO_LANE",
          addresses: [],
          uomOverrides: [],
          setupStatus: "BASIC_COMPLETED",
          setupProgress: {
            basicDetailsCompleted: true,
            contactsCompleted: true,
            creditBillingCompleted: false,
            contractsCompleted: false,
            preferencesCompleted: false,
          },
          status: "active",
          createdAt: now,
          updatedAt: now,
        },
        ...current,
      ]);
    }
    setPlatformAuditLogs((current) => [
      {
        id: `p-log-${Date.now()}`,
        actor: "Optimile Super Admin",
        action: "created tenant",
        entityType: "tenant",
        entityName: tenant.name,
        tenantId,
        timestamp: new Date().toISOString(),
        result: "success",
      },
      ...current,
    ]);
    return tenant;
  }

  const value = useMemo<MockStoreValue>(
    () => ({
      platformTenants,
      plans: mockPlans,
      modules,
      platformAuditLogs,
      platformSettings,
      moduleFeatures: mockCapabilities,
      appendPlatformAuditLog: (input) => {
        const created: PlatformAuditEvent = {
          ...input,
          id: `p-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: input.timestamp ?? new Date().toISOString(),
        };
        setPlatformAuditLogs((current) => [created, ...current]);
        return created;
      },
      createPlatformModule: (input) => {
        const normalizedCode = input.code.trim().toUpperCase();
        if (modules.some((module) => module.code.toUpperCase() === normalizedCode)) {
          throw new Error("A platform module with this code already exists.");
        }
        const created: PlatformModule = {
          ...input,
          id: `mod-${Math.random().toString(36).slice(2, 9)}`,
          code: normalizedCode,
          name: input.name.trim(),
          category: input.category,
          description: input.description.trim(),
          status: input.status,
        };
        setModules((current) => [created, ...current]);
        setPlatformAuditLogs((current) => [
          {
            id: `p-log-${Date.now()}`,
            actor: "Optimile Super Admin",
            action: "created platform module",
            entityType: "module",
            entityName: created.name,
            timestamp: new Date().toISOString(),
            result: "success",
          },
          ...current,
        ]);
        return created;
      },
      updatePlatformModule: (moduleId, updates) => {
        const existing = modules.find((module) => module.id === moduleId);
        if (!existing) {
          throw new Error("Platform module not found.");
        }
        const normalizedCode = updates.code?.trim().toUpperCase();
        if (
          normalizedCode &&
          modules.some(
            (module) => module.id !== moduleId && module.code.toUpperCase() === normalizedCode,
          )
        ) {
          throw new Error("A platform module with this code already exists.");
        }
        const updated: PlatformModule = {
          ...existing,
          ...updates,
          code: normalizedCode ?? existing.code,
          name: updates.name !== undefined ? updates.name.trim() : existing.name,
          description: updates.description !== undefined ? updates.description.trim() : existing.description,
        };
        setModules((current) => current.map((module) => (module.id === moduleId ? updated : module)));
        setPlatformAuditLogs((current) => [
          {
            id: `p-log-${Date.now()}`,
            actor: "Optimile Super Admin",
            action: existing.status !== updated.status ? "updated module status" : "updated module",
            entityType: "module",
            entityName: updated.name,
            timestamp: new Date().toISOString(),
            result: updated.status === "active" ? "success" : "warning",
          },
          ...current,
        ]);
        return updated;
      },
      createTenant: createTenantInternal,
      createSampleTenant: (template) => {
        const count = platformTenants.length + 1;
        const activeModuleCodes = modules
          .filter((module) => module.status === "active")
          .map((module) => module.code);
        const defaultModuleCodes = platformSettings.defaultModuleCodes.filter((moduleCode) =>
          activeModuleCodes.includes(moduleCode),
        );
        return createTenantInternal({
          name: `Sample Tenant ${count}`,
          code: `st${count}`,
          status: "trial",
          planId: mockPlans[0].id,
          tenantType: "LOGISTICS_PROVIDER_3PL",
          customerPortalEnabled: false,
          primaryContactName: "Sample Admin",
          primaryContactEmail: `sample${count}@tenant.test`,
          starterRole: "tenant_admin",
          enabledModuleCodes: defaultModuleCodes.length ? defaultModuleCodes : activeModuleCodes.slice(0, 2),
          defaultHierarchyTemplate: template,
          notes: `Created from quick action using ${template}`,
        });
      },
      updatePlatformTenant: (tenantId, updates) => {
        const currentTenant = platformTenants.find((tenant) => tenant.id === tenantId);
        if (!currentTenant) {
          return;
        }
        if (updates.enabledModuleCodes) {
          const activeModuleMap = getActiveModuleMap(modules);
          const invalidModuleCode = updates.enabledModuleCodes.find(
            (moduleCode) =>
              !activeModuleMap.has(normalizeModuleKey(moduleCode)) &&
              !normalizeModuleKeys(currentTenant.enabledModuleCodes).includes(normalizeModuleKey(moduleCode)),
          );
          if (invalidModuleCode) {
            throw new Error(`Module ${invalidModuleCode} is not active in the platform catalog.`);
          }
        }

        if (
          updates.code &&
          platformTenants.some(
            (tenant) =>
              tenant.id !== tenantId &&
              tenant.code.toLowerCase() === updates.code!.trim().toLowerCase(),
          )
        ) {
          throw new Error("A tenant with this code already exists.");
        }

        const nextTenant = {
          ...currentTenant,
          ...updates,
          code: updates.code ? updates.code.trim().toUpperCase() : currentTenant.code,
          name: updates.name ? updates.name.trim() : currentTenant.name,
          region: updates.region ? updates.region.trim() : currentTenant.region,
          industry: updates.industry ? updates.industry.trim() : currentTenant.industry,
          assignmentMode:
            updates.assignmentMode ??
            (updates.tenantType ? getDefaultAssignmentMode(updates.tenantType) : currentTenant.assignmentMode),
          commercialMode:
            updates.commercialMode ??
            (updates.tenantType ? getDefaultCommercialMode(updates.tenantType) : currentTenant.commercialMode),
        };

        setPlatformTenants((current) => {
          const next = current.map((tenant) => (tenant.id === tenantId ? nextTenant : tenant));
          // Synchronously persist so the user's choice is on disk before any
          // navigation, refresh, or cross-tree re-mount can race the effect.
          writeStoredValue(storageKeys.platformTenants, next);
          return next;
        });
        const modulesChanged =
          updates.enabledModuleCodes !== undefined &&
          JSON.stringify([...updates.enabledModuleCodes].sort()) !==
            JSON.stringify([...currentTenant.enabledModuleCodes].sort());
        setPlatformAuditLogs((current) => [
          {
            id: `p-log-${Date.now()}`,
            actor: "Optimile Super Admin",
            action: modulesChanged ? "updated tenant modules" : "updated tenant governance",
            entityType: modulesChanged ? "module" : "tenant",
            entityName: nextTenant.name,
            tenantId,
            timestamp: new Date().toISOString(),
            result: modulesChanged ? "warning" : "success",
          },
          ...current,
        ]);
      },
      savePlatformSettings: (settings) => {
        const activeModuleMap = getActiveModuleMap(modules);
        const defaultModuleCodes = settings.defaultModuleCodes.filter((moduleCode) =>
          activeModuleMap.has(moduleCode),
        );
        if (!defaultModuleCodes.length) {
          throw new Error("Select at least one active platform module for the default bundle.");
        }
        setPlatformSettings({
          ...settings,
          defaultModuleCodes,
        });
        setPlatformAuditLogs((current) => [
          {
            id: `p-log-${Date.now()}`,
            actor: "Optimile Super Admin",
            action: "updated platform settings",
            entityType: "setting",
            entityName: "Platform Settings",
            timestamp: new Date().toISOString(),
            result: "success",
          },
          ...current,
        ]);
      },
      getTenantPrimaryAdminUser: (tenantId) => {
        const tenant = platformTenants.find((item) => item.id === tenantId);
        if (!tenant) {
          return null;
        }
        return users.find((user) => user.id === tenant.primaryAdminUserId) ?? null;
      },
      getTenantById: (tenantId) =>
        platformTenants.find((tenant) => tenant.id === tenantId) ?? null,
      listTenantCustomers: (tenantId) =>
        tenantCustomers.filter((item) => item.tenantId === tenantId),
      getTenantCustomerById: (tenantCustomerId) =>
        tenantCustomers.find((item) => item.id === tenantCustomerId) ?? null,
      createTenantCustomer: (input) => {
        const normalizedName = input.name.trim().toLowerCase();
        if (
          tenantCustomers.some(
            (item) => item.tenantId === input.tenantId && item.name.trim().toLowerCase() === normalizedName,
          )
        ) {
          throw new Error("A customer with this name already exists for this tenant.");
        }
        const normalizedCode = input.code?.trim().toUpperCase();
        if (
          normalizedCode &&
          tenantCustomers.some(
            (item) =>
              item.tenantId === input.tenantId &&
              item.code?.trim().toUpperCase() === normalizedCode,
          )
        ) {
          throw new Error("A customer with this code already exists for this tenant.");
        }

        const now = new Date().toISOString();
        const created: TenantCustomer = {
          id: `tenant-customer-${Math.random().toString(36).slice(2, 9)}`,
          tenantId: input.tenantId,
          name: input.name.trim(),
          legalName: input.legalName?.trim() || undefined,
          tier: input.tier?.trim() || "Standard",
          code: normalizedCode || undefined,
          billingAddress: input.billingAddress?.trim() || undefined,
          relationshipManager: input.relationshipManager?.trim() || undefined,
          internalAccountOwner: input.internalAccountOwner?.trim() || undefined,
          gstin: input.gstin?.trim().toUpperCase() || input.gstNumber?.trim().toUpperCase() || undefined,
          gstNumber: input.gstNumber?.trim() || undefined,
          pan: input.pan?.trim().toUpperCase() || undefined,
          primaryContactName: input.primaryContactName?.trim() || undefined,
          primaryContactEmail: input.primaryContactEmail?.trim().toLowerCase() || undefined,
          primaryContactPhone: input.primaryContactPhone?.trim() || undefined,
          primaryContactDesignation: input.primaryContactDesignation?.trim() || undefined,
          accountsContactName: input.accountsContactName?.trim() || undefined,
          accountsContactEmail: input.accountsContactEmail?.trim().toLowerCase() || undefined,
          accountsContactPhone: input.accountsContactPhone?.trim() || undefined,
          accountsContactDesignation: input.accountsContactDesignation?.trim() || undefined,
          logisticsContactName: input.logisticsContactName?.trim() || undefined,
          logisticsContactEmail: input.logisticsContactEmail?.trim().toLowerCase() || undefined,
          logisticsContactPhone: input.logisticsContactPhone?.trim() || undefined,
          logisticsContactDesignation: input.logisticsContactDesignation?.trim() || undefined,
          creditLimit: input.creditLimit ?? null,
          creditDays: input.creditDays ?? null,
          currentOutstanding: input.currentOutstanding ?? null,
          gstChargeType: input.gstChargeType?.trim() || "Forward Charge (12% GST on Transport)",
          tdsApplicable: input.tdsApplicable ?? false,
          invoiceFormat: input.invoiceFormat?.trim() || undefined,
          preferredVehicleTypes: Array.from(new Set(input.preferredVehicleTypes ?? [])),
          communicationChannel: input.communicationChannel?.trim() || "Email",
          defaultPaymentMode: input.defaultPaymentMode?.trim() || "Bank Transfer",
          allowAutoBooking: input.allowAutoBooking ?? false,
          rateMatchingBasis: input.rateMatchingBasis ?? "LANE_TO_LANE",
          addresses: (input.addresses ?? []).map((address) =>
            normalizeCustomerAddressMasterEntry(address),
          ),
          uomOverrides: (input.uomOverrides ?? []).map((override) =>
            normalizeCustomerUOMOverrideEntry(override),
          ),
          setupStatus: input.setupStatus ?? "BASIC_COMPLETED",
          setupProgress: {
            basicDetailsCompleted: input.setupProgress?.basicDetailsCompleted ?? true,
            contactsCompleted: input.setupProgress?.contactsCompleted ?? false,
            creditBillingCompleted: input.setupProgress?.creditBillingCompleted ?? false,
            contractsCompleted: input.setupProgress?.contractsCompleted ?? false,
            preferencesCompleted: input.setupProgress?.preferencesCompleted ?? false,
          },
          status: input.status,
          createdAt: now,
          updatedAt: now,
        };
        setTenantCustomers((current) => [created, ...current]);
        return created;
      },
      updateTenantCustomer: (tenantCustomerId, updates) => {
        const existing = tenantCustomers.find((item) => item.id === tenantCustomerId);
        if (!existing) {
          throw new Error("Tenant customer not found.");
        }
        const normalizedName = updates.name?.trim().toLowerCase();
        if (
          normalizedName &&
          tenantCustomers.some(
            (item) =>
              item.id !== tenantCustomerId &&
              item.tenantId === existing.tenantId &&
              item.name.trim().toLowerCase() === normalizedName,
          )
        ) {
          throw new Error("A customer with this name already exists for this tenant.");
        }
        const normalizedCode = updates.code?.trim().toUpperCase();
        if (
          normalizedCode &&
          tenantCustomers.some(
            (item) =>
              item.id !== tenantCustomerId &&
              item.tenantId === existing.tenantId &&
              item.code?.trim().toUpperCase() === normalizedCode,
          )
        ) {
          throw new Error("A customer with this code already exists for this tenant.");
        }

        const updated = {
          ...existing,
          ...updates,
          name: updates.name !== undefined ? updates.name.trim() : existing.name,
          legalName:
            updates.legalName !== undefined ? updates.legalName.trim() || undefined : existing.legalName,
          tier: updates.tier !== undefined ? updates.tier.trim() || "Standard" : existing.tier,
          code: updates.code !== undefined ? normalizedCode || undefined : existing.code,
          billingAddress:
            updates.billingAddress !== undefined
              ? updates.billingAddress.trim() || undefined
              : existing.billingAddress,
          relationshipManager:
            updates.relationshipManager !== undefined
              ? updates.relationshipManager.trim() || undefined
              : existing.relationshipManager,
          internalAccountOwner:
            updates.internalAccountOwner !== undefined
              ? updates.internalAccountOwner.trim() || undefined
              : existing.internalAccountOwner,
          gstin:
            updates.gstin !== undefined
              ? updates.gstin.trim().toUpperCase() || undefined
              : existing.gstin,
          gstNumber:
            updates.gstNumber !== undefined ? updates.gstNumber.trim() || undefined : existing.gstNumber,
          pan: updates.pan !== undefined ? updates.pan.trim().toUpperCase() || undefined : existing.pan,
          primaryContactName:
            updates.primaryContactName !== undefined
              ? updates.primaryContactName.trim() || undefined
              : existing.primaryContactName,
          primaryContactEmail:
            updates.primaryContactEmail !== undefined
              ? updates.primaryContactEmail.trim().toLowerCase() || undefined
              : existing.primaryContactEmail,
          primaryContactPhone:
            updates.primaryContactPhone !== undefined
              ? updates.primaryContactPhone.trim() || undefined
              : existing.primaryContactPhone,
          primaryContactDesignation:
            updates.primaryContactDesignation !== undefined
              ? updates.primaryContactDesignation.trim() || undefined
              : existing.primaryContactDesignation,
          accountsContactName:
            updates.accountsContactName !== undefined
              ? updates.accountsContactName.trim() || undefined
              : existing.accountsContactName,
          accountsContactEmail:
            updates.accountsContactEmail !== undefined
              ? updates.accountsContactEmail.trim().toLowerCase() || undefined
              : existing.accountsContactEmail,
          accountsContactPhone:
            updates.accountsContactPhone !== undefined
              ? updates.accountsContactPhone.trim() || undefined
              : existing.accountsContactPhone,
          accountsContactDesignation:
            updates.accountsContactDesignation !== undefined
              ? updates.accountsContactDesignation.trim() || undefined
              : existing.accountsContactDesignation,
          logisticsContactName:
            updates.logisticsContactName !== undefined
              ? updates.logisticsContactName.trim() || undefined
              : existing.logisticsContactName,
          logisticsContactEmail:
            updates.logisticsContactEmail !== undefined
              ? updates.logisticsContactEmail.trim().toLowerCase() || undefined
              : existing.logisticsContactEmail,
          logisticsContactPhone:
            updates.logisticsContactPhone !== undefined
              ? updates.logisticsContactPhone.trim() || undefined
              : existing.logisticsContactPhone,
          logisticsContactDesignation:
            updates.logisticsContactDesignation !== undefined
              ? updates.logisticsContactDesignation.trim() || undefined
              : existing.logisticsContactDesignation,
          creditLimit: updates.creditLimit !== undefined ? updates.creditLimit : existing.creditLimit,
          creditDays: updates.creditDays !== undefined ? updates.creditDays : existing.creditDays,
          currentOutstanding:
            updates.currentOutstanding !== undefined ? updates.currentOutstanding : existing.currentOutstanding,
          gstChargeType:
            updates.gstChargeType !== undefined
              ? updates.gstChargeType.trim() || undefined
              : existing.gstChargeType,
          tdsApplicable:
            updates.tdsApplicable !== undefined ? updates.tdsApplicable : existing.tdsApplicable,
          invoiceFormat:
            updates.invoiceFormat !== undefined
              ? updates.invoiceFormat.trim() || undefined
              : existing.invoiceFormat,
          preferredVehicleTypes:
            updates.preferredVehicleTypes !== undefined
              ? Array.from(new Set(updates.preferredVehicleTypes))
              : existing.preferredVehicleTypes,
          communicationChannel:
            updates.communicationChannel !== undefined
              ? updates.communicationChannel.trim() || "Email"
              : existing.communicationChannel,
          defaultPaymentMode:
            updates.defaultPaymentMode !== undefined
              ? updates.defaultPaymentMode.trim() || "Bank Transfer"
              : existing.defaultPaymentMode,
          allowAutoBooking:
            updates.allowAutoBooking !== undefined ? updates.allowAutoBooking : existing.allowAutoBooking,
          rateMatchingBasis:
            updates.rateMatchingBasis !== undefined
              ? updates.rateMatchingBasis
              : existing.rateMatchingBasis ?? "LANE_TO_LANE",
          addresses:
            updates.addresses !== undefined
              ? updates.addresses.map((address) => normalizeCustomerAddressMasterEntry(address))
              : existing.addresses,
          uomOverrides:
            updates.uomOverrides !== undefined
              ? updates.uomOverrides.map((override) => normalizeCustomerUOMOverrideEntry(override))
              : existing.uomOverrides ?? [],
          setupStatus: updates.setupStatus ?? existing.setupStatus ?? "BASIC_COMPLETED",
          setupProgress:
            updates.setupProgress !== undefined
              ? { ...existing.setupProgress, ...updates.setupProgress }
              : existing.setupProgress,
          updatedAt: new Date().toISOString(),
        };
        setTenantCustomers((current) =>
          current.map((item) => (item.id === tenantCustomerId ? updated : item)),
        );
        return updated;
      },
      listTenantVendors: (tenantId) => tenantVendors.filter((item) => item.tenantId === tenantId),
      getTenantVendorById: (tenantVendorId) =>
        tenantVendors.find((item) => item.id === tenantVendorId) ?? null,
      createTenantVendor: (input) => {
        const normalizedCode =
          input.code?.trim().toUpperCase() ||
          `VND-${String(tenantVendors.filter((item) => item.tenantId === input.tenantId).length + 1).padStart(4, "0")}`;
        if (
          normalizedCode &&
          tenantVendors.some(
            (item) =>
              item.tenantId === input.tenantId &&
              item.code?.trim().toUpperCase() === normalizedCode,
          )
        ) {
          throw new Error("A vendor with this code already exists for this tenant.");
        }

        const now = new Date().toISOString();
        const created: TenantVendor = {
          id: `tenant-vendor-${Math.random().toString(36).slice(2, 9)}`,
          tenantId: input.tenantId,
          name: input.name.trim(),
          legalName: input.legalName?.trim() || undefined,
          code: normalizedCode || undefined,
          gstin: input.gstin?.trim().toUpperCase() || input.gstNumber?.trim().toUpperCase() || undefined,
          gstNumber: input.gstNumber?.trim() || undefined,
          pan: input.pan?.trim().toUpperCase() || undefined,
          address: input.address?.trim() || undefined,
          vendorType: input.vendorType?.trim() || undefined,
          contactPerson: input.contactPerson?.trim() || undefined,
          phone: input.phone?.trim() || input.contactNumber?.trim() || undefined,
          contactNumber: input.contactNumber?.trim() || undefined,
          email: input.email?.trim().toLowerCase() || undefined,
          serviceableLocations: Array.from(new Set((input.serviceableLocations ?? []).filter(Boolean))),
          supportedVehicleTypes: Array.from(new Set((input.supportedVehicleTypes ?? []).filter(Boolean))),
          status: input.status,
          createdAt: now,
          updatedAt: now,
        };
        setTenantVendors((current) => [created, ...current]);
        return created;
      },
      updateTenantVendor: (tenantVendorId, updates) => {
        const existing = tenantVendors.find((item) => item.id === tenantVendorId);
        if (!existing) {
          throw new Error("Tenant vendor not found.");
        }
        const normalizedCode = updates.code?.trim().toUpperCase();
        if (
          normalizedCode &&
          tenantVendors.some(
            (item) =>
              item.id !== tenantVendorId &&
              item.tenantId === existing.tenantId &&
              item.code?.trim().toUpperCase() === normalizedCode,
          )
        ) {
          throw new Error("A vendor with this code already exists for this tenant.");
        }

        const updated = {
          ...existing,
          ...updates,
          name: updates.name !== undefined ? updates.name.trim() : existing.name,
          legalName:
            updates.legalName !== undefined ? updates.legalName.trim() || undefined : existing.legalName,
          code: updates.code !== undefined ? normalizedCode || undefined : existing.code,
          gstin:
            updates.gstin !== undefined
              ? updates.gstin.trim().toUpperCase() || undefined
              : updates.gstNumber !== undefined
                ? updates.gstNumber.trim().toUpperCase() || undefined
                : existing.gstin,
          gstNumber:
            updates.gstNumber !== undefined ? updates.gstNumber.trim() || undefined : existing.gstNumber,
          pan: updates.pan !== undefined ? updates.pan.trim().toUpperCase() || undefined : existing.pan,
          address:
            updates.address !== undefined ? updates.address.trim() || undefined : existing.address,
          vendorType:
            updates.vendorType !== undefined ? updates.vendorType.trim() || undefined : existing.vendorType,
          contactPerson:
            updates.contactPerson !== undefined
              ? updates.contactPerson.trim() || undefined
              : existing.contactPerson,
          phone:
            updates.phone !== undefined
              ? updates.phone.trim() || undefined
              : updates.contactNumber !== undefined
                ? updates.contactNumber.trim() || undefined
                : existing.phone,
          contactNumber:
            updates.contactNumber !== undefined
              ? updates.contactNumber.trim() || undefined
              : existing.contactNumber,
          email:
            updates.email !== undefined ? updates.email.trim().toLowerCase() || undefined : existing.email,
          serviceableLocations:
            updates.serviceableLocations !== undefined
              ? Array.from(new Set(updates.serviceableLocations.filter(Boolean)))
              : existing.serviceableLocations,
          supportedVehicleTypes:
            updates.supportedVehicleTypes !== undefined
              ? Array.from(new Set(updates.supportedVehicleTypes.filter(Boolean)))
              : existing.supportedVehicleTypes,
          updatedAt: new Date().toISOString(),
        };
        setTenantVendors((current) =>
          current.map((item) => (item.id === tenantVendorId ? updated : item)),
        );
        return updated;
      },
      listTenantCustomerAddresses: (tenantCustomerId) =>
        tenantCustomerAddresses.filter((item) => item.tenantCustomerId === tenantCustomerId),
      createTenantCustomerAddress: (input) => {
        const now = new Date().toISOString();
        const customerAddresses = tenantCustomerAddresses.filter(
          (item) => item.tenantCustomerId === input.tenantCustomerId,
        );
        const nextSequence = getHighestCustomerAddressSequence(customerAddresses) + 1;
        const resolvedAddressType = input.addressType ?? "both";
        const resolvedAddressUsage = normalizeAddressUsage(input.addressUsage, resolvedAddressType);
        const created: TenantCustomerAddress = {
          ...input,
          customerId: input.customerId ?? input.tenantCustomerId,
          addressCode: input.addressCode?.trim() || formatCustomerAddressCode("CUSTADDR", nextSequence),
          addressType: resolvedAddressType,
          addressTypes:
            input.addressTypes && input.addressTypes.length
              ? Array.from(new Set(input.addressTypes.filter(Boolean)))
              : getLegacyAddressTypes(resolvedAddressType),
          consigneeId: input.consigneeId?.trim() || undefined,
          consigneeName: input.consigneeName?.trim() || undefined,
          operationalAddressType: input.operationalAddressType ?? "PRIMARY",
          addressUsage: resolvedAddressUsage,
          addressLabel: input.addressLabel?.trim() || input.addressName?.trim() || undefined,
          fullAddress:
            input.fullAddress?.trim() ||
            [input.addressLine1?.trim(), input.addressLine2?.trim(), input.city?.trim(), input.state?.trim(), input.pincode?.trim()]
              .filter(Boolean)
              .join(", "),
          contactCode: input.contactCode?.trim() || formatCustomerAddressCode("ADDR", nextSequence),
          gstin: input.gstin?.trim().toUpperCase() || undefined,
          contactPersonName: input.contactPersonName?.trim() || input.contactPerson?.trim() || undefined,
          contactPerson: input.contactPerson?.trim() || input.contactPersonName?.trim() || undefined,
          phone: input.phone?.trim() || input.contactNumber?.trim() || undefined,
          contactNumber: input.contactNumber?.trim() || input.phone?.trim() || undefined,
          id: `customer-address-${Math.random().toString(36).slice(2, 9)}`,
          email: input.email?.trim().toLowerCase() || input.emailId?.trim().toLowerCase() || undefined,
          emailId: input.emailId?.trim().toLowerCase() || input.email?.trim().toLowerCase() || undefined,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          isTemporary: input.isTemporary ?? false,
          remarks: input.remarks?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };
        setTenantCustomerAddresses((current) => {
          const next = created.isDefault
            ? current.map((item) =>
                item.tenantCustomerId === created.tenantCustomerId
                  ? { ...item, isDefault: false, updatedAt: now }
                  : item,
              )
            : current;
          const nextAddresses = [created, ...next];
          const nextAddressCount = nextAddresses.filter(
            (item) => item.tenantCustomerId === created.tenantCustomerId,
          ).length;
          const nextRateCardCount = tenantCustomerRateCards.filter(
            (item) => item.tenantCustomerId === created.tenantCustomerId,
          ).length;
          setTenantCustomers((customers) =>
            customers.map((customer) =>
              customer.id === created.tenantCustomerId
                ? {
                    ...customer,
                    addresses: syncCustomerAddresses(
                      [customer],
                      nextAddresses.filter((item) => item.tenantCustomerId === customer.id),
                    )[0]?.addresses ?? [],
                    setupStatus: deriveCustomerSetupStatus(nextAddressCount, nextRateCardCount),
                    updatedAt: now,
                  }
                : customer,
            ),
          );
          return nextAddresses;
        });
        return created;
      },
      updateTenantCustomerAddress: (addressId, updates) => {
        const existing = tenantCustomerAddresses.find((item) => item.id === addressId);
        if (!existing) {
          throw new Error("Customer address not found.");
        }
        const now = new Date().toISOString();
        const updated: TenantCustomerAddress = {
          ...existing,
          ...updates,
          customerId: existing.customerId ?? existing.tenantCustomerId,
          addressCode:
            updates.addressCode !== undefined
              ? updates.addressCode.trim() || existing.addressCode
              : existing.addressCode,
          addressUsage:
            updates.addressUsage !== undefined
              ? normalizeAddressUsage(updates.addressUsage, updates.addressType ?? existing.addressType)
              : normalizeAddressUsage(existing.addressUsage, existing.addressType),
          consigneeId:
            updates.consigneeId !== undefined
              ? updates.consigneeId.trim() || undefined
              : existing.consigneeId,
          consigneeName:
            updates.consigneeName !== undefined
              ? updates.consigneeName.trim() || undefined
              : existing.consigneeName,
          operationalAddressType: updates.operationalAddressType ?? existing.operationalAddressType ?? "PRIMARY",
          addressLabel:
            updates.addressLabel !== undefined
              ? updates.addressLabel.trim() || undefined
              : existing.addressLabel,
          fullAddress:
            updates.fullAddress !== undefined
              ? updates.fullAddress.trim() || undefined
              : existing.fullAddress,
          addressTypes:
            updates.addressTypes !== undefined
              ? Array.from(new Set(updates.addressTypes.filter(Boolean)))
              : existing.addressTypes ?? getLegacyAddressTypes(existing.addressType),
          contactCode:
            updates.contactCode !== undefined
              ? updates.contactCode.trim() || existing.contactCode
              : existing.contactCode,
          gstin:
            updates.gstin !== undefined
              ? updates.gstin.trim().toUpperCase() || undefined
              : existing.gstin,
          contactPersonName:
            updates.contactPersonName !== undefined
              ? updates.contactPersonName.trim() || undefined
              : updates.contactPerson !== undefined
                ? updates.contactPerson.trim() || undefined
                : existing.contactPersonName ?? existing.contactPerson,
          contactPerson:
            updates.contactPerson !== undefined
              ? updates.contactPerson.trim() || undefined
              : updates.contactPersonName !== undefined
                ? updates.contactPersonName.trim() || undefined
                : existing.contactPerson ?? existing.contactPersonName,
          phone:
            updates.phone !== undefined
              ? updates.phone.trim() || undefined
              : updates.contactNumber !== undefined
                ? updates.contactNumber.trim() || undefined
                : existing.phone ?? existing.contactNumber,
          contactNumber:
            updates.contactNumber !== undefined
              ? updates.contactNumber.trim() || undefined
              : updates.phone !== undefined
                ? updates.phone.trim() || undefined
                : existing.contactNumber ?? existing.phone,
          emailId:
            updates.emailId !== undefined
              ? updates.emailId.trim().toLowerCase() || undefined
              : updates.email !== undefined
                ? updates.email.trim().toLowerCase() || undefined
                : existing.emailId,
          email:
            updates.email !== undefined
              ? updates.email.trim().toLowerCase() || undefined
              : updates.emailId !== undefined
                ? updates.emailId.trim().toLowerCase() || undefined
                : existing.email ?? existing.emailId,
          latitude: updates.latitude !== undefined ? updates.latitude : existing.latitude ?? null,
          longitude: updates.longitude !== undefined ? updates.longitude : existing.longitude ?? null,
          isTemporary: updates.isTemporary !== undefined ? updates.isTemporary : existing.isTemporary ?? false,
          remarks:
            updates.remarks !== undefined
              ? updates.remarks.trim() || undefined
              : existing.remarks,
          updatedAt: now,
        };
        setTenantCustomerAddresses((current) => {
          const nextAddresses = current.map((item) => {
            if (updated.isDefault && item.tenantCustomerId === updated.tenantCustomerId && item.id !== addressId) {
              return { ...item, isDefault: false, updatedAt: now };
            }
            return item.id === addressId ? updated : item;
          });
          const nextAddressCount = nextAddresses.filter(
            (item) => item.tenantCustomerId === updated.tenantCustomerId,
          ).length;
          const nextRateCardCount = tenantCustomerRateCards.filter(
            (item) => item.tenantCustomerId === updated.tenantCustomerId,
          ).length;
          setTenantCustomers((customers) =>
            customers.map((customer) =>
              customer.id === updated.tenantCustomerId
                ? {
                    ...customer,
                    addresses: syncCustomerAddresses(
                      [customer],
                      nextAddresses.filter((item) => item.tenantCustomerId === customer.id),
                    )[0]?.addresses ?? [],
                    setupStatus: deriveCustomerSetupStatus(nextAddressCount, nextRateCardCount),
                    updatedAt: now,
                  }
                : customer,
            ),
          );
          return nextAddresses;
        });
        return updated;
      },
      deleteTenantCustomerAddress: (addressId) => {
        const existing = tenantCustomerAddresses.find((item) => item.id === addressId);
        if (!existing) {
          return false;
        }
        const now = new Date().toISOString();
        setTenantCustomerAddresses((current) => {
          const nextAddresses = current.filter((item) => item.id !== addressId);
          const nextAddressCount = nextAddresses.filter(
            (item) => item.tenantCustomerId === existing.tenantCustomerId,
          ).length;
          const nextRateCardCount = tenantCustomerRateCards.filter(
            (item) => item.tenantCustomerId === existing.tenantCustomerId,
          ).length;
          setTenantCustomers((customers) =>
            customers.map((customer) =>
              customer.id === existing.tenantCustomerId
                ? {
                    ...customer,
                    addresses: syncCustomerAddresses(
                      [customer],
                      nextAddresses.filter((item) => item.tenantCustomerId === customer.id),
                    )[0]?.addresses ?? [],
                    setupStatus: deriveCustomerSetupStatus(nextAddressCount, nextRateCardCount),
                    updatedAt: now,
                  }
                : customer,
            ),
          );
          return nextAddresses;
        });
        return true;
      },
      listTenantCustomerRateCards: (tenantCustomerId) =>
        tenantCustomerRateCards.filter((item) => item.tenantCustomerId === tenantCustomerId),
      createTenantCustomerRateCard: (input) => {
        const now = new Date().toISOString();
        const created = normalizeStoredTenantCustomerRateCard({
          ...input,
          lanes: input.lanes?.trim() || `${input.fromLocation?.trim() || input.sourcePincode} -> ${input.toLocation?.trim() || input.destinationPincode}`,
          fromCity: input.fromCity?.trim() || input.fromLocation?.trim() || input.sourcePincode,
          toCity: input.toCity?.trim() || input.toLocation?.trim() || input.destinationPincode,
          fromLocation: input.fromLocation?.trim() || input.sourcePincode,
          toLocation: input.toLocation?.trim() || input.destinationPincode,
          underloadRate: input.underloadRate ?? input.baseRate ?? input.rate,
          overloadRate: input.overloadRate ?? null,
          tat: input.tat?.trim() || input.transitTime?.trim() || undefined,
          baseRate: input.baseRate ?? input.underloadRate ?? input.rate,
          minLoad: input.minLoad ?? null,
          maxLoad: input.maxLoad ?? null,
          transitTime: input.transitTime?.trim() || input.tat?.trim() || undefined,
          effectiveFromDate: input.effectiveFromDate?.trim() || undefined,
          effectiveToDate: input.effectiveToDate?.trim() || undefined,
          remarks: input.remarks?.trim() || undefined,
          id: `rate-card-${Math.random().toString(36).slice(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        });
        setTenantCustomerRateCards((current) => {
          const nextRateCards = [created, ...current];
          const nextRateCardCount = nextRateCards.filter(
            (item) => item.tenantCustomerId === created.tenantCustomerId,
          ).length;
          const nextAddressCount = tenantCustomerAddresses.filter(
            (item) => item.tenantCustomerId === created.tenantCustomerId,
          ).length;
          setTenantCustomers((customers) =>
            customers.map((customer) =>
              customer.id === created.tenantCustomerId
                ? {
                    ...customer,
                    setupStatus: deriveCustomerSetupStatus(nextAddressCount, nextRateCardCount),
                    updatedAt: now,
                  }
                : customer,
            ),
          );
          return nextRateCards;
        });
        return created;
      },
      updateTenantCustomerRateCard: (rateCardId, updates) => {
        const existing = tenantCustomerRateCards.find((item) => item.id === rateCardId);
        if (!existing) {
          throw new Error("Rate card not found.");
        }
        const updated = normalizeStoredTenantCustomerRateCard({
          ...existing,
          ...updates,
          lanes:
            updates.lanes !== undefined
              ? updates.lanes.trim() || `${updates.fromLocation?.trim() || updates.sourcePincode || existing.fromLocation || existing.sourcePincode} -> ${updates.toLocation?.trim() || updates.destinationPincode || existing.toLocation || existing.destinationPincode}`
              : existing.lanes,
          fromCity:
            updates.fromCity !== undefined
              ? updates.fromCity.trim() || updates.fromLocation?.trim() || updates.sourcePincode || existing.fromCity || existing.fromLocation || existing.sourcePincode
              : existing.fromCity,
          toCity:
            updates.toCity !== undefined
              ? updates.toCity.trim() || updates.toLocation?.trim() || updates.destinationPincode || existing.toCity || existing.toLocation || existing.destinationPincode
              : existing.toCity,
          fromLocation:
            updates.fromLocation !== undefined
              ? updates.fromLocation.trim() || updates.sourcePincode || existing.sourcePincode
              : existing.fromLocation,
          toLocation:
            updates.toLocation !== undefined
              ? updates.toLocation.trim() || updates.destinationPincode || existing.destinationPincode
              : existing.toLocation,
          underloadRate:
            updates.underloadRate !== undefined
              ? updates.underloadRate
              : updates.baseRate !== undefined
                ? updates.baseRate
                : existing.underloadRate ?? existing.baseRate ?? existing.rate,
          overloadRate:
            updates.overloadRate !== undefined ? updates.overloadRate : existing.overloadRate ?? null,
          tat:
            updates.tat !== undefined
              ? updates.tat.trim() || undefined
              : updates.transitTime !== undefined
                ? updates.transitTime.trim() || undefined
                : existing.tat,
          baseRate:
            updates.baseRate !== undefined
              ? updates.baseRate
              : updates.underloadRate !== undefined
                ? updates.underloadRate
                : existing.baseRate ?? existing.underloadRate ?? existing.rate,
          rate:
            updates.rate !== undefined
              ? updates.rate
              : updates.baseRate !== undefined
                ? updates.baseRate
                : updates.underloadRate !== undefined
                  ? updates.underloadRate
                  : existing.rate,
          minLoad: updates.minLoad !== undefined ? updates.minLoad : existing.minLoad ?? null,
          maxLoad: updates.maxLoad !== undefined ? updates.maxLoad : existing.maxLoad ?? null,
          transitTime:
            updates.transitTime !== undefined
              ? updates.transitTime.trim() || undefined
              : existing.transitTime,
          effectiveFromDate:
            updates.effectiveFromDate !== undefined
              ? updates.effectiveFromDate.trim() || undefined
              : existing.effectiveFromDate,
          effectiveToDate:
            updates.effectiveToDate !== undefined
              ? updates.effectiveToDate.trim() || undefined
              : existing.effectiveToDate,
          remarks:
            updates.remarks !== undefined ? updates.remarks.trim() || undefined : existing.remarks,
          updatedAt: new Date().toISOString(),
        });
        setTenantCustomerRateCards((current) => {
          const nextRateCards = current.map((item) => (item.id === rateCardId ? updated : item));
          const nextRateCardCount = nextRateCards.filter(
            (item) => item.tenantCustomerId === updated.tenantCustomerId,
          ).length;
          const nextAddressCount = tenantCustomerAddresses.filter(
            (item) => item.tenantCustomerId === updated.tenantCustomerId,
          ).length;
          setTenantCustomers((customers) =>
            customers.map((customer) =>
              customer.id === updated.tenantCustomerId
                ? {
                    ...customer,
                    setupStatus: deriveCustomerSetupStatus(nextAddressCount, nextRateCardCount),
                    updatedAt: updated.updatedAt,
                  }
                : customer,
            ),
          );
          return nextRateCards;
        });
        return updated;
      },
      deleteTenantCustomerRateCard: (rateCardId) => {
        const existing = tenantCustomerRateCards.find((item) => item.id === rateCardId);
        if (!existing) {
          return false;
        }
        const now = new Date().toISOString();
        setTenantCustomerRateCards((current) => {
          const nextRateCards = current.filter((item) => item.id !== rateCardId);
          const nextRateCardCount = nextRateCards.filter(
            (item) => item.tenantCustomerId === existing.tenantCustomerId,
          ).length;
          const nextAddressCount = tenantCustomerAddresses.filter(
            (item) => item.tenantCustomerId === existing.tenantCustomerId,
          ).length;
          setTenantCustomers((customers) =>
            customers.map((customer) =>
              customer.id === existing.tenantCustomerId
                ? {
                    ...customer,
                    setupStatus: deriveCustomerSetupStatus(nextAddressCount, nextRateCardCount),
                    updatedAt: now,
                  }
                : customer,
            ),
          );
          return nextRateCards;
        });
        return true;
      },
      listTenantBookings: (tenantId) =>
        tenantBookings
          .filter((item) => item.tenantId === tenantId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      getTenantBookingById: (bookingId) =>
        tenantBookings.find((item) => matchesBookingId(item, bookingId)) ?? null,
      createTenantBooking: (input) => {
        const now = new Date().toISOString();
        const tenantBookingCount = tenantBookings.filter((item) => item.tenantId === input.tenantId).length + 1;
        const bookingId = `BKG-${new Date(now).getFullYear()}-${String(tenantBookingCount).padStart(4, "0")}`;
        const created: BookingRecord = {
          ...input,
          id: `booking-${Math.random().toString(36).slice(2, 9)}`,
          bookingId,
          modeOfTransport: input.modeOfTransport ?? "ROAD",
          numberOfDeliveries: input.numberOfDeliveries ?? input.deliveries?.length ?? 1,
          poNumber: input.poNumber ?? null,
          doNumber: input.doNumber ?? null,
          ewayBillNumber: input.ewayBillNumber ?? null,
          pickupDate: input.pickupDate ?? null,
          pickupTime: input.pickupTime ?? null,
          tat: input.tat ?? null,
          chargeType: input.chargeType ?? null,
          subBrand: input.subBrand ?? null,
          weightUom: input.weightUom ?? input.uom,
          remarks: [...input.remarks],
          destinationChangeRequests: [...(input.destinationChangeRequests ?? [])],
          operationalFlags: [...(input.operationalFlags ?? [])],
          statusTimeline: [...input.statusTimeline],
          pod: input.pod ?? null,
          documents: [...(input.documents ?? [])],
          expenses: [...(input.expenses ?? [])],
          deliveries:
            input.deliveries && input.deliveries.length
              ? input.deliveries.map((delivery, index) => ({
                  ...delivery,
                  deliveryNo: delivery.deliveryNo ?? index + 1,
                  trackingId: delivery.trackingId?.trim() || buildTrackingId(bookingId, index + 1),
                  status: delivery.status ?? input.status,
                  lrNumber: delivery.lrNumber ?? null,
                  quantity: delivery.quantity ?? input.quantity,
                  uom: delivery.uom ?? input.uom,
                  weight: delivery.weight ?? input.weight,
                  weightUom: delivery.weightUom ?? input.weightUom ?? input.uom,
                  distanceKm: delivery.distanceKm ?? input.pricing.distanceKm ?? null,
                  pod: delivery.pod ?? null,
                  lrId: delivery.lrId ?? null,
                  routeLabel: delivery.routeLabel ?? `${delivery.originCity ?? "Origin"} -> ${delivery.destinationCity ?? "Destination"}`,
                  eta: delivery.eta ?? null,
                  deliverySequence: delivery.deliverySequence ?? delivery.deliveryNo ?? index + 1,
                  freightRate: delivery.freightRate ?? input.pricing.calculatedFreight ?? null,
                  tripImpactSummary: delivery.tripImpactSummary ?? "Base delivery record.",
                  contactPerson: delivery.contactPerson ?? null,
                  contactNumber: delivery.contactNumber ?? null,
                  unloadingNotes: delivery.unloadingNotes ?? null,
                  instructions: delivery.instructions ?? null,
                  activeRevisionId: delivery.activeRevisionId ?? null,
                  revisions: [...(delivery.revisions ?? [])],
                }))
              : [
                  {
                    id: `delivery-${Math.random().toString(36).slice(2, 9)}`,
                    deliveryNo: 1,
                    trackingId: buildTrackingId(bookingId, 1),
                    originAddressId: input.sourceAddressId,
                    destinationAddressId: input.destinationAddressId,
                    materialId: input.materialIds[0] ?? "",
                    quantity: input.quantity,
                    uom: input.uom,
                    weight: input.weight,
                    weightUom: input.weightUom ?? input.uom,
                    distanceKm: input.pricing.distanceKm ?? null,
                    status: input.status,
                    lrNumber: null,
                    lrId: null,
                    pod: null,
                    routeLabel: `${input.sourceAddressId} -> ${input.destinationAddressId}`,
                    eta: null,
                    deliverySequence: 1,
                    freightRate: input.pricing.calculatedFreight ?? null,
                    tripImpactSummary: "Base delivery record.",
                    contactPerson: null,
                    contactNumber: null,
                    unloadingNotes: null,
                    instructions: null,
                    activeRevisionId: null,
                    revisions: [],
                  },
                ],
          assignment: input.assignment ?? null,
          lrIds: [...(input.lrIds ?? [])],
          createdAt: now,
          updatedAt: now,
        };
        setTenantBookings((current) => [created, ...current]);
        return created;
      },
      updateTenantBooking: (bookingId, updates) => {
        let updatedRecord: BookingRecord | null = null;
        setTenantBookings((current) =>
          current.map((item) => {
            if (!matchesBookingId(item, bookingId)) {
              return item;
            }
    const updated: BookingRecord = {
      ...item,
              ...updates,
              pricing: updates.pricing ? { ...item.pricing, ...updates.pricing } : item.pricing,
              assignment: updates.assignment !== undefined ? updates.assignment : item.assignment,
              lrIds: updates.lrIds !== undefined ? [...updates.lrIds] : item.lrIds ?? [],
              pod: updates.pod !== undefined ? updates.pod : item.pod ?? null,
              documents: updates.documents !== undefined ? [...updates.documents] : item.documents ?? [],
              expenses: updates.expenses !== undefined ? [...updates.expenses] : item.expenses ?? [],
              remarks: updates.remarks !== undefined ? [...updates.remarks] : item.remarks ?? [],
              destinationChangeRequests:
                updates.destinationChangeRequests !== undefined
                  ? [...updates.destinationChangeRequests]
                  : item.destinationChangeRequests ?? [],
              operationalFlags:
                updates.operationalFlags !== undefined
                  ? [...updates.operationalFlags]
                  : item.operationalFlags ?? [],
              deliveries:
                updates.deliveries !== undefined
                  ? updates.deliveries.map((delivery, index) => ({
                      ...delivery,
                      deliveryNo: delivery.deliveryNo ?? index + 1,
                      trackingId: delivery.trackingId?.trim() || buildTrackingId(item.bookingId, index + 1),
                      status: delivery.status ?? item.status,
                      lrNumber: delivery.lrNumber ?? null,
                      quantity: delivery.quantity ?? item.quantity,
                      uom: delivery.uom ?? item.uom,
                      weight: delivery.weight ?? item.weight,
                      weightUom: delivery.weightUom ?? item.weightUom ?? item.uom,
                      distanceKm: delivery.distanceKm ?? item.pricing.distanceKm ?? null,
                      pod: delivery.pod ?? null,
                      lrId: delivery.lrId ?? null,
                      routeLabel: delivery.routeLabel ?? `${delivery.originCity ?? "Origin"} -> ${delivery.destinationCity ?? "Destination"}`,
                      eta: delivery.eta ?? null,
                      deliverySequence: delivery.deliverySequence ?? delivery.deliveryNo ?? index + 1,
                      freightRate: delivery.freightRate ?? item.pricing.calculatedFreight ?? null,
                      tripImpactSummary: delivery.tripImpactSummary ?? "Base delivery record.",
                      contactPerson: delivery.contactPerson ?? null,
                      contactNumber: delivery.contactNumber ?? null,
                      unloadingNotes: delivery.unloadingNotes ?? null,
                      instructions: delivery.instructions ?? null,
                      activeRevisionId: delivery.activeRevisionId ?? null,
                      revisions: [...(delivery.revisions ?? [])],
                    }))
                  : item.deliveries ?? [],
              weightUom: updates.weightUom !== undefined ? updates.weightUom : item.weightUom ?? item.uom,
              updatedAt: new Date().toISOString(),
            };
            updatedRecord = updated;
            return updated;
          }),
        );
        if (!updatedRecord) {
          throw new Error("Booking not found.");
        }
        return updatedRecord;
      },
      transitionTenantBookingStatus: (bookingId, transition) => {
        let updatedRecord: BookingRecord | null = null;
        setTenantBookings((current) =>
          current.map((item) => {
            if (!matchesBookingId(item, bookingId)) {
              return item;
            }
            if (item.status === transition.status) {
              console.log("[MockStore] transitionTenantBookingStatus", {
                currentStatus: item.status,
                targetStatus: transition.status,
              });
              updatedRecord = item;
              return item;
            }
            if (["PAID", "DISPUTED", "CANCELLED"].includes(item.status)) {
              throw new Error(`Transition from terminal state ${item.status} is not allowed.`);
            }
            if (transition.status === "CANCELLED" && !canCancelBooking(item.status)) {
              throw new Error(`Cancellation is allowed only before loading starts. Current state: ${item.status}.`);
            }
            if (!canTransitionBooking(item.status, transition.status)) {
              throw new Error(`Transition from ${item.status} to ${transition.status} is not allowed.`);
            }
            const timestamp = new Date().toISOString();
            const updated: BookingRecord = {
              ...item,
              status: transition.status,
              updatedAt: timestamp,
              deliveries: syncBookingDeliveriesStatus(item.deliveries, transition.status),
              statusTimeline: [
                ...item.statusTimeline,
                {
                  id: `booking-status-${Date.now()}`,
                  status: transition.status,
                  timestamp,
                  actor: transition.actor,
                  note: transition.note,
                },
              ],
              remarks: transition.note
                ? [
                    ...item.remarks,
                    {
                      id: `booking-remark-${Date.now()}`,
                      timestamp,
                      actor: transition.actor,
                      type:
                        transition.status === "CANCELLED"
                          ? "CANCELLATION_REMARK"
                          : transition.status === "EXCEPTION"
                            ? "EXCEPTION_REMARK"
                            : item.status === "PENDING_RATE_APPROVAL" &&
                                (transition.status === "PENDING_ASSIGNMENT" || transition.status === "DRAFT")
                              ? "APPROVAL_REMARK"
                              : "SYSTEM_REMARK",
                      message: transition.note,
                    },
                  ]
                : item.remarks,
            };
            updatedRecord = updated;
            return updated;
          }),
        );
        if (!updatedRecord) {
          throw new Error("Booking not found.");
        }
        setTenantLrs((current) =>
          current.map((record) =>
            record.bookingId === updatedRecord?.id
              ? {
                  ...record,
                  status: transition.status === "CANCELLED" ? "VOID" : mapLrStatusFromBookingStatus(transition.status),
                  updatedAt: new Date().toISOString(),
                }
              : record,
          ),
        );
        return updatedRecord;
      },
      assignTenantBooking: (bookingId, input) => {
        const existing = tenantBookings.find((item) => matchesBookingId(item, bookingId));
        if (!existing) {
          throw new Error("Booking not found.");
        }
        if (!canTransitionBooking(existing.status, "ACCEPTED")) {
          throw new Error(`Booking in ${existing.status} cannot be assigned.`);
        }
        const vehicle = tenantVehicles.find((item) => item.id === input.vehicleId);
        const driver = tenantDrivers.find((item) => item.id === input.driverId);
        if (!vehicle || !vehicle.isActive) {
          throw new Error("Select an active vehicle.");
        }
        if (!driver || !driver.isActive) {
          throw new Error("Select an active driver.");
        }
        if ((vehicle.vendorId ?? null) !== (driver.vendorId ?? null)) {
          throw new Error("Driver must match the selected vehicle ownership.");
        }
        const timestamp = new Date().toISOString();
          const bookingForAssignment: BookingRecord = {
            ...existing,
            lrType: input.lrType ?? existing.lrType,
            manualLrPoolPreference:
              input.manualLrPoolPreference ?? existing.manualLrPoolPreference ?? "GENERAL",
          };
        const lrAssignment = buildTenantLrAssignmentsForBooking({
          tenantId: existing.tenantId,
          booking: bookingForAssignment,
          configs: tenantLRConfigs,
          existingRecords: tenantLrs,
          existingPools: tenantLrPools,
          actorOrgUnitId: input.orgUnitId ?? null,
          actorUserId: input.actorUserId ?? null,
          selectedConfigId: input.lrConfigId ?? null,
          preferredLrNumber: input.preferredLrNumber ?? null,
          timestamp,
        });
        const nextLrIds = lrAssignment.bookingLrIds;
        const nextPools = tenantLrPools.map((pool) => {
          const assignedRecord = lrAssignment.records.find(
            (record) => record.configId === pool.configId && record.lrNumber === pool.lrNumber,
          );
          if (!assignedRecord) {
            return pool;
          }
          return appendPoolAuditEvent({
            ...pool,
            status: "USED" as const,
            bookingId: existing.id,
            deliveryId: assignedRecord.deliveryId,
            usedAt: timestamp,
            updatedAt: timestamp,
          }, {
            action: "CONSUMED",
            poolType: pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL"),
            customerId: pool.customerId ?? assignedRecord.customerId ?? null,
            fromPlaceId: pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
            toPlaceId: pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
            actor: input.actor,
            role: input.actor,
            timestamp,
            note: `Booking ${existing.bookingId}`,
          });
        });
        const acceptedStatusEventId = `booking-status-${Date.now()}-accepted`;
        const assignedStatusEventId = `booking-status-${Date.now()}-vehicle`;
          const updated: BookingRecord = {
            ...existing,
            lrType: bookingForAssignment.lrType,
            manualLrPoolPreference: bookingForAssignment.manualLrPoolPreference ?? "GENERAL",
            status: "VEHICLE_ASSIGNED",
          assignment: {
            vendorId: input.vendorId,
            vendorName: input.vendorName,
            vehicleId: input.vehicleId,
            vehicleLabel: input.vehicleLabel,
            driverId: input.driverId,
            driverName: input.driverName,
            vendorFreight: input.vendorFreight,
            vendorRateCardId: input.vendorRateCardId ?? null,
            vendorRateType: input.vendorRateType ?? null,
            vendorContractSource: input.vendorContractSource ?? null,
            customerFreight: input.customerFreight ?? existing.pricing.calculatedFreight,
            sellingRateLabel: input.sellingRateLabel ?? null,
            buyingRateLabel: input.buyingRateLabel ?? null,
            marginAmount: input.marginAmount ?? null,
            marginPercent: input.marginPercent,
            assignedAt: timestamp,
            lrNumber: lrAssignment.records[0]?.lrNumber ?? existing.assignment?.lrNumber ?? null,
            loadingStartedAt: existing.assignment?.loadingStartedAt ?? null,
            loadingCompletedAt: existing.assignment?.loadingCompletedAt ?? null,
          },
          updatedAt: timestamp,
          deliveries: (existing.deliveries ?? []).map((delivery) => {
            const assignedRecord = lrAssignment.deliveryLrMap.get(delivery.id) ?? null;
            return {
              ...delivery,
              status: "VEHICLE_ASSIGNED",
              lrNumber: assignedRecord?.lrNumber ?? delivery.lrNumber ?? null,
              lrId: assignedRecord?.id ?? delivery.lrId ?? null,
            };
          }),
          lrIds: nextLrIds,
          statusTimeline: [
            ...existing.statusTimeline,
            {
              id: acceptedStatusEventId,
              status: "ACCEPTED",
              timestamp,
              actor: input.actor,
              note: `Booking accepted for allocation under ${input.vendorName}.`,
            },
            {
              id: assignedStatusEventId,
              status: "VEHICLE_ASSIGNED",
              timestamp,
              actor: input.actor,
              note: `Vehicle ${input.vehicleLabel} assigned under ${input.vendorName}.`,
            },
          ],
          remarks: [
            ...existing.remarks,
            {
              id: `booking-remark-${Date.now()}`,
              timestamp,
              actor: input.actor,
              type: "SYSTEM_REMARK",
              message: `Assigned ${input.vehicleLabel} to ${input.driverName} under ${input.vendorName}.`,
            },
          ],
        };
        setTenantBookings((current) => current.map((item) => (item.id === bookingId ? updated : item)));
        setTenantLrs((current) => {
          const next = [...current.filter((record) => record.bookingId !== existing.id)];
          lrAssignment.records.forEach((record) => {
            const existingRecord = current.find((item) => item.id === record.id);
            next.unshift({
              ...record,
              status: "ASSIGNED",
              updatedAt: timestamp,
              createdAt: existingRecord?.createdAt ?? record.createdAt,
            });
          });
          return next;
        });
        setTenantLrPools(nextPools);
        setPlatformAuditLogs((current) => [
          {
            id: `p-log-${Date.now()}`,
            actor: input.actor ?? "Tenant User",
            action: "consumed LR for booking",
            entityType: "lr_booking",
            entityName: existing.bookingId,
            tenantId: existing.tenantId,
            timestamp,
            result: "success",
          },
          ...current,
        ]);
        return updated;
      },
      reassignTenantBooking: (bookingId, input) => {
        const existing = tenantBookings.find((item) => matchesBookingId(item, bookingId));
        if (!existing) {
          throw new Error("Booking not found.");
        }
        if (!existing.assignment) {
          throw new Error("Booking has no active assignment.");
        }
        if (["DRAFT", "CANCELLED", "COMPLETED", "INVOICED"].includes(existing.status)) {
          throw new Error(`Booking in ${existing.status} cannot be reassigned.`);
        }
        if (!input.remark.trim()) {
          throw new Error("Operational remark is required.");
        }

        const allowedStatuses = [
          "VEHICLE_ASSIGNED",
          "LOADING_STARTED",
          "LOADING_COMPLETED",
          "DOCUMENT_PENDING",
          "DOCUMENT_COMPLETED",
          "READY_FOR_DISPATCH",
          "DISPATCHED",
          "IN_TRANSIT",
          "POD_PENDING",
          "ASSIGNED",
        ];
        if (!allowedStatuses.includes(existing.status)) {
          throw new Error(`Operational reassignment is not allowed in ${existing.status}.`);
        }

        const currentAssignment = existing.assignment;
        const documents = ensureShipmentDocuments(existing);
        const documentUploaded =
          documents.deliveries.some((delivery) => delivery.invoices.length > 0 || Boolean(delivery.ewayBill?.ewayBillNumber));
        const nextVehicleId =
          input.changeType === "DRIVER"
            ? currentAssignment.vehicleId
            : input.vehicleId ?? currentAssignment.vehicleId;
        const nextDriverId =
          input.changeType === "VEHICLE"
            ? currentAssignment.driverId
            : input.driverId ?? currentAssignment.driverId;

        if (input.changeType === "DRIVER" && nextDriverId === currentAssignment.driverId) {
          throw new Error("New driver must be different from current driver.");
        }
        if (
          ["VEHICLE", "VEHICLE_DRIVER", "VENDOR_VEHICLE_DRIVER", "DRIVER_AND_VEHICLE"].includes(input.changeType) &&
          nextVehicleId === currentAssignment.vehicleId
        ) {
          throw new Error("New vehicle must be different from current vehicle.");
        }

        const nextVehicle = tenantVehicles.find((item) => item.id === nextVehicleId);
        const nextDriver = tenantDrivers.find((item) => item.id === nextDriverId);
        if (!nextVehicle || (!nextVehicle.isActive && !input.overrideAvailability)) {
          throw new Error("Select an active available vehicle.");
        }
        if (!nextDriver || (!nextDriver.isActive && !input.overrideAvailability)) {
          throw new Error("Select an active available driver.");
        }
        const nextVendorId =
          input.changeType === "VENDOR_VEHICLE_DRIVER"
            ? input.vendorId ?? nextVehicle.vendorId ?? null
            : nextVehicle.vendorId ?? null;
        const nextVendorName =
          input.vendorName?.trim() ||
          tenantVendors.find((item) => item.id === nextVendorId)?.name ||
          currentAssignment.vendorName;
        const vendorChanged = (nextVendorId ?? null) !== (currentAssignment.vendorId ?? null);
        if (
          documentUploaded &&
          vendorChanged &&
          (!input.newInvoiceDocument?.trim() || !input.newEwayBillDocument?.trim())
        ) {
          throw new Error("New invoice and e-waybill are required when vendor is changed after document upload.");
        }
        const customerFreight = currentAssignment.customerFreight ?? existing.pricing.calculatedFreight;
        const newVendorFreight =
          input.newVendorFreight ??
          (input.changeType === "DRIVER"
            ? currentAssignment.vendorFreight ?? null
            : currentAssignment.vendorFreight ?? null);
        const marginImpact =
          typeof customerFreight === "number" && typeof newVendorFreight === "number"
            ? Number((customerFreight - newVendorFreight).toFixed(2))
            : currentAssignment.marginAmount ?? null;
        const timestamp = new Date().toISOString();
        const remarkType =
          input.changeType === "DRIVER"
            ? "DRIVER_CHANGED"
            : input.changeType === "VEHICLE"
              ? "VEHICLE_CHANGED"
              : input.changeType === "VENDOR_VEHICLE_DRIVER"
                ? "VENDOR_VEHICLE_DRIVER_CHANGED"
                : "VEHICLE_DRIVER_CHANGED";
        const changeLabel =
          input.changeType === "DRIVER"
            ? `Driver changed from ${currentAssignment.driverName} to ${nextDriver.name}`
            : input.changeType === "VEHICLE"
              ? `Vehicle changed from ${currentAssignment.vehicleLabel} to ${nextVehicle.registrationNumber}`
              : input.changeType === "VENDOR_VEHICLE_DRIVER"
                ? `Vendor, vehicle, and driver changed from ${currentAssignment.vendorName} / ${currentAssignment.vehicleLabel} / ${currentAssignment.driverName} to ${nextVendorName} / ${nextVehicle.registrationNumber} / ${nextDriver.name}`
                : `Vehicle and driver changed from ${currentAssignment.driverName} / ${currentAssignment.vehicleLabel} to ${nextDriver.name} / ${nextVehicle.registrationNumber}`;

        const historyRecord = {
          id: `assignment-history-${Math.random().toString(36).slice(2, 9)}`,
          changeType: input.changeType,
          previousVendorId: currentAssignment.vendorId ?? null,
          previousVendorName: currentAssignment.vendorName ?? null,
          previousVehicleId: currentAssignment.vehicleId ?? null,
          previousVehicleNumber: currentAssignment.vehicleLabel ?? null,
          previousDriverId: currentAssignment.driverId ?? null,
          previousDriverName: currentAssignment.driverName ?? null,
          newVendorId: nextVendorId,
          newVendorName: nextVendorName,
          newVehicleId: nextVehicle.id,
          newVehicleNumber: nextVehicle.registrationNumber,
          newDriverId: nextDriver.id,
          newDriverName: nextDriver.name,
          previousVendorFreight: currentAssignment.vendorFreight ?? null,
          newVendorFreight,
          customerFreight,
          marginImpact,
          reason: input.reason,
          remark: input.remark.trim(),
          location: input.location?.trim() || null,
          effectiveAt: input.effectiveAt,
          newInvoiceDocument: input.newInvoiceDocument?.trim() || null,
          newEwayBillDocument: input.newEwayBillDocument?.trim() || null,
          changedByUserId: input.actorUserId ?? null,
          changedByUserName: input.actor,
          changedByRole: input.actorRole ?? null,
          bookingStatusAtChange: existing.status,
          createdAt: timestamp,
        };

        const updated: BookingRecord = {
          ...existing,
          assignment: {
            ...currentAssignment,
            vendorId: nextVendorId,
            vendorName: nextVendorName,
            vehicleId: nextVehicle.id,
            vehicleLabel: nextVehicle.registrationNumber,
            driverId: nextDriver.id,
            driverName: nextDriver.name,
            vendorFreight: newVendorFreight,
            marginAmount: marginImpact,
            marginPercent:
              typeof customerFreight === "number" && typeof newVendorFreight === "number" && customerFreight > 0
                ? Number((((customerFreight - newVendorFreight) / customerFreight) * 100).toFixed(2))
                : currentAssignment.marginPercent ?? null,
          },
          assignmentHistory: [historyRecord, ...(existing.assignmentHistory ?? [])],
          updatedAt: timestamp,
          remarks: [
            {
              id: `booking-remark-${Date.now()}`,
              timestamp,
              actor: input.actor,
              type: remarkType,
              location: input.location?.trim() || null,
              message: `${changeLabel} due to ${input.reason.replace(/_/g, " ")}. ${input.remark.trim()}`,
            },
            ...existing.remarks,
          ],
          statusTimeline: [
            ...existing.statusTimeline,
            {
              id: `booking-status-${Date.now()}-reassignment`,
              status: existing.status,
              timestamp,
              actor: input.actor,
              note: `${changeLabel}. LR remains linked. Customer freight unchanged.`,
            },
          ],
        };

        setTenantBookings((current) => current.map((item) => (item.id === existing.id ? updated : item)));
        setTenantDrivers((current) =>
          current.map((driver) => {
            if (driver.id === currentAssignment.driverId && input.changeType !== "VEHICLE") {
              return { ...driver, assignedVehicleId: null, updatedAt: timestamp };
            }
            if (driver.id === nextDriver.id) {
              return { ...driver, assignedVehicleId: nextVehicle.id, updatedAt: timestamp };
            }
            return driver;
          }),
        );
        setPlatformAuditLogs((current) => [
          {
            id: `p-log-${Date.now()}-reassignment`,
            actor: input.actor,
            action: "operational reassignment",
            entityType: "booking_assignment",
            entityName: existing.bookingId,
            tenantId: existing.tenantId,
            timestamp,
            result: "success",
          },
          ...current,
        ]);
        return updated;
      },
      replaceTenantBookingVehicle: (bookingId, input) => {
        const existing = tenantBookings.find((item) => item.id === bookingId || item.bookingId === bookingId);
        if (!existing) {
          throw new Error("Booking not found.");
        }
        if (!existing.assignment) {
          throw new Error("Vehicle replacement requires an active assignment.");
        }
        if (["COMPLETED", "INVOICED", "CANCELLED"].includes(existing.status)) {
          throw new Error(`Vehicle replacement is not allowed in ${existing.status}.`);
        }
        const allowedStatuses = ["VEHICLE_ASSIGNED", "LOADING_STARTED", "LOADING_COMPLETED", "DOCUMENT_PENDING", "DOCUMENT_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT", "POD_PENDING", "ASSIGNED"];
        if (!allowedStatuses.includes(existing.status)) {
          throw new Error(`Vehicle replacement is not allowed in ${existing.status}.`);
        }
        if (!input.remark.trim()) {
          throw new Error("Replacement remark is required.");
        }
        const currentAssignment = existing.assignment;
        const documents = ensureShipmentDocuments(existing);
        const documentUploadedBeforeReplacement = documents.deliveries.some(
          (delivery) => delivery.invoices.length > 0 || Boolean(delivery.ewayBill?.ewayBillNumber),
        );
        const oldInvoiceNumbers = documents.deliveries.flatMap((delivery) =>
          delivery.invoices.map((invoice) => invoice.invoiceNumber).filter(Boolean),
        );
        const oldEwayBillNumbers = documents.deliveries
          .map((delivery) => delivery.ewayBill?.ewayBillNumber ?? "")
          .filter(Boolean);
        const timestamp = new Date().toISOString();
        const historyBase: BookingVehicleReplacementHistoryRecord = {
          id: `vehicle-replacement-${Math.random().toString(36).slice(2, 9)}`,
          requestStage: existing.status,
          replacementType: input.replacementType,
          previousVendorId: currentAssignment.vendorId ?? null,
          previousVendorName: currentAssignment.vendorName ?? null,
          previousVehicleId: currentAssignment.vehicleId ?? null,
          previousVehicleNumber: currentAssignment.vehicleLabel ?? null,
          previousDriverId: currentAssignment.driverId ?? null,
          previousDriverName: currentAssignment.driverName ?? null,
          documentUploadedBeforeReplacement,
          oldInvoiceNumbers,
          oldEwayBillNumbers,
          oldVendorRate: currentAssignment.vendorFreight ?? null,
          newVendorRate: input.newVendorRate ?? null,
          marginImpact: null,
          reason: input.reason,
          remark: input.remark.trim(),
          requestedBy: input.actor,
          requestedAt: timestamp,
          bookingStatusAtReplacement: existing.status,
          location: input.location?.trim() || null,
          effectiveAt: input.effectiveAt ?? timestamp,
          status: documentUploadedBeforeReplacement
            ? currentAssignment.vendorId
              ? "SENT_TO_VENDOR"
              : "INTERNAL_REPLACEMENT_REQUIRED"
            : "COMPLETED",
        };

        if (documentUploadedBeforeReplacement) {
          const requestRecord = {
            ...historyBase,
            vendorActionStatus: historyBase.status,
          };
          const updated: BookingRecord = {
            ...existing,
            vehicleReplacementHistory: [requestRecord, ...(existing.vehicleReplacementHistory ?? [])],
            updatedAt: timestamp,
            remarks: [
              {
                id: `booking-remark-${Date.now()}-vehicle-request`,
                timestamp,
                actor: input.actor,
                type: "VEHICLE_REPLACED",
                location: input.location?.trim() || null,
                message:
                  requestRecord.status === "SENT_TO_VENDOR"
                    ? `Vehicle replacement requested and sent to vendor. ${input.remark.trim()}`
                    : `Vehicle replacement requested. Internal replacement required. ${input.remark.trim()}`,
              },
              ...existing.remarks,
            ],
            statusTimeline: [
              ...existing.statusTimeline,
              {
                id: `booking-status-${Date.now()}-vehicle-request`,
                status: existing.status,
                timestamp,
                actor: input.actor,
                note:
                  requestRecord.status === "SENT_TO_VENDOR"
                    ? "Vehicle replacement request sent to vendor after invoice/e-waybill upload."
                    : "Vehicle replacement requires internal action after invoice/e-waybill upload.",
              },
            ],
          };
          setTenantBookings((current) => current.map((item) => (item.id === existing.id ? updated : item)));
          return updated;
        }

        const nextVehicleId = input.vehicleId ?? "";
        if (!nextVehicleId || nextVehicleId === currentAssignment.vehicleId) {
          throw new Error("Select a different replacement vehicle.");
        }
        const nextVehicle = tenantVehicles.find((item) => item.id === nextVehicleId);
        if (!nextVehicle || !nextVehicle.isActive) {
          throw new Error("Select an active replacement vehicle.");
        }
        const nextDriverId = input.driverId ?? currentAssignment.driverId;
        const nextDriver = tenantDrivers.find((item) => item.id === nextDriverId);
        if (!nextDriver || !nextDriver.isActive) {
          throw new Error("Select an active replacement driver.");
        }
        if ((nextVehicle.vendorId ?? null) !== (nextDriver.vendorId ?? null)) {
          throw new Error("Replacement driver ownership must match replacement vehicle ownership.");
        }
        const nextVendorId = input.vendorId ?? nextVehicle.vendorId ?? null;
        const nextVendorName =
          input.vendorName?.trim() ||
          tenantVendors.find((item) => item.id === nextVendorId)?.name ||
          currentAssignment.vendorName;
        const newVendorRate = input.newVendorRate ?? currentAssignment.vendorFreight ?? null;
        const marginImpact =
          typeof currentAssignment.customerFreight === "number" && typeof newVendorRate === "number"
            ? currentAssignment.customerFreight - newVendorRate
            : null;
        const historyRecord: BookingVehicleReplacementHistoryRecord = {
          ...historyBase,
          newVendorId: nextVendorId,
          newVendorName: nextVendorName,
          newVehicleId: nextVehicle.id,
          newVehicleNumber: nextVehicle.registrationNumber,
          newDriverId: nextDriver.id,
          newDriverName: nextDriver.name,
          newVendorRate,
          marginImpact,
          approvedOrCompletedAt: timestamp,
          vendorActionStatus: "COMPLETED",
        };
        const updated: BookingRecord = {
          ...existing,
          assignment: {
            ...currentAssignment,
            vendorId: nextVendorId,
            vendorName: nextVendorName,
            vehicleId: nextVehicle.id,
            vehicleLabel: nextVehicle.registrationNumber,
            driverId: nextDriver.id,
            driverName: nextDriver.name,
            vendorFreight: newVendorRate,
            marginAmount: marginImpact,
          },
          vehicleReplacementHistory: [historyRecord, ...(existing.vehicleReplacementHistory ?? [])],
          updatedAt: timestamp,
          remarks: [
            {
              id: `booking-remark-${Date.now()}-vehicle-direct`,
              timestamp,
              actor: input.actor,
              type: "VEHICLE_REPLACED",
              location: input.location?.trim() || null,
              message: `Vehicle replaced from ${currentAssignment.vehicleLabel} to ${nextVehicle.registrationNumber}. ${input.remark.trim()}`,
            },
            ...existing.remarks,
          ],
          statusTimeline: [
            ...existing.statusTimeline,
            {
              id: `booking-status-${Date.now()}-vehicle-direct`,
              status: existing.status,
              timestamp,
              actor: input.actor,
              note: `Vehicle replacement completed before invoice/e-waybill upload. Freight unchanged for customer.`,
            },
          ],
        };
        setTenantBookings((current) => current.map((item) => (item.id === existing.id ? updated : item)));
        setTenantDrivers((current) =>
          current.map((driver) => {
            if (driver.id === currentAssignment.driverId && nextDriver.id !== currentAssignment.driverId) {
              return { ...driver, assignedVehicleId: null, updatedAt: timestamp };
            }
            if (driver.id === nextDriver.id) {
              return { ...driver, assignedVehicleId: nextVehicle.id, updatedAt: timestamp };
            }
            return driver;
          }),
        );
        return updated;
      },
      actionTenantBookingVehicleReplacement: (bookingId, input) => {
        const existing = tenantBookings.find((item) => item.id === bookingId || item.bookingId === bookingId);
        if (!existing) {
          throw new Error("Booking not found.");
        }
        if (!existing.assignment) {
          throw new Error("Vehicle replacement requires an active assignment.");
        }
        const request = (existing.vehicleReplacementHistory ?? []).find((entry) => entry.id === input.requestId);
        if (!request) {
          throw new Error("Vehicle replacement request not found.");
        }
        const currentAssignment = existing.assignment;
        const timestamp = new Date().toISOString();
        const histories = existing.vehicleReplacementHistory ?? [];
        const updateHistory = (updater: (entry: BookingVehicleReplacementHistoryRecord) => BookingVehicleReplacementHistoryRecord) =>
          histories.map((entry) => (entry.id === request.id ? updater(entry) : entry));

        if (input.action === "REJECT") {
          if (!input.rejectionReason?.trim()) {
            throw new Error("Rejection reason is required.");
          }
          const updated: BookingRecord = {
            ...existing,
            vehicleReplacementHistory: updateHistory((entry) => ({
              ...entry,
              status: "INTERNAL_REPLACEMENT_REQUIRED",
              vendorActionStatus: "VENDOR_REJECTED",
              rejectionReason: input.rejectionReason?.trim() || null,
              vendorRemark: input.vendorRemark?.trim() || input.remark.trim(),
            })),
            updatedAt: timestamp,
            remarks: [
              {
                id: `booking-remark-${Date.now()}-vehicle-reject`,
                timestamp,
                actor: input.actor,
                type: "VENDOR_REPLACEMENT_REJECTED",
                message: `Vendor rejected replacement request. ${input.rejectionReason?.trim()}. ${input.remark.trim()}`,
              },
              ...existing.remarks,
            ],
          };
          setTenantBookings((current) => current.map((item) => (item.id === existing.id ? updated : item)));
          return updated;
        }

        const nextVehicleId = input.vehicleId ?? "";
        const nextDriverId = input.driverId ?? "";
        if (!nextVehicleId || !nextDriverId) {
          throw new Error("Select replacement vehicle and driver.");
        }
        const nextVehicle = tenantVehicles.find((item) => item.id === nextVehicleId);
        const nextDriver = tenantDrivers.find((item) => item.id === nextDriverId);
        if (!nextVehicle || (!nextVehicle.isActive && !input.overrideAvailability)) {
          throw new Error("Select an active replacement vehicle.");
        }
        if (!nextDriver || (!nextDriver.isActive && !input.overrideAvailability)) {
          throw new Error("Select an active replacement driver.");
        }
        if ((nextVehicle.vendorId ?? null) !== (nextDriver.vendorId ?? null)) {
          throw new Error("Replacement driver ownership must match replacement vehicle ownership.");
        }
        const nextVendorId = input.vendorId ?? nextVehicle.vendorId ?? null;
        const nextVendorName =
          input.vendorName?.trim() ||
          tenantVendors.find((item) => item.id === nextVendorId)?.name ||
          currentAssignment.vendorName;
        if (input.action === "INTERNAL_COMPLETE") {
          if (!input.newInvoiceDocument?.trim() || !input.newEwayBillDocument?.trim()) {
            throw new Error("New invoice and e-waybill documents are required for internal fallback replacement.");
          }
          if (typeof input.newVendorRate !== "number" || Number.isNaN(input.newVendorRate)) {
            throw new Error("New vendor rate is required for internal fallback replacement.");
          }
        }
        const newVendorRate =
          input.action === "INTERNAL_COMPLETE"
            ? input.newVendorRate ?? currentAssignment.vendorFreight ?? null
            : currentAssignment.vendorFreight ?? null;
        const marginImpact =
          typeof currentAssignment.customerFreight === "number" && typeof newVendorRate === "number"
            ? currentAssignment.customerFreight - newVendorRate
            : null;
        const updatedHistoryStatus =
          input.action === "ASSIGN_REPLACEMENT" ? "COMPLETED" : "INTERNAL_REPLACEMENT_COMPLETED";
        const updated: BookingRecord = {
          ...existing,
          assignment: {
            ...currentAssignment,
            vendorId: nextVendorId,
            vendorName: nextVendorName,
            vehicleId: nextVehicle.id,
            vehicleLabel: nextVehicle.registrationNumber,
            driverId: nextDriver.id,
            driverName: nextDriver.name,
            vendorFreight: newVendorRate,
            marginAmount: marginImpact,
          },
          vehicleReplacementHistory: updateHistory((entry) => ({
            ...entry,
            newVendorId: nextVendorId,
            newVendorName: nextVendorName,
            newVehicleId: nextVehicle.id,
            newVehicleNumber: nextVehicle.registrationNumber,
            newDriverId: nextDriver.id,
            newDriverName: nextDriver.name,
            newInvoiceDocument: input.newInvoiceDocument?.trim() || entry.newInvoiceDocument || null,
            newEwayBillDocument: input.newEwayBillDocument?.trim() || entry.newEwayBillDocument || null,
            newVendorRate,
            marginImpact,
            vendorActionStatus:
              input.action === "ASSIGN_REPLACEMENT"
                ? "VENDOR_ASSIGNED_REPLACEMENT"
                : "INTERNAL_REPLACEMENT_COMPLETED",
            vendorRemark: input.vendorRemark?.trim() || input.remark.trim(),
            internalActionTakenBy: input.action === "INTERNAL_COMPLETE" ? input.actor : entry.internalActionTakenBy ?? null,
            approvedOrCompletedAt: timestamp,
            status: updatedHistoryStatus,
          })),
          updatedAt: timestamp,
          remarks: [
            {
              id: `booking-remark-${Date.now()}-vehicle-action`,
              timestamp,
              actor: input.actor,
              type:
                input.action === "ASSIGN_REPLACEMENT"
                  ? "VENDOR_ASSIGNED_REPLACEMENT_VEHICLE"
                  : "INTERNAL_VENDOR_VEHICLE_DRIVER_REPLACED",
              message:
                input.action === "ASSIGN_REPLACEMENT"
                  ? `Vendor assigned replacement vehicle ${nextVehicle.registrationNumber}. ${input.remark.trim()}`
                  : `Internal fallback replacement completed with ${nextVehicle.registrationNumber}. ${input.remark.trim()}`,
            },
            ...existing.remarks,
          ],
        };
        setTenantBookings((current) => current.map((item) => (item.id === existing.id ? updated : item)));
        setTenantDrivers((current) =>
          current.map((driver) => {
            if (driver.id === currentAssignment.driverId && nextDriver.id !== currentAssignment.driverId) {
              return { ...driver, assignedVehicleId: null, updatedAt: timestamp };
            }
            if (driver.id === nextDriver.id) {
              return { ...driver, assignedVehicleId: nextVehicle.id, updatedAt: timestamp };
            }
            return driver;
          }),
        );
        return updated;
      },
      listTenantInvoices: (tenantId) => tenantInvoices.filter((item) => item.tenantId === tenantId),
      createTenantInvoice: (input) => {
        setTenantInvoices((current) => [input, ...current]);
        return input;
      },
      listTenantLrPools: (tenantId) => tenantLrPools.filter((item) => item.tenantId === tenantId),
      listTenantLrs: (tenantId) => tenantLrs.filter((item) => item.tenantId === tenantId),
      createTenantLrs: (records) => {
        const normalizedRecords = records.map((record) => ({
          ...record,
          configId: record.configId ?? null,
          updatedAt: record.updatedAt ?? record.createdAt,
        }));
        setTenantLrs((current) => {
          const next = [...current];
          normalizedRecords.forEach((record) => {
            const index = next.findIndex(
              (item) => item.bookingId === record.bookingId && item.deliveryId === record.deliveryId,
            );
            if (index >= 0) {
              next[index] = { ...next[index], ...record };
              return;
            }
            next.unshift(record);
          });
          return next;
        });
        return normalizedRecords;
      },
      listTenantLrRequests: (tenantId) => tenantLrRequests.filter((item) => item.tenantId === tenantId),
      createTenantLrRequest: (input) => {
        const now = new Date().toISOString();
        const created = normalizeTenantLrRequest({
          ...input,
          id: `lr-request-${Math.random().toString(36).slice(2, 9)}`,
          createdAt: now,
          updatedAt: now,
          decidedAt: null,
          note: input.note ?? null,
        });
        setTenantLrRequests((current) => [created, ...current]);
        setPlatformAuditLogs((current) => [
          {
            id: `p-log-${Date.now()}`,
            actor: "Tenant User",
            action: "created LR request",
            entityType: "lr_request",
            entityName: created.branchName ?? created.sourceOrgUnitId ?? created.id,
            tenantId: created.tenantId,
            timestamp: now,
            result: "success",
          },
          ...current,
        ]);
        return created;
      },
      approveTenantLrRequest: (requestId, approvedCount, actor, note) => {
        const existing = tenantLrRequests.find((item) => item.id === requestId);
        if (!existing) {
          throw new Error("LR request not found.");
        }
        const configForRequest = existing.configId
          ? tenantLRConfigs.find((config) => config.id === existing.configId) ?? null
          : null;
        const now = new Date().toISOString();
        const boundedApprovedCount = Math.max(0, Math.min(approvedCount, existing.requestedCount));
        const updated = normalizeTenantLrRequest({
          ...existing,
          approvedCount: boundedApprovedCount,
          status:
            boundedApprovedCount === 0
              ? "REJECTED"
              : boundedApprovedCount < existing.requestedCount
                ? "PARTIALLY_APPROVED"
                : "APPROVED",
          decidedAt: now,
          updatedAt: now,
          note: note ?? existing.note ?? null,
        });
        setTenantLrRequests((current) => current.map((item) => (item.id === requestId ? updated : item)));
        setTenantLrPools((current) => {
          const nextPools = [...current];
          let remaining = updated.approvedCount;
          const requesterFormat = resolveStoreLrFormatForOrgUnit(
            configForRequest,
            existing.sourceOrgUnitId,
            orgUnits,
          );
          let requesterSequence =
            nextPools
              .filter(
                (pool) =>
                  pool.configId === existing.configId &&
                  pool.ownerLevelId === (existing.sourceOrgUnitId ?? null),
              )
              .map((pool) => {
                const match = pool.lrNumber.match(/(\d+)(?!.*\d)/);
                return match ? Number(match[1]) : 0;
              })
              .reduce((max, value) => Math.max(max, value), 0) + 1;

          for (let index = 0; index < nextPools.length && remaining > 0; index += 1) {
            const pool = nextPools[index];
            if (
              pool.tenantId !== existing.tenantId ||
              pool.status !== "AVAILABLE" ||
              (existing.configId && pool.configId !== existing.configId) ||
              (existing.customerId &&
                configForRequest?.lrType === "PRE_GENERATED" &&
                pool.customerId &&
                pool.customerId !== existing.customerId) ||
              (existing.customerId &&
                configForRequest?.lrType !== "PRE_GENERATED" &&
                pool.customerId !== existing.customerId) ||
              (!existing.targetOrgUnitId && pool.ownerLevelId != null) ||
              (existing.targetOrgUnitId &&
                pool.ownerLevelId &&
                pool.ownerLevelId !== existing.targetOrgUnitId) ||
              (existing.targetUserId && pool.ownerUserId !== existing.targetUserId)
            ) {
              continue;
            }

            remaining -= 1;
            nextPools[index] = {
              ...appendPoolAuditEvent(pool, {
                action: "REQUEST_APPROVED_ALLOCATION",
                poolType: existing.customerId ? "CUSTOMER_RESERVED" : (pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")),
                customerId: existing.customerId ?? pool.customerId ?? null,
                fromPlaceId: pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
                toPlaceId: existing.sourceOrgUnitId ?? pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
                actor,
                role: actor,
                timestamp: now,
                note: existing.id,
              }),
              lrNumber: buildStoreFormattedLrNumber(
                requesterFormat ?? configForRequest ?? {
                  prefix: "LR",
                  yearFormat: "YYYY",
                  numberSeparator: "-",
                  zeroPaddingLength: 6,
                },
                requesterSequence,
              ),
              poolType: existing.customerId ? "CUSTOMER_RESERVED" : (pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")),
              ownerPlaceId: existing.sourceOrgUnitId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
              currentPlaceId: existing.sourceOrgUnitId ?? pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
              ownerLevelId: existing.sourceOrgUnitId ?? pool.ownerLevelId ?? null,
              ownerUserId: existing.sourceUserId ?? pool.ownerUserId ?? null,
              customerId: existing.customerId ?? pool.customerId ?? null,
              updatedAt: now,
            };
            requesterSequence += 1;
          }

          if (
            remaining > 0 &&
            (configForRequest?.lrType === "MANUAL" || configForRequest?.lrType === "PRE_GENERATED") &&
            existing.configId
          ) {
            const maxSequence = nextPools
              .filter((pool) => pool.configId === existing.configId)
              .map((pool) => {
                const match = pool.lrNumber.match(/(\d+)(?!.*\d)/);
                return match ? Number(match[1]) : 0;
              })
              .reduce((max, value) => Math.max(max, value), 0);
            for (let index = 0; index < remaining; index += 1) {
              nextPools.push(
                normalizeStoredTenantLrPools([
                  {
                    id: `lr-pool-${Math.random().toString(36).slice(2, 9)}`,
                    lrNumberId: `lr-pool-${Math.random().toString(36).slice(2, 9)}`,
                    tenantId: existing.tenantId,
                    configId: existing.configId,
                    lrNumber: buildStoreFormattedLrNumber(
                      requesterFormat ?? configForRequest ?? {
                        prefix: "LR",
                        yearFormat: "YYYY",
                        numberSeparator: "-",
                        zeroPaddingLength: 6,
                      },
                      requesterSequence + index,
                    ),
                    poolType: existing.customerId ? "CUSTOMER_RESERVED" : "GENERAL",
                    status: "AVAILABLE",
                    customerId: existing.customerId ?? null,
                    vendorId: null,
                    ownerPlaceId: existing.sourceOrgUnitId ?? null,
                    currentPlaceId: existing.sourceOrgUnitId ?? null,
                    ownerLevelId: existing.sourceOrgUnitId ?? null,
                    ownerUserId: existing.sourceUserId ?? null,
                    bookingId: null,
                    deliveryId: null,
                    usedAt: null,
                    voidReason: null,
                    createdBy: actor,
                    auditEvents: [{
                      id: `lr-audit-${Math.random().toString(36).slice(2, 9)}`,
                      action: "REQUEST_APPROVED_GENERATED",
                      poolType: existing.customerId ? "CUSTOMER_RESERVED" : "GENERAL",
                      customerId: existing.customerId ?? null,
                      fromPlaceId: existing.targetOrgUnitId ?? null,
                      toPlaceId: existing.sourceOrgUnitId ?? null,
                      actor,
                      role: actor,
                      timestamp: now,
                      note: existing.id,
                    }],
                    createdAt: now,
                    updatedAt: now,
                  },
                ])[0],
              );
            }
            remaining = 0;
          }
          return rewritePoolsToOwnerFormat({
            pools: nextPools,
            config: configForRequest,
            ownerLevelId: existing.sourceOrgUnitId,
            orgUnits,
            timestamp: now,
          });
        });
        setPlatformAuditLogs((current) => [
          {
            id: `p-log-${Date.now()}`,
            actor,
            action: "approved LR request",
            entityType: "lr_request",
            entityName: existing.branchName ?? existing.sourceOrgUnitId ?? existing.targetOrgUnitId ?? existing.id,
            tenantId: existing.tenantId,
            timestamp: now,
            result: "success",
          },
          ...current,
        ]);
        return updated;
      },
      rejectTenantLrRequest: (requestId, actor, note) => {
        const existing = tenantLrRequests.find((item) => item.id === requestId);
        if (!existing) {
          throw new Error("LR request not found.");
        }
        const now = new Date().toISOString();
        const updated = normalizeTenantLrRequest({
          ...existing,
          approvedCount: 0,
          status: "REJECTED",
          decidedAt: now,
          updatedAt: now,
          note: note ?? existing.note ?? null,
          rejectionReason: note ?? existing.rejectionReason ?? null,
        });
        setTenantLrRequests((current) => current.map((item) => (item.id === requestId ? updated : item)));
        setPlatformAuditLogs((current) => [
          {
            id: `p-log-${Date.now()}`,
            actor,
            action: "rejected LR request",
            entityType: "lr_request",
            entityName: existing.branchName ?? existing.sourceOrgUnitId ?? existing.targetOrgUnitId ?? existing.id,
            tenantId: existing.tenantId,
            timestamp: now,
            result: "success",
          },
          ...current,
        ]);
        return updated;
      },
      listTenantLrTransfers: (tenantId) => tenantLrTransfers.filter((item) => item.tenantId === tenantId),
      createTenantLrTransfer: (input) => {
        const now = new Date().toISOString();
        const created = normalizeTenantLrTransfer({
          ...input,
          id: `lr-transfer-${Math.random().toString(36).slice(2, 9)}`,
          createdAt: now,
          updatedAt: now,
          completedAt: now,
          note: input.note ?? null,
        });
        setTenantLrTransfers((current) => [created, ...current]);
        setTenantLrPools((current) =>
          current.map((pool) =>
            created.lrIds.includes(pool.id)
              ? appendPoolAuditEvent({
                  ...pool,
                  poolType: created.customerId ? "CUSTOMER_RESERVED" : (pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")),
                  ownerPlaceId: created.toOrgUnitId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
                  currentPlaceId: created.toOrgUnitId ?? pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
                  ownerLevelId: created.toOrgUnitId ?? pool.ownerLevelId ?? null,
                  ownerUserId: created.toUserId ?? pool.ownerUserId ?? null,
                  customerId: created.customerId ?? pool.customerId ?? null,
                  updatedAt: now,
                }, {
                  action: "TRANSFERRED",
                  poolType: created.customerId ? "CUSTOMER_RESERVED" : (pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")),
                  customerId: created.customerId ?? pool.customerId ?? null,
                  fromPlaceId: pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
                  toPlaceId: created.toOrgUnitId ?? pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId ?? null,
                  actor: "Tenant User",
                  role: "Tenant User",
                  timestamp: now,
                  note: created.id,
                })
              : pool,
          ),
        );
        setPlatformAuditLogs((current) => [
          {
            id: `p-log-${Date.now()}`,
            actor: "Tenant User",
            action: "created LR transfer",
            entityType: "lr_transfer",
            entityName: created.id,
            tenantId: created.tenantId,
            timestamp: now,
            result: "success",
          },
          ...current,
        ]);
        return created;
      },
      completeTenantLrTransfer: (transferId, actor, note) => {
        const existing = tenantLrTransfers.find((item) => item.id === transferId);
        if (!existing) {
          throw new Error("LR transfer not found.");
        }
        const now = new Date().toISOString();
        const updated = normalizeTenantLrTransfer({
          ...existing,
          status: "COMPLETED",
          completedAt: now,
          updatedAt: now,
          note: note ?? existing.note ?? null,
        });
        setTenantLrTransfers((current) => current.map((item) => (item.id === transferId ? updated : item)));
        setPlatformAuditLogs((current) => [
          {
            id: `p-log-${Date.now()}`,
            actor,
            action: "completed LR transfer",
            entityType: "lr_transfer",
            entityName: existing.id,
            tenantId: existing.tenantId,
            timestamp: now,
            result: "success",
          },
          ...current,
        ]);
        return updated;
      },
      syncTenantLrsForBooking: (bookingId, status) => {
        const nextStatus = mapLrStatusFromBookingStatus(status);
        setTenantLrs((current) =>
          current.map((record) =>
            record.bookingId === bookingId
              ? {
                  ...record,
                  status: nextStatus,
                  updatedAt: new Date().toISOString(),
                }
              : record,
          ),
        );
      },
      listTenantVendorRateCards: (tenantVendorId) =>
        tenantVendorRateCards.filter((item) => item.tenantVendorId === tenantVendorId),
      createTenantVendorRateCard: (input) => {
        const now = new Date().toISOString();
        const created = normalizeStoredTenantVendorRateCard({
          ...input,
          contractName: input.contractName?.trim() || undefined,
          contractCode: input.contractCode?.trim() || undefined,
          effectiveFromDate: input.effectiveFromDate?.trim() || undefined,
          effectiveToDate: input.effectiveToDate?.trim() || undefined,
          lanes: input.lanes?.trim() || `${input.fromLocation?.trim() || input.sourcePincode} -> ${input.toLocation?.trim() || input.destinationPincode}`,
          fromCity: input.fromCity?.trim() || input.fromLocation?.trim() || input.sourcePincode,
          toCity: input.toCity?.trim() || input.toLocation?.trim() || input.destinationPincode,
          fromLocation: input.fromLocation?.trim() || input.sourcePincode,
          toLocation: input.toLocation?.trim() || input.destinationPincode,
          buyingRate: input.buyingRate ?? input.underloadRate ?? input.rate,
          underloadRate: input.underloadRate ?? input.buyingRate ?? input.rate,
          overloadRate: input.overloadRate ?? null,
          tat: input.tat?.trim() || undefined,
          remarks: input.remarks?.trim() || undefined,
          id: `vendor-rate-card-${Math.random().toString(36).slice(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        });
        setTenantVendorRateCards((current) => [created, ...current]);
        return created;
      },
      updateTenantVendorRateCard: (rateCardId, updates) => {
        const existing = tenantVendorRateCards.find((item) => item.id === rateCardId);
        if (!existing) {
          throw new Error("Vendor rate card not found.");
        }
        const updated = normalizeStoredTenantVendorRateCard({
          ...existing,
          ...updates,
          contractName: updates.contractName !== undefined ? updates.contractName.trim() || undefined : existing.contractName,
          contractCode: updates.contractCode !== undefined ? updates.contractCode.trim() || undefined : existing.contractCode,
          effectiveFromDate: updates.effectiveFromDate !== undefined ? updates.effectiveFromDate.trim() || undefined : existing.effectiveFromDate,
          effectiveToDate: updates.effectiveToDate !== undefined ? updates.effectiveToDate.trim() || undefined : existing.effectiveToDate,
          lanes: updates.lanes !== undefined ? updates.lanes.trim() || undefined : existing.lanes,
          fromCity: updates.fromCity !== undefined ? updates.fromCity.trim() || undefined : existing.fromCity,
          toCity: updates.toCity !== undefined ? updates.toCity.trim() || undefined : existing.toCity,
          fromLocation: updates.fromLocation !== undefined ? updates.fromLocation.trim() || undefined : existing.fromLocation,
          toLocation: updates.toLocation !== undefined ? updates.toLocation.trim() || undefined : existing.toLocation,
          buyingRate:
            updates.buyingRate !== undefined
              ? updates.buyingRate
              : updates.underloadRate !== undefined
                ? updates.underloadRate
                : updates.rate !== undefined
                  ? updates.rate
                  : existing.buyingRate,
          underloadRate:
            updates.underloadRate !== undefined
              ? updates.underloadRate
              : updates.buyingRate !== undefined
                ? updates.buyingRate
                : updates.rate !== undefined
                  ? updates.rate
                  : existing.underloadRate,
          overloadRate: updates.overloadRate !== undefined ? updates.overloadRate : existing.overloadRate,
          tat: updates.tat !== undefined ? updates.tat.trim() || undefined : existing.tat,
          remarks: updates.remarks !== undefined ? updates.remarks.trim() || undefined : existing.remarks,
          updatedAt: new Date().toISOString(),
        });
        setTenantVendorRateCards((current) =>
          current.map((item) => (item.id === rateCardId ? updated : item)),
        );
        return updated;
      },
      listTenantVehicles: (tenantId) => tenantVehicles.filter((item) => item.tenantId === tenantId),
      getTenantVehicleById: (vehicleId) =>
        tenantVehicles.find((item) => item.id === vehicleId) ?? null,
      createTenantVehicle: (input) => {
        validateVehicleInput(
          input.tenantId,
          input,
          tenantVendors,
          tenantVehicleTypes,
          tenantVehicles,
        );
        const now = new Date().toISOString();
        const created: TenantVehicle = {
          ...input,
          id: `vehicle-${Math.random().toString(36).slice(2, 9)}`,
          registrationNumber: input.registrationNumber.trim().toUpperCase(),
          make: input.make.trim(),
          model: input.model.trim(),
          year: input.year.trim(),
          vendorId: input.ownershipType === "VENDOR" ? input.vendorId ?? null : null,
          chassisNo: input.chassisNo?.trim() || undefined,
          insurance: {
            number: input.insurance.number.trim(),
            expiry: input.insurance.expiry,
          },
          fitness: {
            number: input.fitness.number.trim(),
            expiry: input.fitness.expiry,
          },
          puc: {
            number: input.puc.number.trim(),
            expiry: input.puc.expiry,
          },
          permit: {
            type: input.permit.type.trim(),
            expiry: input.permit.expiry,
          },
          odometer: input.odometer.trim(),
          createdAt: now,
          updatedAt: now,
        };
        setTenantVehicles((current) => [created, ...current]);
        return created;
      },
      updateTenantVehicle: (vehicleId, updates) => {
        const existing = tenantVehicles.find((item) => item.id === vehicleId);
        if (!existing) {
          throw new Error("Vehicle not found.");
        }
        const nextVehicle: TenantVehicleInput = {
          registrationNumber: updates.registrationNumber ?? existing.registrationNumber,
          make: updates.make ?? existing.make,
          model: updates.model ?? existing.model,
          year: updates.year ?? existing.year,
          vehicleTypeId: updates.vehicleTypeId ?? existing.vehicleTypeId,
          fuelType: updates.fuelType ?? existing.fuelType,
          ownershipType: updates.ownershipType ?? existing.ownershipType,
          vendorId:
            (updates.ownershipType ?? existing.ownershipType) === "VENDOR"
              ? updates.vendorId ?? existing.vendorId ?? null
              : null,
          chassisNo: updates.chassisNo ?? existing.chassisNo,
          insurance: updates.insurance ?? existing.insurance,
          fitness: updates.fitness ?? existing.fitness,
          puc: updates.puc ?? existing.puc,
          permit: updates.permit ?? existing.permit,
          odometer: updates.odometer ?? existing.odometer,
          isActive: updates.isActive ?? existing.isActive,
        };
        validateVehicleInput(
          existing.tenantId,
          nextVehicle,
          tenantVendors,
          tenantVehicleTypes,
          tenantVehicles,
          vehicleId,
        );
        const updated: TenantVehicle = {
          ...existing,
          ...nextVehicle,
          registrationNumber: nextVehicle.registrationNumber.trim().toUpperCase(),
          make: nextVehicle.make.trim(),
          model: nextVehicle.model.trim(),
          year: nextVehicle.year.trim(),
          vendorId: nextVehicle.ownershipType === "VENDOR" ? nextVehicle.vendorId ?? null : null,
          chassisNo: nextVehicle.chassisNo?.trim() || undefined,
          insurance: {
            number: nextVehicle.insurance.number.trim(),
            expiry: nextVehicle.insurance.expiry,
          },
          fitness: {
            number: nextVehicle.fitness.number.trim(),
            expiry: nextVehicle.fitness.expiry,
          },
          puc: {
            number: nextVehicle.puc.number.trim(),
            expiry: nextVehicle.puc.expiry,
          },
          permit: {
            type: nextVehicle.permit.type.trim(),
            expiry: nextVehicle.permit.expiry,
          },
          odometer: nextVehicle.odometer.trim(),
          updatedAt: new Date().toISOString(),
        };
        setTenantVehicles((current) =>
          current.map((item) => (item.id === vehicleId ? updated : item)),
        );
        return updated;
      },
      listTenantDrivers: (tenantId) => tenantDrivers.filter((item) => item.tenantId === tenantId),
      getTenantDriverById: (driverId) =>
        tenantDrivers.find((item) => item.id === driverId) ?? null,
      createTenantDriver: (input) => {
        validateDriverInput(input.tenantId, input, tenantVehicles, tenantDrivers);
        const now = new Date().toISOString();
        const created: TenantDriver = {
          ...input,
          id: `driver-${Math.random().toString(36).slice(2, 9)}`,
          name: input.name.trim(),
          phone: input.phone.trim(),
          address: input.address.trim(),
          bloodGroup: input.bloodGroup.trim(),
          licenseNumber: input.licenseNumber.trim().toUpperCase(),
          licenseType: input.licenseType.trim(),
          endorsements: Array.from(new Set(input.endorsements.map((item) => item.trim()).filter(Boolean))),
          assignedVehicleId: input.assignedVehicleId ?? null,
          vendorId: input.vendorId ?? null,
          createdAt: now,
          updatedAt: now,
        };
        setTenantDrivers((current) => [created, ...current]);
        return created;
      },
      updateTenantDriver: (driverId, updates) => {
        const existing = tenantDrivers.find((item) => item.id === driverId);
        if (!existing) {
          throw new Error("Driver not found.");
        }
        const nextDriver: TenantDriverInput = {
          name: updates.name ?? existing.name,
          dob: updates.dob ?? existing.dob,
          photoUrl: updates.photoUrl ?? existing.photoUrl,
          phone: updates.phone ?? existing.phone,
          address: updates.address ?? existing.address,
          bloodGroup: updates.bloodGroup ?? existing.bloodGroup,
          licenseNumber: updates.licenseNumber ?? existing.licenseNumber,
          licenseType: updates.licenseType ?? existing.licenseType,
          licenseExpiry: updates.licenseExpiry ?? existing.licenseExpiry,
          medicalExpiry: updates.medicalExpiry ?? existing.medicalExpiry,
          drugTestStatus: updates.drugTestStatus ?? existing.drugTestStatus,
          endorsements: updates.endorsements ?? existing.endorsements,
          assignedVehicleId: updates.assignedVehicleId ?? existing.assignedVehicleId ?? null,
          vendorId: updates.vendorId ?? existing.vendorId ?? null,
          isActive: updates.isActive ?? existing.isActive,
        };
        validateDriverInput(existing.tenantId, nextDriver, tenantVehicles, tenantDrivers, driverId);
        const updated: TenantDriver = {
          ...existing,
          ...nextDriver,
          name: nextDriver.name.trim(),
          phone: nextDriver.phone.trim(),
          address: nextDriver.address.trim(),
          bloodGroup: nextDriver.bloodGroup.trim(),
          licenseNumber: nextDriver.licenseNumber.trim().toUpperCase(),
          licenseType: nextDriver.licenseType.trim(),
          endorsements: Array.from(new Set(nextDriver.endorsements.map((item) => item.trim()).filter(Boolean))),
          assignedVehicleId: nextDriver.assignedVehicleId ?? null,
          vendorId: nextDriver.vendorId ?? null,
          updatedAt: new Date().toISOString(),
        };
        setTenantDrivers((current) =>
          current.map((item) => (item.id === driverId ? updated : item)),
        );
        return updated;
      },
      listTenantVehicleTypes: (tenantId) =>
        tenantVehicleTypes.filter((item) => item.tenantId === tenantId),
      createTenantVehicleType: (input) => {
        const now = new Date().toISOString();
        const created: TenantVehicleType = {
          ...input,
          id: `vehicle-type-${Math.random().toString(36).slice(2, 9)}`,
          typeCode: input.typeCode.trim().toUpperCase(),
          capacity: input.capacity.trim(),
          dimensions: input.dimensions.trim(),
          createdAt: now,
          updatedAt: now,
        };
        setTenantVehicleTypes((current) => [created, ...current]);
        return created;
      },
      updateTenantVehicleType: (vehicleTypeId, updates) => {
        const existing = tenantVehicleTypes.find((item) => item.id === vehicleTypeId);
        if (!existing) {
          throw new Error("Vehicle type not found.");
        }
        const updated: TenantVehicleType = {
          ...existing,
          ...updates,
          typeCode:
            updates.typeCode !== undefined ? updates.typeCode.trim().toUpperCase() : existing.typeCode,
          capacity: updates.capacity !== undefined ? updates.capacity.trim() : existing.capacity,
          dimensions:
            updates.dimensions !== undefined ? updates.dimensions.trim() : existing.dimensions,
          updatedAt: new Date().toISOString(),
        };
        setTenantVehicleTypes((current) =>
          current.map((item) => (item.id === vehicleTypeId ? updated : item)),
        );
        return updated;
      },
      listTenantMaterials: (tenantId) => tenantMaterials.filter((item) => item.tenantId === tenantId),
      createTenantMaterial: (input) => {
        const now = new Date().toISOString();
        const quantityUOM = (input.quantityUOM ?? input.uom).trim().toUpperCase();
        const defaultWeightUOM = input.defaultWeightUOM?.trim().toUpperCase() || "KG";
        const created: TenantMaterial = {
          ...input,
          id: `material-${Math.random().toString(36).slice(2, 9)}`,
          materialCode: input.materialCode.trim().toUpperCase(),
          description: input.description.trim(),
          uom: quantityUOM,
          quantityUOM,
          defaultWeightUOM,
          conversionValue: input.conversionValue ?? null,
          mappedCustomerIds: Array.from(new Set(input.mappedCustomerIds)),
          createdAt: now,
          updatedAt: now,
        };
        setTenantMaterials((current) => [created, ...current]);
        return created;
      },
      updateTenantMaterial: (materialId, updates) => {
        const existing = tenantMaterials.find((item) => item.id === materialId);
        if (!existing) {
          throw new Error("Material not found.");
        }
        const quantityUOM = updates.quantityUOM?.trim().toUpperCase() ?? updates.uom?.trim().toUpperCase() ?? existing.quantityUOM ?? existing.uom;
        const updated: TenantMaterial = {
          ...existing,
          ...updates,
          materialCode:
            updates.materialCode !== undefined
              ? updates.materialCode.trim().toUpperCase()
              : existing.materialCode,
          description:
            updates.description !== undefined ? updates.description.trim() : existing.description,
          uom: quantityUOM,
          quantityUOM,
          defaultWeightUOM:
            updates.defaultWeightUOM !== undefined
              ? updates.defaultWeightUOM.trim().toUpperCase()
              : existing.defaultWeightUOM ?? "KG",
          conversionValue:
            updates.conversionValue !== undefined ? updates.conversionValue : existing.conversionValue ?? null,
          mappedCustomerIds:
            updates.mappedCustomerIds !== undefined
              ? Array.from(new Set(updates.mappedCustomerIds))
              : existing.mappedCustomerIds,
          updatedAt: new Date().toISOString(),
        };
        setTenantMaterials((current) =>
          current.map((item) => (item.id === materialId ? updated : item)),
        );
        return updated;
      },
      listTenantUOMDefinitions: (tenantId) =>
        tenantUOMDefinitions.filter((item) => item.tenantId === tenantId),
      createTenantUOMDefinition: (input) => {
        const normalizedCode = input.code.trim().toUpperCase();
        if (
          tenantUOMDefinitions.some(
            (item) =>
              item.tenantId === input.tenantId &&
              item.category === input.category &&
              item.code === normalizedCode,
          )
        ) {
          throw new Error("A UOM with this code already exists in the selected category.");
        }
        const now = new Date().toISOString();
        const created = normalizeTenantUOMDefinition({
          ...input,
          id: `uom-definition-${Math.random().toString(36).slice(2, 9)}`,
          code: normalizedCode,
          createdAt: now,
          updatedAt: now,
        });
        setTenantUOMDefinitions((current) => [created, ...current]);
        return created;
      },
      updateTenantUOMDefinition: (definitionId, updates) => {
        const existing = tenantUOMDefinitions.find((item) => item.id === definitionId);
        if (!existing) {
          throw new Error("UOM definition not found.");
        }
        const normalizedCode = updates.code?.trim().toUpperCase() ?? existing.code;
        if (
          tenantUOMDefinitions.some(
            (item) =>
              item.id !== definitionId &&
              item.tenantId === existing.tenantId &&
              item.category === (updates.category ?? existing.category) &&
              item.code === normalizedCode,
          )
        ) {
          throw new Error("A UOM with this code already exists in the selected category.");
        }
        const updated = normalizeTenantUOMDefinition({
          ...existing,
          ...updates,
          code: normalizedCode,
          updatedAt: new Date().toISOString(),
        });
        setTenantUOMDefinitions((current) =>
          current.map((item) => (item.id === definitionId ? updated : item)),
        );
        return updated;
      },
      listTenantUOMMappings: (tenantId) =>
        tenantUOMMappings.filter((item) => item.tenantId === tenantId),
      createTenantUOMMapping: (input) => {
        const normalizedQuantityUOM = input.quantityUOM.trim().toUpperCase();
        if (
          tenantUOMMappings.some(
            (item) =>
              item.tenantId === input.tenantId &&
              item.quantityUOM === normalizedQuantityUOM &&
              item.status === "active",
          )
        ) {
          throw new Error("An active mapping for this quantity UOM already exists.");
        }
        const now = new Date().toISOString();
        const created = normalizeTenantUOMMapping({
          ...input,
          id: `uom-mapping-${Math.random().toString(36).slice(2, 9)}`,
          quantityUOM: normalizedQuantityUOM,
          createdAt: now,
          updatedAt: now,
        });
        setTenantUOMMappings((current) => [created, ...current]);
        return created;
      },
      updateTenantUOMMapping: (mappingId, updates) => {
        const existing = tenantUOMMappings.find((item) => item.id === mappingId);
        if (!existing) {
          throw new Error("UOM mapping not found.");
        }
        const normalizedQuantityUOM = updates.quantityUOM?.trim().toUpperCase() ?? existing.quantityUOM;
        if (
          tenantUOMMappings.some(
            (item) =>
              item.id !== mappingId &&
              item.tenantId === existing.tenantId &&
              item.quantityUOM === normalizedQuantityUOM &&
              item.status === "active" &&
              (updates.status ?? existing.status) === "active",
          )
        ) {
          throw new Error("An active mapping for this quantity UOM already exists.");
        }
        const updated = normalizeTenantUOMMapping({
          ...existing,
          ...updates,
          quantityUOM: normalizedQuantityUOM,
          updatedAt: new Date().toISOString(),
        });
        setTenantUOMMappings((current) =>
          current.map((item) => (item.id === mappingId ? updated : item)),
        );
        return updated;
      },
      deleteTenantUOMMapping: (mappingId) => {
        const exists = tenantUOMMappings.some((item) => item.id === mappingId);
        if (!exists) {
          return false;
        }
        setTenantUOMMappings((current) => current.filter((item) => item.id !== mappingId));
        return true;
      },
      listTenantLRConfigs: (tenantId) => tenantLRConfigs.filter((item) => item.tenantId === tenantId),
      createTenantLRConfig: (input) => {
        assertUniqueTenantLrTypeConfig(tenantLRConfigs, input.tenantId, input.lrType);
        const now = new Date().toISOString();
        const created = normalizeTenantLRConfig({
          ...input,
          id: `lr-config-${Math.random().toString(36).slice(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        });
        setTenantLRConfigs((current) => [created, ...current]);
        if (created.lrType !== "AUTO") {
          setTenantLrPools((current) => [
            ...buildTenantLrPoolsFromConfig({
              tenantId: created.tenantId,
              config: created,
              existingPools: current,
              timestamp: now,
            }).filter((pool) => pool.status === "AVAILABLE" || pool.status === "USED"),
            ...current.filter((pool) => pool.configId !== created.id),
          ]);
        }
        return created;
      },
      updateTenantLRConfig: (lrConfigId, updates) => {
        const existing = tenantLRConfigs.find((item) => item.id === lrConfigId);
        if (!existing) {
          throw new Error("LR configuration not found.");
        }
        assertUniqueTenantLrTypeConfig(
          tenantLRConfigs,
          existing.tenantId,
          updates.lrType ?? existing.lrType,
          lrConfigId,
        );
        const updated = normalizeTenantLRConfig({
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
        setTenantLRConfigs((current) =>
          current.map((item) => (item.id === lrConfigId ? updated : item)),
        );
        if (updated.lrType !== "AUTO") {
          setTenantLrPools((current) => {
            const refreshed = buildTenantLrPoolsFromConfig({
              tenantId: updated.tenantId,
              config: updated,
              existingPools: current,
              timestamp: new Date().toISOString(),
            });
            return [...refreshed, ...current.filter((pool) => pool.configId !== updated.id)];
          });
        }
        return updated;
      },
      upsertTenantLrPools: (records) => {
        const normalizedRecords = normalizeStoredTenantLrPools(
          records.map((record) => ({
            ...record,
            id: record.id || `lr-pool-${Math.random().toString(36).slice(2, 9)}`,
            createdAt: record.createdAt ?? new Date().toISOString(),
            updatedAt: record.updatedAt ?? new Date().toISOString(),
          })),
        );
        setTenantLrPools((current) => {
          const next = [...current];
          normalizedRecords.forEach((record) => {
            const index = next.findIndex(
              (item) =>
                item.id === record.id ||
                (
                  item.tenantId === record.tenantId &&
                  item.configId === record.configId &&
                  item.lrNumber === record.lrNumber
                ),
            );
            if (index >= 0) {
              next[index] = {
                ...next[index],
                ...record,
                createdAt: next[index].createdAt,
              };
              return;
            }
            next.unshift(record);
          });
          return next;
        });
        return normalizedRecords;
      },
      getTenantHierarchyState: (tenantId) =>
        workspaces[tenantId] ?? {
          tenantId,
          startingBlueprint: "custom",
          hierarchy: buildHierarchyConfigForTemplate(tenantId, "custom"),
        },
      saveTenantHierarchy: (tenantId, hierarchy) => {
        const nextLevels = hierarchy.levels
          .map((level, index) => ({
            ...level,
            tenantId,
            order: index + 1,
          }))
          .sort((a, b) => a.order - b.order);

        setWorkspaces((current) => ({
          ...current,
          [tenantId]: {
            ...(current[tenantId] ?? {
              tenantId,
              startingBlueprint: hierarchy.startingBlueprint,
              hierarchy,
            }),
            hierarchy: {
              ...hierarchy,
              tenantId,
              levels: nextLevels,
              lastUpdated: new Date().toISOString(),
            },
          },
        }));
      },
      listTenantLevels: (tenantId) =>
        (workspaces[tenantId]?.hierarchy.levels ?? []).sort((a, b) => a.order - b.order),
      listTenantOrgUnits: (tenantId) => orgUnits.filter((item) => item.tenantId === tenantId),
      createTenantOrgUnit: (input) => {
        const created: OrgUnit = {
          ...input,
          id: `ou-${Math.random().toString(36).slice(2, 9)}`,
        };
        setOrgUnits((current) => [created, ...current]);
        return created;
      },
      updateTenantOrgUnit: (orgUnitId, updates) => {
        setOrgUnits((current) =>
          current.map((unit) => (unit.id === orgUnitId ? { ...unit, ...updates } : unit)),
        );
      },
      deleteTenantOrgUnit: (orgUnitId) => {
        const hasChildren = orgUnits.some((unit) => unit.parentOrgUnitId === orgUnitId);
        const hasUsers = users.some((user) => user.orgUnitIds.includes(orgUnitId));
        if (hasChildren || hasUsers) {
          return false;
        }
        setOrgUnits((current) => current.filter((unit) => unit.id !== orgUnitId));
        return true;
      },
      listTenantUsers: (tenantId) => users.filter((item) => item.tenantId === tenantId),
      createTenantUser: (input) => {
        const tenant = platformTenants.find((item) => item.id === input.tenantId);
        validateUserAssignments(
          input,
          tenant ?? null,
          roles,
          orgUnits,
          getAccessibleModuleCodes(tenant?.enabledModuleCodes ?? [], modules),
        );
        const created: UserRecord = {
          ...input,
          linkedVendorId: input.linkedVendorId ?? null,
          linkedCustomerId: input.linkedCustomerId ?? null,
          linkedDriverId: input.linkedDriverId ?? null,
          driverName: input.driverName ?? "",
          driverCode: input.driverCode ?? "",
          id: `user-${Math.random().toString(36).slice(2, 9)}`,
          lastActive: new Date().toISOString(),
        };
        setUsers((current) => [created, ...current]);
        setPlatformTenants((current) =>
          current.map((tenant) =>
            tenant.id === input.tenantId
              ? {
                  ...tenant,
                  health: { ...tenant.health, activeUsers: tenant.health.activeUsers + 1 },
                }
              : tenant,
          ),
        );
        return created;
      },
      updateTenantUser: (userId, updates) => {
        const existingUser = users.find((user) => user.id === userId);
        if (!existingUser) {
          return;
        }
        const tenant = platformTenants.find((item) => item.id === existingUser.tenantId);
        validateUserAssignments(
          { ...existingUser, ...updates },
          tenant ?? null,
          roles,
          orgUnits,
          getAccessibleModuleCodes(tenant?.enabledModuleCodes ?? [], modules),
        );
        setUsers((current) =>
          current.map((user) =>
            user.id === userId
                ? {
                    ...user,
                    ...updates,
                    linkedVendorId: updates.linkedVendorId ?? user.linkedVendorId ?? null,
                    linkedCustomerId: updates.linkedCustomerId ?? user.linkedCustomerId ?? null,
                    linkedDriverId: updates.linkedDriverId ?? user.linkedDriverId ?? null,
                    driverName: updates.driverName ?? user.driverName ?? "",
                    driverCode: updates.driverCode ?? user.driverCode ?? "",
                  }
              : user,
          ),
        );
      },
      listTenantRoles: (tenantId) => roles.filter((item) => item.tenantId === tenantId),
      createTenantRole: (input) => {
        if (!input.hierarchyLevelId) {
          throw new Error("Select the hierarchy level for this role.");
        }
        validateRoleModules(input, platformTenants, modules);
        const created: RoleDefinition = {
          ...input,
          id: `role-${Math.random().toString(36).slice(2, 9)}`,
        };
        setRoles((current) => [created, ...current]);
        return created;
      },
      updateTenantRole: (roleId, updates) => {
        if (updates.hierarchyLevelId !== undefined && !updates.hierarchyLevelId) {
          throw new Error("Select the hierarchy level for this role.");
        }
        const currentRole = roles.find((role) => role.id === roleId);
        if (!currentRole) {
          return;
        }
        const nextRole = { ...currentRole, ...updates };
        validateRoleModules(nextRole, platformTenants, modules);
        if (
          updates.hierarchyLevelId &&
          updates.hierarchyLevelId !== currentRole.hierarchyLevelId
        ) {
          const assignedUsers = users.filter((user) => user.roleId === roleId);
          const invalidAssignment = assignedUsers.some((user) =>
            user.orgUnitIds.some((orgUnitId) => {
              const orgUnit = orgUnits.find((item) => item.id === orgUnitId);
              return !orgUnit || orgUnit.hierarchyLevelId !== updates.hierarchyLevelId;
            }),
          );
          if (invalidAssignment) {
            throw new Error(
              "This role is already assigned to users on org units from another level. Update those user assignments first.",
            );
          }
        }
        setRoles((current) =>
          current.map((role) => (role.id === roleId ? { ...role, ...updates } : role)),
        );
      },
      listTenantRolePermissions: (tenantId) =>
        rolePermissions.filter((permission) => permission.tenantId === tenantId),
      saveRolePermissions: (roleId, permissions) => {
        const role = roles.find((item) => item.id === roleId);
        if (!role) {
          throw new Error("Role not found.");
        }
        validateRolePermissions(role, permissions, platformTenants, modules, mockCapabilities);
        setRolePermissions((current) => [
          ...current.filter((permission) => permission.roleId !== roleId),
          ...permissions,
        ]);
      },
      listTenantCapabilities: (tenantId) => {
        const tenant = platformTenants.find((item) => item.id === tenantId);
        const enabledCodes = new Set(getAccessibleModuleCodes(tenant?.enabledModuleCodes ?? [], modules));
        const activeModuleMap = getActiveModuleMap(modules);
        return mockCapabilities.filter(
          (capability) =>
            enabledCodes.has(normalizeModuleKey(capability.moduleCode)) &&
            activeModuleMap.has(normalizeModuleKey(capability.moduleCode)),
        );
      },
      listTenantAuditLogs: (tenantId) =>
        mockTenantAuditLogs.filter((item) => item.tenantId === tenantId),
    }),
    [
      modules,
      orgUnits,
      platformAuditLogs,
      platformSettings,
      platformTenants,
      rolePermissions,
      roles,
      tenantCustomerAddresses,
      tenantCustomerRateCards,
      tenantBookings,
      tenantCustomers,
      tenantDrivers,
      tenantLRConfigs,
      tenantLrs,
      tenantLrPools,
      tenantLrRequests,
      tenantLrTransfers,
      tenantMaterials,
      tenantUOMDefinitions,
      tenantUOMMappings,
      tenantVehicles,
      tenantVendorRateCards,
      tenantVehicleTypes,
      tenantVendors,
      users,
      workspaces,
    ],
  );

  return <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>;
}

function buildStarterRolesForTenant(tenantId: string, enabledModuleCodes: string[]) {
  const starterModules = normalizeModuleKeys(enabledModuleCodes).length ? normalizeModuleKeys(enabledModuleCodes) : ["TMS"];
  return {
    tenantAdmin: {
      id: `role-tenant-admin-${tenantId}`,
      tenantId,
      name: "Tenant Admin",
      description: "Bootstrap tenant administrator.",
      hierarchyLevelId: "",
      moduleCodes: starterModules,
      active: true,
    },
    ceo: {
      id: `role-ceo-${tenantId}`,
      tenantId,
      name: "CEO",
      description: "Full tenant oversight.",
      hierarchyLevelId: "",
      moduleCodes: starterModules,
      active: true,
    },
  } satisfies Record<"tenantAdmin" | "ceo", RoleDefinition>;
}

function validateVehicleInput(
  tenantId: string,
  vehicle: Omit<TenantVehicle, "id" | "createdAt" | "updatedAt"> | TenantVehicleInput,
  tenantVendors: TenantVendor[],
  tenantVehicleTypes: TenantVehicleType[],
  existingVehicles: TenantVehicle[],
  currentVehicleId?: string,
) {
  const normalizedRegistration = vehicle.registrationNumber.trim().toUpperCase();
  if (!normalizedRegistration) {
    throw new Error("Registration number is required.");
  }
  const duplicateVehicle = existingVehicles.find(
    (item) =>
      item.id !== currentVehicleId &&
      item.tenantId === tenantId &&
      item.registrationNumber.trim().toUpperCase() === normalizedRegistration,
  );
  if (duplicateVehicle) {
    throw new Error("A vehicle with this registration number already exists for this tenant.");
  }
  if (!tenantVehicleTypes.some((item) => item.id === vehicle.vehicleTypeId && item.status === "active")) {
    throw new Error("Select an active vehicle type.");
  }
  if (vehicle.ownershipType === "VENDOR") {
    if (!vehicle.vendorId) {
      throw new Error("Vendor is required for vendor-owned vehicles.");
    }
    const vendor = tenantVendors.find((item) => item.id === vehicle.vendorId && item.status === "active");
    if (!vendor) {
      throw new Error("Select an active vendor for this vehicle.");
    }
  }
}

function validateDriverInput(
  tenantId: string,
  driver: Omit<TenantDriver, "id" | "createdAt" | "updatedAt"> | TenantDriverInput,
  tenantVehicles: TenantVehicle[],
  existingDrivers: TenantDriver[],
  currentDriverId?: string,
) {
  const normalizedLicense = driver.licenseNumber.trim().toUpperCase();
  if (!normalizedLicense) {
    throw new Error("License number is required.");
  }
  const duplicateLicense = existingDrivers.find(
    (item) =>
      item.id !== currentDriverId &&
      item.tenantId === tenantId &&
      item.licenseNumber.trim().toUpperCase() === normalizedLicense,
  );
  if (duplicateLicense) {
    throw new Error("A driver with this license number already exists for this tenant.");
  }
  if (driver.assignedVehicleId) {
    const assignedVehicle = tenantVehicles.find((item) => item.id === driver.assignedVehicleId);
    if (!assignedVehicle || !assignedVehicle.isActive) {
      throw new Error("Select an active vehicle for driver assignment.");
    }
  }
}

function validateUserAssignments(
  user: Omit<UserRecord, "id" | "lastActive"> | UserRecord,
  tenant: TenantRecord | null,
  roles: RoleDefinition[],
  orgUnits: OrgUnit[],
  enabledModuleCodes: string[],
) {
  const role = roles.find((item) => item.id === user.roleId);
  if (!role) {
    throw new Error("Select a valid role.");
  }
  if (!role.active) {
    throw new Error("Selected role is inactive.");
  }

  if (user.userType === "VENDOR" && !user.linkedVendorId) {
    throw new Error("Link a vendor record for this vendor user.");
  }
  if (user.userType === "DRIVER" && !user.linkedDriverId) {
    throw new Error("Link a driver record for this driver user.");
  }
  if (user.userType === "CUSTOMER" && !user.linkedCustomerId) {
    throw new Error("Link a customer record for this customer user.");
  }
  if (user.userType === "CUSTOMER" && !tenant?.customerPortalEnabled) {
    throw new Error("Enable customer portal access in tenant governance before creating customer portal users.");
  }

  if (user.userType !== "INTERNAL") {
    return;
  }

  if (role.dataScope === "ALL_TENANT") {
    return;
  }

  if (!user.orgUnitIds.length) {
    throw new Error("Assign at least one org unit for this internal user.");
  }

  const invalidOrgUnit = user.orgUnitIds
    .map((orgUnitId) => orgUnits.find((item) => item.id === orgUnitId))
    .find((orgUnit) => !orgUnit || orgUnit.hierarchyLevelId !== role.hierarchyLevelId);

  if (invalidOrgUnit !== undefined) {
    throw new Error("Selected org units do not match the hierarchy level allowed by the chosen role.");
  }
}

function validateRoleModules(
  role: Omit<RoleDefinition, "id"> | RoleDefinition,
  platformTenants: TenantRecord[],
  modules: PlatformModule[],
) {
  if (!role.moduleCodes.length) {
    throw new Error("Select at least one enabled module for this role.");
  }
  const tenant = platformTenants.find((item) => item.id === role.tenantId);
  if (!tenant) {
    throw new Error("Tenant not found for this role.");
  }
  const activeModuleMap = getActiveModuleMap(modules);
  const enabledModuleSet = new Set(getAccessibleModuleCodes(tenant.enabledModuleCodes, modules));
  const invalidModuleCode = normalizeModuleKeys(role.moduleCodes).find(
    (moduleCode) =>
      // Synthetic tenant-level "ADMIN" governance module: not in platform catalog.
      moduleCode !== "ADMIN" &&
      (!activeModuleMap.has(moduleCode) || !enabledModuleSet.has(moduleCode)),
  );
  if (invalidModuleCode) {
    throw new Error(`Module ${invalidModuleCode} is not enabled for this tenant.`);
  }
}

function validateRolePermissions(
  role: RoleDefinition,
  permissions: RolePermission[],
  platformTenants: TenantRecord[],
  modules: PlatformModule[],
  moduleFeatures: Capability[],
) {
  const tenant = platformTenants.find((item) => item.id === role.tenantId);
  if (!tenant) {
    throw new Error("Tenant not found for this role.");
  }
  const activeModuleMap = getActiveModuleMap(modules);
  const enabledModuleSet = new Set(getAccessibleModuleCodes(tenant.enabledModuleCodes, modules));
  const moduleFeatureMap = getModuleFeatureMap(moduleFeatures);
  const normalizedRoleModuleSet = new Set(normalizeModuleKeys(role.moduleCodes));

  permissions.forEach((permission) => {
    const normalizedPermissionModule = normalizeModuleKey(permission.moduleCode);
    if (!normalizedRoleModuleSet.has(normalizedPermissionModule)) {
      throw new Error(`Permission module ${permission.moduleCode} is not mapped to the selected role.`);
    }
    if (!enabledModuleSet.has(normalizedPermissionModule) || !activeModuleMap.has(normalizedPermissionModule)) {
      throw new Error(`Permission module ${permission.moduleCode} is not enabled for this tenant.`);
    }
    const moduleFeature = moduleFeatureMap.get(
      `${normalizedPermissionModule}::${permission.featureCode}`,
    );
    if (!moduleFeature || moduleFeature.moduleCode !== permission.moduleCode) {
      throw new Error(`Feature ${permission.featureCode} does not belong to module ${permission.moduleCode}.`);
    }
  });
}

function buildStarterPermissionsForTenant(
  tenantId: string,
  starterRoles: ReturnType<typeof buildStarterRolesForTenant>,
): RolePermission[] {
  return [
    ...starterRoles.tenantAdmin.moduleCodes.flatMap((moduleCode, index) =>
      mockCapabilities
        .filter((capability) => capability.moduleCode === moduleCode)
        .slice(0, 2)
        .map((capability, capabilityIndex) => ({
          id: `perm-${tenantId}-admin-${index}-${capabilityIndex}`,
          tenantId,
          roleId: starterRoles.tenantAdmin.id,
          moduleCode,
          featureCode: capability.code,
          canView: true,
          canCreate: capability.actions.includes("create"),
          canEdit: capability.actions.includes("edit"),
          canDelete: capability.actions.includes("delete"),
          canApprove: capability.actions.includes("approve"),
        })),
    ),
  ];
}

export function useMockStore() {
  const context = useContext(MockStoreContext);
  if (!context) {
    throw new Error("useMockStore must be used within MockStoreProvider");
  }
  return context;
}


