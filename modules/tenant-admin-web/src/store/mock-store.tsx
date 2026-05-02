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
  mockTenantLRConfigs,
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
} from "../mocks/data";
import { buildHierarchyConfigForTemplate } from "../lib/hierarchy-templates";
import {
  readStoredValue,
  storageKeys,
  writeStoredValue,
} from "../lib/storage/browser-storage";
import {
  getAccessibleModuleCodes,
  normalizeModuleKey,
  normalizeModuleKeys,
} from "../lib/tenant-admin";
import { buildMockLRNumber, canTransitionBooking, normalizeBookingId } from "../modules/tms/booking/services/booking-engine";
import { ensureShipmentDocuments } from "../modules/tms/booking/services/shipment-documents";
import type { AuditLogRecord, Capability } from "../types/abac";
import type {
  HierarchyLevel,
  OrgUnit,
  RoleDefinition,
  RolePermission,
  UserRecord,
} from "../types/access";
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
} from "../types/customer";
import type {
  BookingAssignmentInput,
  BookingInput,
  BookingRecord,
  BookingStatusTransitionInput,
} from "../modules/tms/booking/types";
import type {
  TenantDriver,
  TenantDriverInput,
  TenantVehicle,
  TenantVehicleInput,
} from "../types/fleet";
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
} from "../types/master-data";
import type {
  TenantVendor,
  TenantVendorInput,
  TenantVendorRateCard,
  TenantVendorRateCardInput,
} from "../types/vendor";
import type {
  PlatformAuditEvent,
  PlatformModule,
  PlatformSettings,
  TenantPlan,
  TenantRecord,
} from "../types/platform";
import type {
  CreateTenantInput,
  HierarchyTemplateCode,
  TenantHierarchyConfig,
  TenantWorkspaceState,
} from "../types/tenant-workspace";

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
  updatePlatformTenant: (
    tenantId: string,
    updates: Partial<
      Pick<TenantRecord, "name" | "code" | "region" | "industry" | "planId" | "status" | "enabledModuleCodes">
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
    updates: Partial<Pick<RoleDefinition, "name" | "description" | "hierarchyLevelId" | "moduleCodes" | "active">>,
  ) => void;
  listTenantRolePermissions: (tenantId: string) => RolePermission[];
  saveRolePermissions: (roleId: string, permissions: RolePermission[]) => void;
  listTenantCapabilities: (tenantId: string) => Capability[];
  listTenantAuditLogs: (tenantId: string) => AuditLogRecord[];
}

const MockStoreContext = createContext<MockStoreValue | null>(null);

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
      driverName: "",
      driverCode: "",
    };
  });
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
  return {
    id: address.id,
    addressCode: address.addressCode?.trim() || undefined,
    type: Array.from(new Set((address.type ?? []).filter(Boolean))),
    contactCode: address.contactCode?.trim() || undefined,
    name: address.name.trim(),
    line1: address.line1.trim(),
    line2: address.line2?.trim() || undefined,
    city: address.city.trim(),
    state: address.state.trim(),
    country: address.country?.trim() || undefined,
    pincode: address.pincode.trim(),
    gstin: address.gstin?.trim().toUpperCase() || undefined,
    contactPerson: address.contactPerson?.trim() || undefined,
    contactNumber: address.contactNumber?.trim() || undefined,
    emailId: address.emailId?.trim().toLowerCase() || undefined,
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
    contactCode: address.contactCode,
    name: address.addressName,
    line1: address.addressLine1,
    line2: address.addressLine2,
    city: address.city,
    state: address.state,
    country: address.country,
    pincode: address.pincode,
    gstin: address.gstin,
    contactPerson: address.contactPerson,
    contactNumber: address.contactNumber,
    emailId: address.emailId,
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
    addressCode: address.addressCode?.trim() || undefined,
    addressTypes:
      address.addressTypes && address.addressTypes.length
        ? Array.from(new Set(address.addressTypes.filter(Boolean)))
        : getLegacyAddressTypes(address.addressType),
    gstin: address.gstin?.trim().toUpperCase() || undefined,
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
      addressCode: "CUSTADDR-0001",
      addressType: "consignor" as const,
      addressTypes: ["Billing"] as CustomerAddressTag[],
      addressName: `${customer.name} Billing Address`,
    gstin: customer.gstin ?? customer.gstNumber,
      contactCode: undefined,
      contactPerson: customer.primaryContactName,
      contactNumber: customer.primaryContactPhone,
      emailId: customer.primaryContactEmail,
      addressLine1: customer.billingAddress?.trim() ?? "",
      addressLine2: "",
      landmark: "",
      city: "Pending",
      state: "Pending",
      country: "India",
      pincode: "000000",
      isDefault: true,
      status: "active" as const,
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
    yearFormat: config.yearFormat ?? getDefaultYearFormat(lrType),
    zeroPaddingLength: config.zeroPaddingLength ?? 6,
    poolSource,
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
  return storedConfigs.map((config) => normalizeTenantLRConfig(config));
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
      pod: booking.pod ?? null,
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
  if (status === "ASSIGNED") {
    return "VEHICLE_ASSIGNED" as const;
  }
  if (status === "LOADING") {
    return "LOADING_STARTED" as const;
  }
  if (status === "LOADED") {
    return "LOADING_COMPLETED" as const;
  }
  if (status === "READY_FOR_DISPATCH") {
    return "DOCUMENT_COMPLETED" as const;
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
      pod: booking.pod ?? null,
      documents: Array.isArray(booking.documents) ? booking.documents : [],
      shipmentDocuments: ensureShipmentDocuments({
        deliveries,
        shipmentDocuments: booking.shipmentDocuments ?? null,
      }),
      deliveries: syncBookingDeliveriesStatus(deliveries, normalizedStatus, booking.assignment?.lrNumber ?? null),
      expenses: Array.isArray(booking.expenses) ? booking.expenses : [],
      assignment: booking.assignment ?? null,
      statusTimeline: normalizedTimeline,
    };
  });
}

