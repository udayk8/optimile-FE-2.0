import type { AnalyticsScope, TemplatedAnalyticsQuery } from '@shared-api'
import type { TenantAnalyticsInput, TenantAnalyticsResult } from './tenant-analytics'
import { executeTenantReportTemplate } from './template-executor.service'

export interface ReportingApiRequest {
  scope: AnalyticsScope
  query: TemplatedAnalyticsQuery
  dataset: TenantAnalyticsInput
}

export interface ReportingApiClient {
  runReport: (request: ReportingApiRequest) => TenantAnalyticsResult
}

export const reportingApiClient: ReportingApiClient = {
  runReport: (request) => executeTenantReportTemplate(request.dataset, request.query, request.scope),
}
