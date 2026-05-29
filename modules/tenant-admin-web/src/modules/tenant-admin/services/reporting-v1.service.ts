import type { AnalyticsScope, TemplatedAnalyticsQuery } from '@shared-api'
import type { TenantAnalyticsInput, TenantAnalyticsResult } from './tenant-analytics'
import { reportingApiClient } from './reporting-api.client'
import { tenantReportRegistry } from './tenant-report-templates'

export interface ReportingExecutionRequest {
  scope: AnalyticsScope
  query: TemplatedAnalyticsQuery
  dataset: TenantAnalyticsInput
}

function validateReportAccess(scope: AnalyticsScope, query: TemplatedAnalyticsQuery) {
  if (!scope.tenantId) {
    throw new Error('Tenant scope is required for tenant reporting.')
  }

  const template = tenantReportRegistry.require(query.templateKey)
  if (template.domain !== query.domain) {
    throw new Error(`Template ${template.key} does not belong to domain ${query.domain}.`)
  }
}

export function runReportingV1(request: ReportingExecutionRequest): TenantAnalyticsResult {
  validateReportAccess(request.scope, request.query)

  return reportingApiClient.runReport({
    scope: request.scope,
    query: request.query,
    dataset: request.dataset,
  })
}
