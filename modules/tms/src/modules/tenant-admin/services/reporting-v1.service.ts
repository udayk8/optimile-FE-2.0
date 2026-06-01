import { buildAnalyticsCacheKey } from "@shared-api";
import type { TenantAnalyticsResult } from "./reporting-types";
import type { ReportingExecutionRequest } from "./reporting-types";
import { readReportingCache, writeReportingCache } from "./reporting-cache.service";
import { executeTenantReportTemplate } from "./template-executor.service";
import { validateReportingAccess } from "./reporting-access.middleware";

export function runReportingV1(request: ReportingExecutionRequest): TenantAnalyticsResult {
  validateReportingAccess(request.scope, request.query);

  const cacheKey = buildAnalyticsCacheKey(request.query, request.scope);
  const cachedResult = readReportingCache(cacheKey);
  if (cachedResult) {
    return {
      ...cachedResult,
      trace: {
        ...cachedResult.trace,
        cacheStatus: "hit",
      },
    };
  }

  const result = executeTenantReportTemplate(request.dataset, request.query, request.scope, "miss");
  writeReportingCache(result.cacheKey, result);
  return result;
}
