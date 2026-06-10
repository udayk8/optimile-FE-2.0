import { buildMockLRNumber } from "@/modules/tms/booking/services/booking-engine";
import type {
  BookingRecord,
  BookingShipmentDocuments,
  TenantLrGenerationType,
  TenantLrPoolRecord,
  TenantLrRecord,
  TenantLrStatus,
} from "@/modules/tms/booking/types";
import type { TenantLRConfig } from "@/types/master-data";
import type { OrgUnit } from "@/types/access";
import { resolveManualLrFormatForOrgUnit } from "@/modules/tenant-admin/lib/manual-lr";

function isHierarchyManagedConfig(config: TenantLRConfig | null) {
  return Boolean(
    config &&
      (config.scopeType === "HIERARCHY" ||
        config.allocationStrategy === "HIERARCHICAL" ||
        config.allocationFlow?.mode === "HIERARCHY"),
  );
}

function getHierarchyOwnerOrgUnitId(config: TenantLRConfig) {
  return config.locationOrgUnitId || config.scopeOrgUnitIds?.[0] || null;
}

function requiresCustomerOwnership(config: TenantLRConfig | null) {
  return Boolean(config?.lrType === "PRE_GENERATED" && config.customerOwnershipEnabled);
}

function usesUserConsumption(config: TenantLRConfig | null) {
  return Boolean(config?.allocationFlow?.consumptionLevel === "USER");
}

function mapBookingStatusToLrStatus(status: BookingRecord["status"]): TenantLrStatus {
  if (status === "CANCELLED") {
    return "VOID";
  }
  if (status === "COMPLETED" || status === "INVOICED" || status === "PAID" || status === "DISPUTED") {
    return "COMPLETED";
  }
  if (status === "IN_TRANSIT" || status === "POD_PENDING" || status === "ARRIVED" || status === "DELAYED" || status === "EXCEPTION") {
    return "IN_TRANSIT";
  }
  if (status === "READY_FOR_DISPATCH" || status === "DISPATCHED") {
    return "ASSIGNED";
  }
  if (status === "DOCUMENT_COMPLETED") {
    return "GENERATED";
  }
  return "GENERATED";
}

function getYearToken(yearFormat: TenantLRConfig["yearFormat"]) {
  const currentYear = new Date().getFullYear();
  if (yearFormat === "YY") {
    return `${currentYear}`.slice(-2);
  }
  if (yearFormat === "YYYY") {
    return `${currentYear}`;
  }
  return "";
}

function buildFormattedLrNumber(
  config: Pick<TenantLRConfig, "prefix" | "yearFormat" | "numberSeparator" | "zeroPaddingLength">,
  sequenceNumber: number,
) {
  const separator = config.numberSeparator ?? "-";
  const prefix = config.prefix.trim().toUpperCase();
  const yearToken = getYearToken(config.yearFormat);
  const parts = [prefix];
  if (yearToken) {
    parts.push(yearToken);
  }
  parts.push(String(sequenceNumber).padStart(Math.max(config.zeroPaddingLength ?? 6, 1), "0"));
  return parts.filter(Boolean).join(separator);
}

function getPoolEntries(config: TenantLRConfig) {
  if (config.poolSource === "RANGE") {
    const start = Number(config.poolRangeStart);
    const end = Number(config.poolRangeEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      return [] as string[];
    }
    return Array.from({ length: end - start + 1 }, (_, index) =>
      config.lrType === "MANUAL"
        ? buildFormattedLrNumber(config, start + index)
        : `${start + index}`,
    );
  }

  return (config.poolEntries ?? "")
    .split(/[\r\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, entries) => entries.indexOf(entry) === index);
}

function getSequenceMatch(value: string, prefix: string) {
  const cleanPrefix = prefix.trim();
  if (!cleanPrefix) {
    return null;
  }
  if (!value.startsWith(cleanPrefix)) {
    return null;
  }
  const tail = value.slice(cleanPrefix.length);
  const match = tail.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : null;
}

