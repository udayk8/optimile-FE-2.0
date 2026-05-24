export const storageKeys = {
  platformTenants: "optimile.platform.tenants",
  platformModules: "optimile.platform.modules",
  platformAuditLogs: "optimile.platform.auditLogs",
  platformSettings: "optimile.platform.settings",
  tenantWorkspaces: "optimile.tenant.workspaces",
  tenantOrgUnits: "optimile.tenant.orgUnits",
  tenantUsers: "optimile.tenant.users",
  tenantRoles: "optimile.tenant.roles",
  tenantRolePermissions: "optimile.tenant.rolePermissions",
  globalCustomers: "optimile.platform.customers",
  tenantCustomers: "optimile.tenant.customers",
  tenantCustomerAddresses: "optimile.tenant.customerAddresses",
  tenantCustomerRateCards: "optimile.tenant.customerRateCards",
  globalVendors: "optimile.platform.vendors",
  tenantVendors: "optimile.tenant.vendors",
  tenantVendorRateCards: "optimile.tenant.vendorRateCards",
  tenantVehicleTypes: "optimile.tenant.vehicleTypes",
  tenantVehicles: "optimile.tenant.vehicles",
  tenantDrivers: "optimile.tenant.drivers",
  tenantMaterials: "optimile.tenant.materials",
  tenantUOMDefinitions: "optimile.tenant.uomDefinitions",
  tenantUOMMappings: "optimile.tenant.uomMappings",
  tenantLRConfigs: "optimile.tenant.lrConfigs",
  tenantLrs: "optimile.tenant.lrs",
  tenantLrPools: "optimile.tenant.lrPools",
  tenantLrRequests: "optimile.tenant.lrRequests",
  tenantLrTransfers: "optimile.tenant.lrTransfers",
  tenantBookings: "optimile.tenant.bookings",
  tenantInvoices: "optimile.tenant.invoices",
  sessionContext: "optimile.session.context",
} as const;

type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];
type RecoveryMergeStrategy = "replace" | "array" | "object";
type RecoverySource =
  | "missing"
  | "current"
  | "backup"
  | "legacy"
  | "namespaced"
  | "parse-error-unresolved";

type RecoveryRule = {
  exact: string[];
  prefixes: string[];
  mergeStrategy: RecoveryMergeStrategy;
};

type StorageReadMeta = {
  source: RecoverySource;
  skipNextWrite?: boolean;
};

const storageReadMeta = new Map<string, StorageReadMeta>();

