import type { AnalyticsQuery, AnalyticsSummaryCapabilities } from './analytics'

export type ReportExecutionMode = 'generic' | 'specialized'

export interface ReportTemplateDefinition {
  key: string
  domain: string
  title: string
  description: string
  defaultMetric: string
  defaultGroupBy?: string[]
  allowedMetrics: string[]
  allowedFilters: string[]
  drillFields?: string[]
  executionMode: ReportExecutionMode
  summaryCapabilities: AnalyticsSummaryCapabilities
}

export interface ReportExecutionMeta {
  templateKey: string
  executionMode: ReportExecutionMode
  title: string
  description: string
}

export interface TemplatedAnalyticsQuery extends AnalyticsQuery {
  templateKey: string
}

export function createTemplateRegistry<T extends ReportTemplateDefinition>(templates: T[]) {
  const templateMap = new Map(templates.map((template) => [template.key, template]))

  return {
    list: () => templates,
    get: (key: string) => templateMap.get(key),
    require: (key: string) => {
      const template = templateMap.get(key)
      if (!template) {
        throw new Error(`Unknown report template: ${key}`)
      }
      return template
    },
  }
}

export function normalizeTemplatedQuery(
  template: ReportTemplateDefinition,
  query: TemplatedAnalyticsQuery,
): TemplatedAnalyticsQuery {
  const filters = (query.filters ?? []).filter((filter) => template.allowedFilters.includes(filter.field))
  const detailFields = (query.detailFields ?? []).filter((field) => (template.drillFields ?? []).includes(field))

  return {
    ...query,
    metric: template.allowedMetrics.includes(query.metric) ? query.metric : template.defaultMetric,
    groupBy: query.groupBy?.length ? query.groupBy : template.defaultGroupBy,
    filters,
    detailFields,
  }
}