function buildAutoLrNumber(
  config: TenantLRConfig,
  existingRecords: TenantLrRecord[],
  sequenceOffset: number,
) {
  const separator = config.numberSeparator ?? "-";
  const yearToken = getYearToken(config.yearFormat);
  const basePrefix = [config.prefix.trim().toUpperCase(), yearToken].filter(Boolean).join(separator).trim();
  const matchingSequences = existingRecords
    .map((record) => getSequenceMatch(record.lrNumber, basePrefix))
    .filter((value): value is number => Number.isFinite(value));
  const nextSequence = Math.max(...matchingSequences, 0) + 1 + sequenceOffset;
  return buildFormattedLrNumber(config, nextSequence);
}

// Auto LR number for a SPECIFIC place: uses the place-resolved format (child
// prefix/code) and a per-place sequence so each place keeps its own series.
function buildAutoLrNumberForPlace(
  format: ReturnType<typeof resolveManualLrFormatForOrgUnit>,
  placeRecords: TenantLrRecord[],
  sequenceOffset: number,
) {
  const separator = format.numberSeparator ?? "-";
  const yearToken = getYearToken(format.yearFormat);
  const basePrefix = [format.prefix.trim().toUpperCase(), yearToken].filter(Boolean).join(separator).trim();
  const matchingSequences = placeRecords
    .map((record) => getSequenceMatch(record.lrNumber, basePrefix))
    .filter((value): value is number => Number.isFinite(value));
  const nextSequence = Math.max(...matchingSequences, 0) + 1 + sequenceOffset;
  return buildFormattedLrNumber(format, nextSequence);
}

function buildGeneratedLrNumber(
  config: TenantLRConfig,
  existingRecords: TenantLrRecord[],
  generatedIndex: number,
) {
  if (config.lrType === "PRE_GENERATED") {
    const poolEntries = getPoolEntries(config);
    const poolEntry = poolEntries[generatedIndex];
    if (poolEntry) {
      return poolEntry;
    }
  }

  if (config.lrType === "MANUAL") {
    return buildAutoLrNumber(config, existingRecords, generatedIndex);
  }

  return buildAutoLrNumber(config, existingRecords, generatedIndex);
}

export function selectActiveTenantLRConfig(configs: TenantLRConfig[], booking: Pick<BookingRecord, "customerId" | "lrType">) {
  const activeConfigs = configs.filter((config) => config.status === "active");
  const sameTypeConfigs = activeConfigs.filter((config) => config.lrType === booking.lrType);
  return (
    sameTypeConfigs.find((config) => config.customerId === booking.customerId) ??
    sameTypeConfigs.find((config) => config.scopeType !== "CUSTOMER") ??
    sameTypeConfigs[0] ??
    null
  );
}

export function mapLrStatusFromBookingStatus(status: BookingRecord["status"]): TenantLrStatus {
  return mapBookingStatusToLrStatus(status);
}

export function buildTenantLrRecordsForBooking(input: {
  tenantId: string;
  booking: BookingRecord;
  shipmentDocuments: BookingShipmentDocuments;
  configs: TenantLRConfig[];
  existingRecords: TenantLrRecord[];
  timestamp?: string;
}) {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const selectedConfig = selectActiveTenantLRConfig(input.configs, input.booking);
  const fallbackBaseNumber = buildMockLRNumber([input.booking], "LR");
  const existingByDelivery = new Map(
    input.existingRecords
      .filter((record) => record.bookingId === input.booking.id)
      .map((record) => [record.deliveryId, record] as const),
  );

  const baseRecords = input.shipmentDocuments.deliveries.map((delivery, index) => {
    const deliveryRecord = input.booking.deliveries?.find((item) => item.id === delivery.deliveryId) ?? null;
    const generatedIndex = existingByDelivery.size
      ? existingByDelivery.size + index
      : index;
    const existing = existingByDelivery.get(delivery.deliveryId) ?? null;
    const lrNumber =
      existing?.lrNumber ??
      (selectedConfig
        ? buildGeneratedLrNumber(selectedConfig, input.existingRecords, generatedIndex)
        : `${fallbackBaseNumber}-${String(index + 1).padStart(2, "0")}`);
    const type: TenantLrGenerationType =
      existing?.type ??
      (selectedConfig?.lrType === "PRE_GENERATED"
        ? "PREGENERATED"
        : selectedConfig?.lrType === "MANUAL"
          ? "MANUAL"
          : "AUTO");

    return {
      id: existing?.id ?? `lr-${Math.random().toString(36).slice(2, 9)}`,
      tenantId: input.tenantId,
      lrNumber,
      bookingId: input.booking.id,
      deliveryId: delivery.deliveryId,
      customerId: input.booking.customerId,
      vehicleNumber: input.booking.assignment?.vehicleLabel ?? "",
      driverName: input.booking.assignment?.driverName ?? "",
      status: existing?.status ?? mapBookingStatusToLrStatus(input.booking.status),
      type,
      configId: existing?.configId ?? selectedConfig?.id ?? null,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      deliveryNo: deliveryRecord?.deliveryNo ?? index + 1,
    } satisfies TenantLrRecord & { deliveryNo: number };
  });

  return {
    config: selectedConfig,
    records: baseRecords.map(({ deliveryNo, ...record }) => record),
    bookingLrIds: baseRecords.map((record) => record.id),
    deliveryLrMap: new Map(baseRecords.map((record) => [record.deliveryId, record] as const)),
  };
}

