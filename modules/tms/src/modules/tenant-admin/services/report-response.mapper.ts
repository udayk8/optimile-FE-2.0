import { buildAnalyticsCacheKey, type AnalyticsScope, type TemplatedAnalyticsQuery } from "@shared-api";
import type { BookingRecord } from "@/modules/tms/booking/types";
import { buildSupersetEmbedConfig } from "./superset-embed.service";
import { resolveReportTemplate } from "./template-registry.service";
import type {
  ReportQueryEngineResult,
  ReportingExecutionTrace,
  TenantAnalyticsInput,
  TenantAnalyticsResult,
  TenantAnalyticsSeriesPoint,
  TenantAnalyticsSnapshot,
} from "./reporting-types";

function formatMonthKey(dateValue: string) {
  const date = new Date(dateValue);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getGroupingValue(
  booking: BookingRecord,
  groupBy: string | undefined,
  customerMap: Map<string, string>,
) {
  switch (groupBy) {
    case "status":
      return { key: booking.status, label: booking.status.split("_").join(" ") };
    case "customer":
      return {
        key: booking.customerId,
        label: customerMap.get(booking.customerId) ?? "Unmapped customer",
      };
    case "serviceType":
      return { key: booking.serviceType, label: booking.serviceType };
    case "commercialType":
      return { key: booking.commercialType, label: booking.commercialType };
    case "month":
    default: {
      const monthKey = formatMonthKey(booking.createdAt);
      return { key: monthKey, label: formatMonthLabel(monthKey) };
    }
  }
}

function sumFreight(bookings: BookingRecord[]) {
  return bookings.reduce((total, booking) => total + booking.pricing.calculatedFreight, 0);
}

function buildBreakdown(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return [...counts.entries()]
    .map(([key, value]) => ({ key, label: key, value }))
    .sort((left, right) => right.value - left.value);
}

function applySearch(rows: TenantAnalyticsResult["rows"], search: string | undefined) {
  const needle = (search ?? "").trim().toLowerCase();
  if (!needle) {
    return rows;
  }

  return rows.filter((row) =>
    [
      row.bookingId,
      row.customer,
      row.status,
      row.assignedVendor,
      row.assignedDriver,
      row.commercialType,
      row.serviceType,
    ].some((value) => value.toLowerCase().includes(needle)),
  );
}

function buildTrace(
  sql: string,
  cacheStatus: "hit" | "miss",
): ReportingExecutionTrace {
  return {
    controller: "ReportingV1Controller",
    middleware: "ReportingAccessMiddleware",
    service: "ReportingV1Service",
    templateService: "TemplateRegistryService",
    executor: "TemplateExecutorService",
    queryEngine: "ReportQueryEngine",
    database: "ClickHouse",
    cache: "Redis",
    cacheStatus,
    sql,
  };
}

export function mapReportResponse(
  input: TenantAnalyticsInput,
  query: TemplatedAnalyticsQuery,
  scope: AnalyticsScope,
  engineResult: ReportQueryEngineResult,
  cacheStatus: "hit" | "miss",
): TenantAnalyticsResult {
  const template = resolveReportTemplate(query.templateKey);
  const customerMap = new Map(input.customers.map((customer) => [customer.id, customer.name]));
  const vendorMap = new Map(input.vendors.map((vendor) => [vendor.id, vendor.name]));
  const driverMap = new Map(input.drivers.map((driver) => [driver.id, driver.name]));

  const rows = applySearch(
    engineResult.bookings.map((booking) => ({
      id: booking.id,
      bookingId: booking.bookingId,
      customer: customerMap.get(booking.customerId) ?? "Unmapped customer",
      status: booking.status,
      serviceType: booking.serviceType,
      commercialType: booking.commercialType,
      freight: booking.pricing.calculatedFreight,
      weight: booking.weight,
      createdAt: booking.createdAt,
      assignedVendor:
        (booking.assignment?.vendorId && vendorMap.get(booking.assignment.vendorId)) ||
        booking.assignment?.vendorName ||
        "Unassigned",
      assignedDriver:
        (booking.assignment?.driverId && driverMap.get(booking.assignment.driverId)) ||
        booking.assignment?.driverName ||
        "Unassigned",
    })),
    engineResult.decision.normalizedQuery.search,
  );

  const primaryGroup = engineResult.decision.normalizedQuery.groupBy?.[0] ?? "month";
  const trendTotals = new Map<string, TenantAnalyticsSeriesPoint>();

  engineResult.bookings.forEach((booking) => {
    const grouping = getGroupingValue(booking, primaryGroup, customerMap);
    const currentValue = trendTotals.get(grouping.key)?.value ?? 0;
    const increment =
      engineResult.decision.normalizedQuery.metric === "freight_value"
        ? booking.pricing.calculatedFreight
        : 1;

    trendTotals.set(grouping.key, {
      key: grouping.key,
      label: grouping.label,
      value: currentValue + increment,
    });
  });

  const deliveredBookings = engineResult.bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );
  const approvalPendingBookings = engineResult.bookings.filter(
    (booking) => booking.status === "PENDING_RATE_APPROVAL",
  );

  const snapshot: TenantAnalyticsSnapshot = {
    totalBookings: engineResult.bookings.length,
    deliveredBookings: deliveredBookings.length,
    approvalPendingBookings: approvalPendingBookings.length,
    activeVehicles: input.vehicles.filter((vehicle) => vehicle.isActive).length,
    activeDrivers: input.drivers.filter((driver) => driver.isActive).length,
    activeVendors: input.vendors.filter((vendor) => vendor.status === "active").length,
    totalFreightValue: sumFreight(engineResult.bookings),
    deliveredFreightValue: sumFreight(deliveredBookings),
  };

  return {
    meta: {
      templateKey: template.key,
      executionMode: template.executionMode,
      title: template.title,
      description:
        template.executionMode === "specialized"
          ? `${template.description} Specialized execution narrows the report to active blockers and exception queues.`
          : template.description,
    },
    decision: engineResult.decision,
    cacheKey: buildAnalyticsCacheKey(engineResult.decision.normalizedQuery, scope),
    snapshot,
    trend: [...trendTotals.values()].sort((left, right) => left.key.localeCompare(right.key)),
    statusBreakdown: buildBreakdown(engineResult.bookings.map((booking) => booking.status)),
    customerBreakdown: buildBreakdown(
      engineResult.bookings.map(
        (booking) => customerMap.get(booking.customerId) ?? "Unmapped customer",
      ),
    ),
    rows,
    trace: buildTrace(engineResult.sql, cacheStatus),
    superset: buildSupersetEmbedConfig(scope, query, template),
  };
}
