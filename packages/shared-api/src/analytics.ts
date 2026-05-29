export type AnalyticsSource = 'summary' | 'raw'

export type AnalyticsFilterOperator = 'eq' | 'in' | 'contains'

export interface AnalyticsDateRange {
  preset?: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_6_months' | 'ytd'
  from?: string
  to?: string
}

export interface AnalyticsFilter {
  field: string
  operator: AnalyticsFilterOperator
  value: string | number | boolean | Array<string | number>
}

export interface AnalyticsQuery {
  scope: 'dashboard' | 'report'
  domain: string
  metric: string
  groupBy?: string[]
  filters?: AnalyticsFilter[]
  dateRange?: AnalyticsDateRange
  search?: string
  detailFields?: string[]
  page?: number
  pageSize?: number
}

export interface AnalyticsScope {
  portal: string
  tenantId?: string
  userId?: string
  roleId?: string
  allowedModuleCodes?: string[]
}

export interface AnalyticsSummaryCapabilities {
  metrics: string[]
  dimensions: string[]
  filterFields: string[]
}

export interface AnalyticsRoutingDecision {
  source: AnalyticsSource
  reason: string
  normalizedQuery: AnalyticsQuery
}

function sortObjectKeys<T extends Record<string, unknown>>(value: T): T {
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key as keyof T] = value[key as keyof T]
      return acc
    }, {} as T)
}

export function normalizeAnalyticsQuery(query: AnalyticsQuery): AnalyticsQuery {
  const normalizedFilters = [...(query.filters ?? [])]
    .map((filter) => ({
      ...filter,
      value: Array.isArray(filter.value) ? [...filter.value].sort() : filter.value,
    }))
    .sort((a, b) => `${a.field}:${a.operator}`.localeCompare(`${b.field}:${b.operator}`))

  return {
    ...query,
    groupBy: [...(query.groupBy ?? [])].sort(),
    filters: normalizedFilters,
    detailFields: [...(query.detailFields ?? [])].sort(),
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 25,
  }
}

export function routeAnalyticsQuery(
  query: AnalyticsQuery,
  capabilities: AnalyticsSummaryCapabilities,
): AnalyticsRoutingDecision {
  const normalizedQuery = normalizeAnalyticsQuery(query)

  if (!capabilities.metrics.includes(normalizedQuery.metric)) {
    return {
      source: 'raw',
      reason: `Metric ${normalizedQuery.metric} is not available in summary datasets.`,
      normalizedQuery,
    }
  }

  if ((normalizedQuery.detailFields ?? []).length > 0) {
    return {
      source: 'raw',
      reason: 'Detailed columns were requested, so the engine routed to raw records.',
      normalizedQuery,
    }
  }

  if ((normalizedQuery.search ?? '').trim().length > 0) {
    return {
      source: 'raw',
      reason: 'Free-text search needs raw record scanning for accurate drill-down.',
      normalizedQuery,
    }
  }

  const unsupportedDimension = (normalizedQuery.groupBy ?? []).find(
    (dimension) => !capabilities.dimensions.includes(dimension),
  )
  if (unsupportedDimension) {
    return {
      source: 'raw',
      reason: `Grouping by ${unsupportedDimension} is not materialized in summary datasets.`,
      normalizedQuery,
    }
  }

  const unsupportedFilter = (normalizedQuery.filters ?? []).find(
    (filter) => !capabilities.filterFields.includes(filter.field),
  )
  if (unsupportedFilter) {
    return {
      source: 'raw',
      reason: `Filter ${unsupportedFilter.field} requires raw operational data.`,
      normalizedQuery,
    }
  }

  return {
    source: 'summary',
    reason: 'All requested metrics, dimensions, and filters are available in pre-aggregated summaries.',
    normalizedQuery,
  }
}

export function buildAnalyticsCacheKey(query: AnalyticsQuery, scope: AnalyticsScope) {
  return JSON.stringify({
    query: {
      ...normalizeAnalyticsQuery(query),
      dateRange: query.dateRange ? sortObjectKeys(query.dateRange) : undefined,
    },
    scope: sortObjectKeys({
      portal: scope.portal,
      tenantId: scope.tenantId,
      userId: scope.userId,
      roleId: scope.roleId,
      allowedModuleCodes: [...(scope.allowedModuleCodes ?? [])].sort(),
    }),
  })
}