export function buildTenantLrPoolsFromConfig(input: {
  tenantId: string;
  config: TenantLRConfig;
  existingPools: TenantLrPoolRecord[];
  ownerLevelId?: string | null;
  timestamp?: string;
}) {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const poolEntries = getPoolEntries(input.config);
  const existingByNumber = new Map(
    input.existingPools
      .filter((pool) => pool.tenantId === input.tenantId && pool.configId === input.config.id)
      .map((pool) => [pool.lrNumber, pool] as const),
  );

  return poolEntries.map((lrNumber) => {
    const existing = existingByNumber.get(lrNumber) ?? null;
    const defaultOwnerOrgUnitId = isHierarchyManagedConfig(input.config) ? getHierarchyOwnerOrgUnitId(input.config) : null;
    return {
      id: existing?.id ?? `lr-pool-${Math.random().toString(36).slice(2, 9)}`,
      lrNumberId: existing?.lrNumberId ?? existing?.id ?? `lr-pool-${Math.random().toString(36).slice(2, 9)}`,
      tenantId: input.tenantId,
      configId: input.config.id,
      lrNumber,
      poolType: existing?.poolType ?? (input.config.customerId ? "CUSTOMER_RESERVED" : "GENERAL"),
      status: existing?.status ?? "AVAILABLE",
      customerId: existing?.customerId ?? input.config.customerId ?? null,
      vendorId: input.config.vendorId ?? null,
      ownerPlaceId: existing?.ownerPlaceId ?? existing?.ownerLevelId ?? input.ownerLevelId ?? defaultOwnerOrgUnitId,
      currentPlaceId: existing?.currentPlaceId ?? existing?.ownerPlaceId ?? existing?.ownerLevelId ?? input.ownerLevelId ?? defaultOwnerOrgUnitId,
      ownerLevelId: existing?.ownerLevelId ?? input.ownerLevelId ?? defaultOwnerOrgUnitId,
      ownerUserId: existing?.ownerUserId ?? null,
      bookingId: existing?.bookingId ?? null,
      deliveryId: existing?.deliveryId ?? null,
      usedAt: existing?.usedAt ?? null,
      auditEvents: existing?.auditEvents ?? [],
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    } satisfies TenantLrPoolRecord;
  });
}

