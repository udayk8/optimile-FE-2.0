import type { AnalyticsScope, TemplatedAnalyticsQuery } from '@shared-api'
import type { TenantAnalyticsInput, TenantAnalyticsResult } from './tenant-analytics'
import { runTenantAnalyticsQuery, runTenantExceptionAnalyticsQuery } from './tenant-analytics'
import { tenantReportRegistry } from './tenant-report-templates'

export function executeTenantReportTemplate(
  dataset: TenantAnalyticsInput,
  query: TemplatedAnalyticsQuery,
  scope: AnalyticsScope,
): TenantAnalyticsResult {
  const template = tenantReportRegistry.require(query.templateKey)

  if (template.executionMode === 'specialized') {
    return runTenantExceptionAnalyticsQuery(dataset, query, scope)
  }

  return runTenantAnalyticsQuery(dataset, query, scope)
}