const legacyRecoveryRules: Record<StorageKey, RecoveryRule> = {
  [storageKeys.platformTenants]: {
    exact: ["optimile.tenants", "optimile.platformTenants"],
    prefixes: [],
    mergeStrategy: "array",
  },
  [storageKeys.platformModules]: {
    exact: ["optimile.modules", "optimile.platformModules"],
    prefixes: [],
    mergeStrategy: "array",
  },
  [storageKeys.platformAuditLogs]: {
    exact: ["optimile.auditLogs", "optimile.platformAudit", "optimile.platform.audit"],
    prefixes: [],
    mergeStrategy: "array",
  },
  [storageKeys.platformSettings]: {
    exact: ["optimile.settings", "optimile.platformSettings"],
    prefixes: [],
    mergeStrategy: "object",
  },
  [storageKeys.tenantWorkspaces]: {
    exact: ["optimile.tenant.workspace", "optimile.tenantWorkspace", "optimile.hierarchy.workspaces"],
    prefixes: [
      "optimile.tenant.workspaces.",
      "optimile.tenant.workspaces:",
      "optimile.tenant.workspace.",
      "optimile.tenant.workspace:",
      "optimile.tenantWorkspace.",
      "optimile.tenantWorkspace:",
      "optimile.hierarchy.workspace.",
      "optimile.hierarchy.workspace:",
    ],
    mergeStrategy: "object",
  },
  [storageKeys.tenantOrgUnits]: {
    exact: ["optimile.orgUnits", "optimile.tenant.orgUnit", "optimile.tenantOrgUnits"],
    prefixes: [
      "optimile.tenant.orgUnits.",
      "optimile.tenant.orgUnits:",
      "optimile.tenant.orgUnit.",
      "optimile.tenant.orgUnit:",
      "optimile.tenantOrgUnits.",
      "optimile.tenantOrgUnits:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantUsers]: {
    exact: ["optimile.users", "optimile.tenant.user", "optimile.tenantUsers"],
    prefixes: [
      "optimile.tenant.users.",
      "optimile.tenant.users:",
      "optimile.users.",
      "optimile.users:",
      "optimile.tenant.user.",
      "optimile.tenant.user:",
      "optimile.tenantUsers.",
      "optimile.tenantUsers:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantRoles]: {
    exact: ["optimile.roles", "optimile.tenant.role", "optimile.tenantRoles"],
    prefixes: [
      "optimile.tenant.roles.",
      "optimile.tenant.roles:",
      "optimile.roles.",
      "optimile.roles:",
      "optimile.tenant.role.",
      "optimile.tenant.role:",
      "optimile.tenantRoles.",
      "optimile.tenantRoles:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantRolePermissions]: {
    exact: [
      "optimile.rolePermissions",
      "optimile.tenant.permissions",
      "optimile.tenant.rolePermission",
      "optimile.tenantRolePermissions",
    ],
    prefixes: [
      "optimile.tenant.rolePermissions.",
      "optimile.tenant.rolePermissions:",
      "optimile.rolePermissions.",
      "optimile.rolePermissions:",
      "optimile.tenant.permissions.",
      "optimile.tenant.permissions:",
      "optimile.tenantRolePermissions.",
      "optimile.tenantRolePermissions:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.globalCustomers]: {
    exact: ["optimile.customers", "optimile.platformCustomers"],
    prefixes: [],
    mergeStrategy: "array",
  },
  [storageKeys.tenantCustomers]: {
    exact: ["optimile.tenant.customer", "optimile.tenantCustomers"],
    prefixes: [
      "optimile.tenant.customers.",
      "optimile.tenant.customers:",
      "optimile.tenant.customer.",
      "optimile.tenant.customer:",
      "optimile.tenantCustomers.",
      "optimile.tenantCustomers:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantCustomerAddresses]: {
    exact: [
      "optimile.tenant.customerAddress",
      "optimile.tenant.customerAddresses.v1",
      "optimile.tenantCustomerAddresses",
    ],
    prefixes: [
      "optimile.tenant.customerAddresses.",
      "optimile.tenant.customerAddresses:",
      "optimile.tenant.customerAddress.",
      "optimile.tenant.customerAddress:",
      "optimile.tenantCustomerAddresses.",
      "optimile.tenantCustomerAddresses:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantCustomerRateCards]: {
    exact: [
      "optimile.tenant.customerRateCard",
      "optimile.tenant.customerRates",
      "optimile.tenantCustomerRateCards",
    ],
    prefixes: [
      "optimile.tenant.customerRateCards.",
      "optimile.tenant.customerRateCards:",
      "optimile.tenant.customerRateCard.",
      "optimile.tenant.customerRateCard:",
      "optimile.tenant.customerRates.",
      "optimile.tenant.customerRates:",
      "optimile.tenantCustomerRateCards.",
      "optimile.tenantCustomerRateCards:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.globalVendors]: {
    exact: ["optimile.vendors", "optimile.platformVendors"],
    prefixes: [],
    mergeStrategy: "array",
  },
  [storageKeys.tenantVendors]: {
    exact: ["optimile.tenant.vendor", "optimile.tenantVendors"],
    prefixes: [
      "optimile.tenant.vendors.",
      "optimile.tenant.vendors:",
      "optimile.tenant.vendor.",
      "optimile.tenant.vendor:",
      "optimile.tenantVendors.",
      "optimile.tenantVendors:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantVendorRateCards]: {
    exact: [
      "optimile.tenant.vendorRateCard",
      "optimile.tenant.vendorRates",
      "optimile.tenantVendorRateCards",
    ],
    prefixes: [
      "optimile.tenant.vendorRateCards.",
      "optimile.tenant.vendorRateCards:",
      "optimile.tenant.vendorRateCard.",
      "optimile.tenant.vendorRateCard:",
      "optimile.tenant.vendorRates.",
      "optimile.tenant.vendorRates:",
      "optimile.tenantVendorRateCards.",
      "optimile.tenantVendorRateCards:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantVehicleTypes]: {
    exact: ["optimile.tenant.vehicleType", "optimile.tenantVehicleTypes"],
    prefixes: [
      "optimile.tenant.vehicleTypes.",
      "optimile.tenant.vehicleTypes:",
      "optimile.tenant.vehicleType.",
      "optimile.tenant.vehicleType:",
      "optimile.tenantVehicleTypes.",
      "optimile.tenantVehicleTypes:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantVehicles]: {
    exact: ["optimile.tenant.vehicle", "optimile.tenantVehicles"],
    prefixes: [
      "optimile.tenant.vehicles.",
      "optimile.tenant.vehicles:",
      "optimile.tenant.vehicle.",
      "optimile.tenant.vehicle:",
      "optimile.tenantVehicles.",
      "optimile.tenantVehicles:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantDrivers]: {
    exact: ["optimile.tenant.driver", "optimile.tenantDrivers"],
    prefixes: [
      "optimile.tenant.drivers.",
      "optimile.tenant.drivers:",
      "optimile.tenant.driver.",
      "optimile.tenant.driver:",
      "optimile.tenantDrivers.",
      "optimile.tenantDrivers:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantMaterials]: {
    exact: ["optimile.tenant.material", "optimile.tenantMaterials"],
    prefixes: [
      "optimile.tenant.materials.",
      "optimile.tenant.materials:",
      "optimile.tenant.material.",
      "optimile.tenant.material:",
      "optimile.tenantMaterials.",
      "optimile.tenantMaterials:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantUOMDefinitions]: {
    exact: ["optimile.tenant.uomDefinition", "optimile.tenantUOMDefinitions"],
    prefixes: [
      "optimile.tenant.uomDefinitions.",
      "optimile.tenant.uomDefinitions:",
      "optimile.tenant.uomDefinition.",
      "optimile.tenant.uomDefinition:",
      "optimile.tenantUOMDefinitions.",
      "optimile.tenantUOMDefinitions:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantUOMMappings]: {
    exact: ["optimile.tenant.uomMapping", "optimile.tenantUOMMappings"],
    prefixes: [
      "optimile.tenant.uomMappings.",
      "optimile.tenant.uomMappings:",
      "optimile.tenant.uomMapping.",
      "optimile.tenant.uomMapping:",
      "optimile.tenantUOMMappings.",
      "optimile.tenantUOMMappings:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantLRConfigs]: {
    exact: [
      "optimile.tenant.lrConfig",
      "optimile.tenant.lr-config",
      "optimile.tenant.lrConfiguration",
      "optimile.tenantLRConfigs",
    ],
    prefixes: [
      "optimile.tenant.lrConfigs.",
      "optimile.tenant.lrConfigs:",
      "optimile.tenant.lrConfig.",
      "optimile.tenant.lrConfig:",
      "optimile.tenant.lr-config.",
      "optimile.tenant.lr-config:",
      "optimile.tenant.lrConfiguration.",
      "optimile.tenant.lrConfiguration:",
      "optimile.tenantLRConfigs.",
      "optimile.tenantLRConfigs:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantLrs]: {
    exact: ["optimile.tenant.lr", "optimile.tenantLrs"],
    prefixes: [
      "optimile.tenant.lrs.",
      "optimile.tenant.lrs:",
      "optimile.tenant.lr.",
      "optimile.tenant.lr:",
      "optimile.tenantLrs.",
      "optimile.tenantLrs:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantLrPools]: {
    exact: ["optimile.tenant.lrPool", "optimile.tenantLrPools"],
    prefixes: [
      "optimile.tenant.lrPools.",
      "optimile.tenant.lrPools:",
      "optimile.tenant.lrPool.",
      "optimile.tenant.lrPool:",
      "optimile.tenantLrPools.",
      "optimile.tenantLrPools:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantLrRequests]: {
    exact: ["optimile.tenant.lrRequest", "optimile.tenantLrRequests"],
    prefixes: [
      "optimile.tenant.lrRequests.",
      "optimile.tenant.lrRequests:",
      "optimile.tenant.lrRequest.",
      "optimile.tenant.lrRequest:",
      "optimile.tenantLrRequests.",
      "optimile.tenantLrRequests:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantLrTransfers]: {
    exact: ["optimile.tenant.lrTransfer", "optimile.tenantLrTransfers"],
    prefixes: [
      "optimile.tenant.lrTransfers.",
      "optimile.tenant.lrTransfers:",
      "optimile.tenant.lrTransfer.",
      "optimile.tenant.lrTransfer:",
      "optimile.tenantLrTransfers.",
      "optimile.tenantLrTransfers:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantBookings]: {
    exact: ["optimile.tenant.booking", "optimile.tenantBookings"],
    prefixes: [
      "optimile.tenant.bookings.",
      "optimile.tenant.bookings:",
      "optimile.tenant.booking.",
      "optimile.tenant.booking:",
      "optimile.tenantBookings.",
      "optimile.tenantBookings:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.tenantInvoices]: {
    exact: ["optimile.tenant.invoice", "optimile.tenantInvoices"],
    prefixes: [
      "optimile.tenant.invoices.",
      "optimile.tenant.invoices:",
      "optimile.tenant.invoice.",
      "optimile.tenant.invoice:",
      "optimile.tenantInvoices.",
      "optimile.tenantInvoices:",
    ],
    mergeStrategy: "array",
  },
  [storageKeys.sessionContext]: {
    exact: ["optimile.session", "optimile.sessionContext"],
    prefixes: [],
    mergeStrategy: "object",
  },
};

function safeJsonParse<T>(raw: string | null): T | undefined {
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn("Unable to parse localStorage value.", error);
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArrayValue(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function listLocalStorageEntries() {
  if (typeof window === "undefined") {
    return [] as Array<[string, string]>;
  }

  const entries: Array<[string, string]> = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const storageKey = window.localStorage.key(index);
    if (!storageKey) {
      continue;
    }
    const rawValue = window.localStorage.getItem(storageKey);
    if (rawValue === null) {
      continue;
    }
    entries.push([storageKey, rawValue]);
  }
  return entries;
}

function mergeArrayValues(values: unknown[][]) {
  const merged: unknown[] = [];
  const seen = new Set<string>();

  values.forEach((items) => {
    items.forEach((item) => {
      const identity =
        isRecord(item) && typeof item.id === "string"
          ? `id:${item.id}`
          : `json:${JSON.stringify(item)}`;
      if (seen.has(identity)) {
        return;
      }
      seen.add(identity);
      merged.push(item);
    });
  });

  return merged;
}

function mergeObjectValues(values: Array<Record<string, unknown>>) {
  return Object.assign({}, ...values);
}

function mergeRecoveredValues<T>(
  currentValue: T | undefined,
  recoveredValues: T[],
  mergeStrategy: RecoveryMergeStrategy,
) {
  const values = currentValue !== undefined ? [currentValue, ...recoveredValues] : recoveredValues;
  if (!values.length) {
    return undefined;
  }

  if (mergeStrategy === "array") {
    const arrayValues = (values as unknown[]).filter(isArrayValue) as unknown[][];
    return mergeArrayValues(arrayValues) as T;
  }

  if (mergeStrategy === "object") {
    const objectValues = (values as unknown[]).filter(isRecord) as Array<Record<string, unknown>>;
    return mergeObjectValues(objectValues) as T;
  }

  return values[0];
}

function writeRawStoredValue(key: string, rawValue: string) {
  if (typeof window === "undefined") {
    return;
  }

  const currentRawValue = window.localStorage.getItem(key);
  if (currentRawValue === rawValue) {
    return;
  }

  try {
    if (currentRawValue !== null) {
      window.localStorage.setItem(`${key}_backup`, currentRawValue);
    }
    window.localStorage.setItem(key, rawValue);
  } catch (error) {
    console.error(`Unable to persist localStorage key: ${key}`, error);
  }
}

function restoreRecoveredValue<T>(key: string, value: T) {
  try {
    writeRawStoredValue(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Unable to restore recovered localStorage key: ${key}`, error);
  }
}

function resolveStoredValue<T>(key: string) {
  if (typeof window === "undefined") {
    return {
      source: "missing" as const,
      value: undefined as T | undefined,
    };
  }

  const recoveryRule = legacyRecoveryRules[key as StorageKey];
  const localStorageEntries = listLocalStorageEntries();
  const currentRawValue = window.localStorage.getItem(key);
  const currentValue = safeJsonParse<T>(currentRawValue);
  const backupValue = safeJsonParse<T>(window.localStorage.getItem(`${key}_backup`));

  const exactRecoveredValues: T[] = [];
  const namespacedRecoveredValues: T[] = [];

  if (recoveryRule) {
    recoveryRule.exact.forEach((legacyKey) => {
      const parsed = safeJsonParse<T>(window.localStorage.getItem(legacyKey));
      if (parsed !== undefined) {
        exactRecoveredValues.push(parsed);
      }
    });

    localStorageEntries.forEach(([candidateKey, rawValue]) => {
      if (
        candidateKey === key ||
        candidateKey === `${key}_backup` ||
        recoveryRule.exact.includes(candidateKey)
      ) {
        return;
      }

      if (!recoveryRule.prefixes.some((prefix) => candidateKey.startsWith(prefix))) {
        return;
      }

      const parsed = safeJsonParse<T>(rawValue);
      if (parsed !== undefined) {
        namespacedRecoveredValues.push(parsed);
      }
    });
  }

  const mergedValue = mergeRecoveredValues(
    currentValue,
    [...exactRecoveredValues, ...namespacedRecoveredValues],
    recoveryRule?.mergeStrategy ?? "replace",
  );

  if (mergedValue !== undefined) {
    if (
      currentValue === undefined &&
      (backupValue !== undefined || exactRecoveredValues.length > 0 || namespacedRecoveredValues.length > 0)
    ) {
      const recoveredValue =
        mergeRecoveredValues(
          backupValue,
          [...exactRecoveredValues, ...namespacedRecoveredValues],
          recoveryRule?.mergeStrategy ?? "replace",
        ) ?? backupValue;

      if (recoveredValue !== undefined) {
        restoreRecoveredValue(key, recoveredValue);
        return {
          source: backupValue !== undefined ? ("backup" as const) : namespacedRecoveredValues.length ? ("namespaced" as const) : ("legacy" as const),
          value: recoveredValue,
        };
      }
    }

    if (exactRecoveredValues.length > 0 || namespacedRecoveredValues.length > 0) {
      restoreRecoveredValue(key, mergedValue);
      return {
        source: namespacedRecoveredValues.length ? ("namespaced" as const) : ("legacy" as const),
        value: mergedValue,
      };
    }

    return {
      source: "current" as const,
      value: mergedValue,
    };
  }

  if (backupValue !== undefined) {
    restoreRecoveredValue(key, backupValue);
    return {
      source: "backup" as const,
      value: backupValue,
    };
  }

  if (currentRawValue !== null) {
    return {
      source: "parse-error-unresolved" as const,
      value: undefined as T | undefined,
    };
  }

  return {
    source: "missing" as const,
    value: undefined as T | undefined,
  };
}

export function readStoredValue<T>(key: string, fallback: T): T {
  const { source, value } = resolveStoredValue<T>(key);
  storageReadMeta.set(key, {
    source,
    skipNextWrite: source === "parse-error-unresolved",
  });
  return value !== undefined ? value : fallback;
}

export function writeStoredValue<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  const meta = storageReadMeta.get(key);
  if (meta?.skipNextWrite) {
    storageReadMeta.set(key, {
      source: meta.source,
      skipNextWrite: false,
    });
    return;
  }

  try {
    writeRawStoredValue(key, JSON.stringify(value));
    storageReadMeta.set(key, { source: "current" });
  } catch (error) {
    console.error(`Unable to persist localStorage key: ${key}`, error);
  }
}