function matchesBookingId(booking: BookingRecord, bookingId: string) {
  const normalizedTarget = normalizeBookingId(bookingId);
  return normalizedTarget.length > 0 && (
    normalizeBookingId(booking.id) === normalizedTarget ||
    normalizeBookingId(booking.bookingId) === normalizedTarget
  );
}

export function MockStoreProvider({ children }: PropsWithChildren) {
  const seededWorkspaces = loadSeededState(storageKeys.tenantWorkspaces, buildSeedWorkspaces());
  const seededPlatformTenants = loadSeededState(storageKeys.platformTenants, mockPlatformTenants);
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
  const [platformTenants, setPlatformTenants] = useState<TenantRecord[]>(() =>
    seededPlatformTenants,
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
    normalizeStoredTenantVendors(
      loadSeededState(storageKeys.tenantVendors, mockTenantVendors),
      legacyStoredVendors,
    ),
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
    loadSeededState(storageKeys.tenantVendorRateCards, mockTenantVendorRateCards),
  );
  const [tenantVehicleTypes, setTenantVehicleTypes] = useState<TenantVehicleType[]>(() =>
    loadSeededState(storageKeys.tenantVehicleTypes, mockTenantVehicleTypes),
  );
  const [tenantVehicles, setTenantVehicles] = useState<TenantVehicle[]>(() =>
    normalizeStoredTenantVehicles(loadSeededState(storageKeys.tenantVehicles, mockTenantVehicles)),
  );
  const [tenantDrivers, setTenantDrivers] = useState<TenantDriver[]>(() =>
    normalizeStoredTenantDrivers(loadSeededState(storageKeys.tenantDrivers, mockTenantDrivers)),
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
  const [tenantLRConfigs, setTenantLRConfigs] = useState<TenantLRConfig[]>(() =>
    normalizeStoredTenantLRConfigs(loadSeededState(storageKeys.tenantLRConfigs, mockTenantLRConfigs)),
  );
  const [tenantBookings, setTenantBookings] = useState<BookingRecord[]>(() =>
    normalizeStoredTenantBookings(loadSeededState(storageKeys.tenantBookings, mockTenantBookings)),
  );
  const [workspaces, setWorkspaces] = useState<Record<string, TenantWorkspaceState>>(() => seededWorkspaces);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>(() =>
    loadSeededState(storageKeys.tenantOrgUnits, mockOrgUnits),
  );
  const [users, setUsers] = useState<UserRecord[]>(() =>
    normalizeStoredUsers(loadSeededState(storageKeys.tenantUsers, mockUsers)),
  );
  const [roles, setRoles] = useState<RoleDefinition[]>(() =>
    normalizeStoredRoles(
      loadSeededState(storageKeys.tenantRoles, mockRoles),
      seededWorkspaces,
      seededPlatformTenants,
      seededRolePermissions,
    ),
  );
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>(() =>
    seededRolePermissions,
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
    writeStoredValue(storageKeys.tenantBookings, tenantBookings);
  }, [tenantBookings]);

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
    starterRoles.tenantAdmin.hierarchyLevelId = rootLevel.id;
    starterRoles.ceo.hierarchyLevelId = rootLevel.id;
    const starterRoleId =
      input.starterRole === "tenant_admin"
        ? starterRoles.tenantAdmin.id
        : starterRoles.ceo.id;
    const bootstrapOrgUnit: OrgUnit = {
      id: `ou-${normalizedCode}-root`,
      tenantId,
      name: `${input.name.trim()} ${rootLevel.name}`,
      hierarchyLevelId: rootLevel.id,
      parentOrgUnitId: null,
      status: "active",
    };
    const bootstrapUser: UserRecord = {
      id: `user-${normalizedCode}-admin`,
      tenantId,
      name: input.primaryContactName.trim(),
      email: input.primaryContactEmail.trim().toLowerCase(),
      userType: "INTERNAL",
      roleId: starterRoleId,
      orgUnitIds: [bootstrapOrgUnit.id],
      linkedVendorId: null,
      linkedCustomerId: null,
      driverName: "",
      driverCode: "",
      status: "active",
      lastActive: new Date().toISOString(),
    };

    const tenant: TenantRecord = {
      id: tenantId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      region: "Pending Region",
      industry: "Logistics",
      planId: input.planId,
      status: input.status,
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

    setPlatformTenants((current) => [tenant, ...current]);
    setWorkspaces((current) => ({
      ...current,
      [tenantId]: {
        tenantId,
        startingBlueprint: input.defaultHierarchyTemplate,
        hierarchy,
      },
    }));
    setOrgUnits((current) => [bootstrapOrgUnit, ...current]);
    setRoles((current) => [...Object.values(starterRoles), ...current]);
    setRolePermissions((current) => [
      ...buildStarterPermissionsForTenant(tenantId, starterRoles),
      ...current,
    ]);
    setUsers((current) => [bootstrapUser, ...current]);
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
        };

        setPlatformTenants((current) =>
          current.map((tenant) => (tenant.id === tenantId ? nextTenant : tenant)),
        );
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
        const created: TenantCustomerAddress = {
          ...input,
          addressCode: input.addressCode?.trim() || undefined,
          addressTypes:
            input.addressTypes && input.addressTypes.length
              ? Array.from(new Set(input.addressTypes.filter(Boolean)))
              : getLegacyAddressTypes(input.addressType),
          contactCode: input.contactCode?.trim() || undefined,
          gstin: input.gstin?.trim().toUpperCase() || undefined,
          id: `customer-address-${Math.random().toString(36).slice(2, 9)}`,
          emailId: input.emailId?.trim().toLowerCase() || undefined,
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
          addressCode:
            updates.addressCode !== undefined
              ? updates.addressCode.trim() || undefined
              : existing.addressCode,
          addressTypes:
            updates.addressTypes !== undefined
              ? Array.from(new Set(updates.addressTypes.filter(Boolean)))
              : existing.addressTypes ?? getLegacyAddressTypes(existing.addressType),
          contactCode:
            updates.contactCode !== undefined
              ? updates.contactCode.trim() || undefined
              : existing.contactCode,
          gstin:
            updates.gstin !== undefined
              ? updates.gstin.trim().toUpperCase() || undefined
              : existing.gstin,
          emailId:
            updates.emailId !== undefined
              ? updates.emailId.trim().toLowerCase() || undefined
              : existing.emailId,
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
                    pod: null,
                  },
                ],
          assignment: input.assignment ?? null,
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
              pod: updates.pod !== undefined ? updates.pod : item.pod ?? null,
              documents: updates.documents !== undefined ? [...updates.documents] : item.documents ?? [],
              expenses: updates.expenses !== undefined ? [...updates.expenses] : item.expenses ?? [],
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
        return updatedRecord;
      },
      assignTenantBooking: (bookingId, input) => {
        const existing = tenantBookings.find((item) => matchesBookingId(item, bookingId));
        if (!existing) {
          throw new Error("Booking not found.");
        }
        if (!canTransitionBooking(existing.status, "VEHICLE_ASSIGNED")) {
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
        const updated: BookingRecord = {
          ...existing,
          status: "VEHICLE_ASSIGNED",
          assignment: {
            vendorId: input.vendorId,
            vendorName: input.vendorName,
            vehicleId: input.vehicleId,
            vehicleLabel: input.vehicleLabel,
            driverId: input.driverId,
            driverName: input.driverName,
            vendorFreight: input.vendorFreight,
            marginPercent: input.marginPercent,
            assignedAt: timestamp,
            lrNumber: existing.assignment?.lrNumber ?? null,
            loadingStartedAt: existing.assignment?.loadingStartedAt ?? null,
            loadingCompletedAt: existing.assignment?.loadingCompletedAt ?? null,
          },
          updatedAt: timestamp,
          deliveries: syncBookingDeliveriesStatus(existing.deliveries, "VEHICLE_ASSIGNED"),
          statusTimeline: [
            ...existing.statusTimeline,
            {
              id: `booking-status-${Date.now()}`,
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
        return updated;
      },
      listTenantVendorRateCards: (tenantVendorId) =>
        tenantVendorRateCards.filter((item) => item.tenantVendorId === tenantVendorId),
      createTenantVendorRateCard: (input) => {
        const now = new Date().toISOString();
        const created: TenantVendorRateCard = {
          ...input,
          id: `vendor-rate-card-${Math.random().toString(36).slice(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };
        setTenantVendorRateCards((current) => [created, ...current]);
        return created;
      },
      updateTenantVendorRateCard: (rateCardId, updates) => {
        const existing = tenantVendorRateCards.find((item) => item.id === rateCardId);
        if (!existing) {
          throw new Error("Vendor rate card not found.");
        }
        const updated: TenantVendorRateCard = {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
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
        const now = new Date().toISOString();
        const created = normalizeTenantLRConfig({
          ...input,
          id: `lr-config-${Math.random().toString(36).slice(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        });
        setTenantLRConfigs((current) => [created, ...current]);
        return created;
      },
      updateTenantLRConfig: (lrConfigId, updates) => {
        const existing = tenantLRConfigs.find((item) => item.id === lrConfigId);
        if (!existing) {
          throw new Error("LR configuration not found.");
        }
        const updated = normalizeTenantLRConfig({
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
        setTenantLRConfigs((current) =>
          current.map((item) => (item.id === lrConfigId ? updated : item)),
        );
        return updated;
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
          roles,
          orgUnits,
          getAccessibleModuleCodes(tenant?.enabledModuleCodes ?? [], modules),
        );
        const created: UserRecord = {
          ...input,
          linkedVendorId: input.linkedVendorId ?? null,
          linkedCustomerId: input.linkedCustomerId ?? null,
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
    if ((assignedVehicle.vendorId ?? null) !== (driver.vendorId ?? null)) {
      throw new Error("Driver ownership must match the assigned vehicle ownership.");
    }
  }
}

function validateUserAssignments(
  user: Omit<UserRecord, "id" | "lastActive"> | UserRecord,
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
  if (!areRoleModulesEnabled(role, enabledModuleCodes)) {
    throw new Error("Selected role is restricted because one or more mapped modules are disabled for this tenant.");
  }

  if (user.userType === "VENDOR" && !user.linkedVendorId) {
    throw new Error("Link a vendor record for this vendor user.");
  }
  if (user.userType === "DRIVER" && !`${user.driverName ?? ""}${user.driverCode ?? ""}`.trim()) {
    throw new Error("Enter a driver name or driver code for this driver user.");
  }
  if (user.userType === "CUSTOMER" && !user.linkedCustomerId) {
    throw new Error("Link a customer record for this customer user.");
  }

  if (user.userType !== "INTERNAL") {
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
    (moduleCode) => !activeModuleMap.has(moduleCode) || !enabledModuleSet.has(moduleCode),
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
    ...starterRoles.ceo.moduleCodes.slice(0, 2).map((moduleCode, index) => {
      const capability = mockCapabilities.find((item) => item.moduleCode === moduleCode);
      return {
        id: `perm-${tenantId}-ceo-${index}`,
        tenantId,
        roleId: starterRoles.ceo.id,
        moduleCode,
        featureCode: capability?.code ?? "bookings",
        canView: true,
        canCreate: capability?.actions.includes("create") ?? false,
        canEdit: capability?.actions.includes("edit") ?? false,
        canDelete: capability?.actions.includes("delete") ?? false,
        canApprove: capability?.actions.includes("approve") ?? false,
      };
    }),
  ];
}

export function useMockStore() {
  const context = useContext(MockStoreContext);
  if (!context) {
    throw new Error("useMockStore must be used within MockStoreProvider");
  }
  return context;
}