export function buildTenantLrAssignmentsForBooking(input: {
  tenantId: string;
  booking: BookingRecord;
  configs: TenantLRConfig[];
  existingRecords: TenantLrRecord[];
  existingPools: TenantLrPoolRecord[];
  actorOrgUnitId?: string | null;
  actorUserId?: string | null;
  selectedConfigId?: string | null;
  preferredLrNumber?: string | null;
  preferredLrNumbersByDelivery?: Record<string, string | null>;
  orgUnits?: OrgUnit[];
  timestamp?: string;
}) {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const selectedConfig =
    (input.selectedConfigId
      ? input.configs.find((config) => config.id === input.selectedConfigId) ?? null
      : null) ??
    selectActiveTenantLRConfig(input.configs, input.booking);
  const existingByDelivery = new Map(
    input.existingRecords
      .filter((record) => record.bookingId === input.booking.id)
      .map((record) => [record.deliveryId, record] as const),
  );
  const matchingPools = input.existingPools.filter(
    (pool) =>
      pool.tenantId === input.tenantId &&
      ["AVAILABLE", "ALLOCATED"].includes(pool.status) &&
      (!selectedConfig || pool.configId === selectedConfig.id) &&
      (
        (pool.poolType ?? (pool.customerId ? "CUSTOMER_RESERVED" : "GENERAL")) === "GENERAL"
          ? !pool.customerId
          : pool.customerId === input.booking.customerId
      ) &&
      (
        !isHierarchyManagedConfig(selectedConfig) ||
        (
          usesUserConsumption(selectedConfig)
            ? !input.actorUserId || pool.ownerUserId === input.actorUserId
            : !input.actorOrgUnitId || (pool.currentPlaceId ?? pool.ownerPlaceId ?? pool.ownerLevelId) === input.actorOrgUnitId
        )
      ),
  );
  // Per-delivery LR consumption: each delivery gets its own unique LR. For
  // MANUAL / PRE_GENERATED the dispatcher can pick a specific LR per delivery
  // (preferredLrNumbersByDelivery); anything not chosen falls back to the legacy
  // single preferredLrNumber (first delivery) or the next available pool in
  // order. A pool is never handed to two deliveries. AUTO generates instead.
  const perDelivery = input.preferredLrNumbersByDelivery ?? {};
  const usedPoolIds = new Set<string>();
  const pickPoolForDelivery = (deliveryId: string, index: number) => {
    if (selectedConfig?.lrType === "AUTO") {
      return null;
    }
    const preferred =
      perDelivery[deliveryId] ?? (index === 0 ? input.preferredLrNumber ?? null : null);
    if (preferred) {
      const exact = matchingPools.find(
        (pool) => pool.lrNumber === preferred && !usedPoolIds.has(pool.id),
      );
      if (exact) {
        usedPoolIds.add(exact.id);
        return exact;
      }
    }
    const next = matchingPools.find((pool) => !usedPoolIds.has(pool.id));
    if (next) {
      usedPoolIds.add(next.id);
      return next;
    }
    return null;
  };

  const records = (input.booking.deliveries ?? []).map((delivery, index) => {
    const existing = existingByDelivery.get(delivery.id) ?? null;
    if (existing) {
      return existing;
    }

    const poolRecord = pickPoolForDelivery(delivery.id, index);
    const lrNumber = poolRecord?.lrNumber ?? (
      selectedConfig
        ? selectedConfig.lrType === "AUTO" && input.orgUnits
          ? buildAutoLrNumberForPlace(
              resolveManualLrFormatForOrgUnit(selectedConfig, input.actorOrgUnitId ?? null, input.orgUnits),
              input.existingRecords.filter(
                (record) => record.type === "AUTO" && (record.orgUnitId ?? null) === (input.actorOrgUnitId ?? null),
              ),
              index,
            )
          : buildGeneratedLrNumber(selectedConfig, input.existingRecords, index)
        : `${buildMockLRNumber([input.booking], "LR")}-${String(index + 1).padStart(2, "0")}`
    );
    const type: TenantLrGenerationType =
      poolRecord
        ? selectedConfig?.lrType === "PRE_GENERATED"
          ? "PREGENERATED"
          : selectedConfig?.lrType === "MANUAL"
            ? "MANUAL"
            : "AUTO"
        : selectedConfig?.lrType === "PRE_GENERATED"
          ? "MANUAL"
          : selectedConfig?.lrType === "MANUAL"
            ? "MANUAL"
            : "AUTO";

    return {
      id: `lr-${Math.random().toString(36).slice(2, 9)}`,
      tenantId: input.tenantId,
      lrNumber,
      bookingId: input.booking.id,
      deliveryId: delivery.id,
      customerId: input.booking.customerId,
      vehicleNumber: input.booking.assignment?.vehicleLabel ?? "",
      driverName: input.booking.assignment?.driverName ?? "",
      status: mapBookingStatusToLrStatus(input.booking.status),
      type,
      configId: selectedConfig?.id ?? null,
      // Tag the owning place so Auto LR can derive per-place generated counts.
      orgUnitId: input.actorOrgUnitId ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies TenantLrRecord;
  });

  return {
    config: selectedConfig,
    records,
    bookingLrIds: records.map((record) => record.id),
    deliveryLrMap: new Map(records.map((record) => [record.deliveryId, record] as const)),
  };
}
