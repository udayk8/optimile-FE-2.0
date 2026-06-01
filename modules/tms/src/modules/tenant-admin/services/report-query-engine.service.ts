import {
  normalizeTemplatedQuery,
  routeAnalyticsQuery,
  type AnalyticsFilter,
  type AnalyticsScope,
  type TemplatedAnalyticsQuery,
} from "@shared-api";
import type { BookingRecord } from "@/modules/tms/booking/types";
import type { ReportQueryEngineResult, TenantAnalyticsInput } from "./reporting-types";
import { resolveReportTemplate } from "./template-registry.service";

function toSqlFilter(filter: AnalyticsFilter) {
  if (filter.operator === "eq") {
    return `${filter.field} = '${String(filter.value)}'`;
  }

  if (filter.operator === "in" && Array.isArray(filter.value)) {
    return `${filter.field} IN (${filter.value.map((value) => `'${String(value)}'`).join(", ")})`;
  }

  if (filter.operator === "contains") {
    return `${filter.field} ILIKE '%${String(filter.value).replace(/'/g, "''")}%'`;
  }

  return "1 = 1";
}

function buildPseudoSql(scope: AnalyticsScope, query: TemplatedAnalyticsQuery, source: "summary" | "raw") {
  const tableName = source === "summary" ? "dashboard_mv_bookings" : "cur_normalized_bookings";
  const metricSql = query.metric === "freight_value" ? "sum(calculated_freight) AS metric_value" : "count() AS metric_value";
  const groupDimension = query.groupBy?.[0] ?? "month";
  const whereClauses = [
    `tenant_id = '${scope.tenantId}'`,
    ...(query.filters ?? []).map(toSqlFilter),
  ];

  if ((query.search ?? "").trim()) {
    whereClauses.push(
      `multiSearchAnyCaseInsensitiveUTF8(search_blob, ['${query.search?.trim().replace(/'/g, "''")}']) = 1`,
    );
  }

  return [
    `SELECT ${groupDimension} AS bucket, ${metricSql}`,
    `FROM ${tableName}`,
    `WHERE ${whereClauses.join(" AND ")}`,
    `GROUP BY bucket`,
    `ORDER BY bucket ASC`,
  ].join("\n");
}

function applyBookingFilters(bookings: BookingRecord[], query: TemplatedAnalyticsQuery) {
  return bookings.filter((booking) =>
    (query.filters ?? []).every((filter) => {
      const valueMap: Record<string, string> = {
        status: booking.status,
        customerId: booking.customerId,
        serviceType: booking.serviceType,
        commercialType: booking.commercialType,
      };
      const fieldValue = valueMap[filter.field];

      if (filter.operator === "eq") {
        return fieldValue === String(filter.value);
      }

      if (filter.operator === "in" && Array.isArray(filter.value)) {
        return filter.value.map(String).includes(fieldValue);
      }

      if (filter.operator === "contains") {
        return fieldValue.toLowerCase().includes(String(filter.value).toLowerCase());
      }

      return true;
    }),
  );
}

function applyOperationalFocus(bookings: BookingRecord[]) {
  return bookings.filter(
    (booking) =>
      booking.status === "PENDING_RATE_APPROVAL" ||
      booking.status === "PENDING_ASSIGNMENT" ||
      booking.status === "EXCEPTION" ||
      booking.status === "DELAYED",
  );
}

export function executeReportQueryEngine(
  input: TenantAnalyticsInput,
  query: TemplatedAnalyticsQuery,
  scope: AnalyticsScope,
): ReportQueryEngineResult {
  const template = resolveReportTemplate(query.templateKey);
  const normalizedQuery = normalizeTemplatedQuery(template, query);
  const decision = routeAnalyticsQuery(normalizedQuery, template.summaryCapabilities);
  const baseBookings = applyBookingFilters(input.bookings, decision.normalizedQuery as TemplatedAnalyticsQuery);
  const bookings =
    template.executionMode === "specialized" ? applyOperationalFocus(baseBookings) : baseBookings;

  return {
    decision,
    sql: buildPseudoSql(scope, decision.normalizedQuery as TemplatedAnalyticsQuery, decision.source),
    bookings,
    executionMode: template.executionMode,
  };
}
