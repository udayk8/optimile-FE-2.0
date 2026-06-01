import type { AnalyticsScope, TemplatedAnalyticsQuery } from "@shared-api";
import type { TenantAnalyticsInput, TenantAnalyticsResult } from "./reporting-types";
import { executeReportQueryEngine } from "./report-query-engine.service";
import { mapReportResponse } from "./report-response.mapper";

export function executeTenantReportTemplate(
  dataset: TenantAnalyticsInput,
  query: TemplatedAnalyticsQuery,
  scope: AnalyticsScope,
  cacheStatus: "hit" | "miss",
): TenantAnalyticsResult {
  const engineResult = executeReportQueryEngine(dataset, query, scope);
  return mapReportResponse(dataset, query, scope, engineResult, cacheStatus);
}
