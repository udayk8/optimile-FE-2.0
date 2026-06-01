import type { TenantAnalyticsResult } from "./reporting-types";

const reportingCache = new Map<string, TenantAnalyticsResult>();

export function readReportingCache(cacheKey: string) {
  return reportingCache.get(cacheKey);
}

export function writeReportingCache(cacheKey: string, value: TenantAnalyticsResult) {
  reportingCache.set(cacheKey, value);
}
