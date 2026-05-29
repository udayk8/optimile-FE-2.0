import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Database, FileSearch, Layers3, Search, Sparkles, Workflow } from 'lucide-react'
import { Badge, DataTable, FilterBar, Input, KpiCard, PageHero, type DataTableColumn } from '@shared-ui'
import type { TemplatedAnalyticsQuery } from '@shared-api'
import { Button } from '../../../../components/ui/button'
import { TenantPanel } from '../../../../components/tenant/tenant-primitives'
import { useTenantPaths } from '../../../../hooks/useTenantPaths'
import { useTenantAnalytics } from '../../hooks/useTenantAnalytics'
import { useTenantRouteContext } from '../../hooks/useTenantRouteContext'
import type { TenantAnalyticsTableRow } from '../../services/tenant-analytics'
import { tenantReportRegistry } from '../../services/tenant-report-templates'

const rowColumns: DataTableColumn<TenantAnalyticsTableRow>[] = [
  {
    key: 'bookingId',
    header: 'Booking',
    render: (row) => (
      <div>
        <p className="font-bold text-text">{row.bookingId}</p>
        <p className="mt-1 text-xs text-gray-500">
          {row.serviceType} - {row.commercialType}
        </p>
      </div>
    ),
  },
  {
    key: 'customer',
    header: 'Customer',
    render: (row) => row.customer,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusVariant(row.status)}>{row.status.replaceAll('_', ' ')}</Badge>,
  },
  {
    key: 'freight',
    header: 'Freight',
    align: 'right',
    render: (row) => `Rs ${row.freight.toLocaleString('en-IN')}`,
  },
  {
    key: 'weight',
    header: 'Weight',
    align: 'right',
    render: (row) => `${row.weight} MT`,
  },
  {
    key: 'assignedVendor',
    header: 'Vendor',
    render: (row) => (
      <div>
        <p className="font-semibold text-text">{row.assignedVendor}</p>
        <p className="mt-1 text-xs text-gray-500">{row.assignedDriver}</p>
      </div>
    ),
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (row) => (
      <div>
        <p className="font-semibold text-text">
          {new Date(row.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {new Date(row.createdAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    ),
  },
]

export function TenantReportsPage() {
  const { tenant } = useTenantRouteContext()
  const paths = useTenantPaths()
  const [templateKey, setTemplateKey] = useState<'tenant-booking-overview' | 'tenant-booking-exceptions'>(
    'tenant-booking-overview',
  )
  const [metric, setMetric] = useState<'booking_count' | 'freight_value'>('booking_count')
  const [status, setStatus] = useState<'ALL' | 'PENDING_ASSIGNMENT' | 'PENDING_RATE_APPROVAL' | 'DELIVERED'>('ALL')
  const [detailMode, setDetailMode] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const selectedTemplate = tenantReportRegistry.require(templateKey)

  const query = useMemo<TemplatedAnalyticsQuery>(() => {
    const filters = status === 'ALL' ? [] : [{ field: 'status', operator: 'eq' as const, value: status }]

    return {
      templateKey,
      scope: 'report',
      domain: 'tms',
      metric,
      groupBy: selectedTemplate.defaultGroupBy,
      filters,
      search,
      detailFields: detailMode ? ['bookingId', 'assignedVendor', 'assignedDriver'] : [],
      page,
      pageSize: 5,
    }
  }, [detailMode, metric, page, search, selectedTemplate.defaultGroupBy, status, templateKey])

  const analytics = useTenantAnalytics(query)

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Tenant Admin"
        title={analytics.meta.title}
        subtitle={`${analytics.meta.description} This reporting workspace for ${tenant.name} mirrors a template registry, execution layer, and source router instead of embedding report logic directly in the page.`}
        icon={<BarChart3 className="h-5 w-5" />}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={paths.dashboard}>Back to dashboard</Link>
            </Button>
            <Button asChild>
              <Link to={paths.bookings}>Open bookings</Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Active report template</p>
              <h2 className="mt-2 text-lg font-extrabold text-text">{selectedTemplate.title}</h2>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">{selectedTemplate.description}</p>
            </div>
            <Badge variant={analytics.meta.executionMode === 'specialized' ? 'warning' : 'info'}>
              {analytics.meta.executionMode === 'specialized' ? 'Specialized execution' : 'Generic execution'}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {tenantReportRegistry.list().map((template) => {
              const isActive = template.key === templateKey
              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => {
                    setTemplateKey(template.key as typeof templateKey)
                    setMetric(template.defaultMetric as 'booking_count' | 'freight_value')
                    setPage(1)
                  }}
                  className={[
                    'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition',
                    isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-text',
                  ].join(' ')}
                >
                  {template.executionMode === 'specialized' ? <Sparkles className="h-4 w-4" /> : <Workflow className="h-4 w-4" />}
                  {template.title}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Workspace context</p>
          <div className="mt-4 space-y-3">
            <MetricStrip label="Tenant" value={tenant.name} />
            <MetricStrip label="Scope" value={`tenant:${tenant.code}`} />
            <MetricStrip label="Metric" value={metric === 'booking_count' ? 'Booking count' : 'Freight value'} />
            <MetricStrip label="Source route" value={analytics.decision.source === 'summary' ? 'Summary dataset' : 'Raw drilldown'} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Bookings in scope"
          value={analytics.snapshot.totalBookings}
          insight={`${analytics.snapshot.deliveredBookings} delivered in the current report window`}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <KpiCard
          title="Freight value"
          value={analytics.snapshot.totalFreightValue.toLocaleString('en-IN')}
          unit="INR"
          insight={`${analytics.snapshot.deliveredFreightValue.toLocaleString('en-IN')} INR already delivered`}
          icon={<Layers3 className="h-5 w-5" />}
        />
        <KpiCard
          title="Pending approvals"
          value={analytics.snapshot.approvalPendingBookings}
          insight="Bookings waiting for commercial approval before release"
          icon={<FileSearch className="h-5 w-5" />}
        />
        <KpiCard
          title="Live assets"
          value={`${analytics.snapshot.activeVehicles} / ${analytics.snapshot.activeDrivers}`}
          insight={`${analytics.snapshot.activeVendors} active vendors contributing to execution`}
          icon={<Database className="h-5 w-5" />}
        />
      </div>

      <TenantPanel
        title="Analytics router"
        description="The report pipeline evaluates template rules, request scope, and detail requirements before deciding whether to use fast summary data or raw operational rows."
        action={
          <Badge variant={analytics.decision.source === 'summary' ? 'success' : 'warning'}>
            {analytics.decision.source === 'summary' ? 'Summary source' : 'Raw source'}
          </Badge>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Routing reason</p>
            <p className="mt-2 text-sm text-gray-700">{analytics.decision.reason}</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-gray-500">Cache key</p>
            <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-gray-600">
              {analytics.cacheKey}
            </p>
          </div>
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
            <RuleRow label="Scope" value={`tenant:${tenant.code}`} />
            <RuleRow label="Template" value={analytics.meta.templateKey} />
            <RuleRow label="Execution mode" value={analytics.meta.executionMode} />
            <RuleRow label="Metric" value={metric === 'booking_count' ? 'Booking count' : 'Freight value'} />
            <RuleRow label="Status filter" value={status === 'ALL' ? 'No restriction' : status.replaceAll('_', ' ')} />
            <RuleRow label="Detail mode" value={detailMode ? 'Enabled, forces raw records' : 'Disabled, summary preferred'} />
            <RuleRow label="Search" value={search.trim() ? 'Enabled, forces raw records' : 'Disabled'} />
          </div>
        </div>
      </TenantPanel>

      <TenantPanel title="Report controls" description="Cloudverse-style reporting keeps controls visible, compact, and operationally focused.">
        <FilterBar
          search={
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search booking, customer, vendor, or status"
                className="h-10 pl-9 shadow-none"
              />
            </div>
          }
          actions={
            <Button
              type="button"
              variant={detailMode ? 'secondary' : 'outline'}
              onClick={() => {
                setDetailMode((current) => !current)
                setPage(1)
              }}
            >
              {detailMode ? 'Disable detail mode' : 'Enable detail mode'}
            </Button>
          }
        >
          <LabeledSelect
            label="Metric"
            value={metric}
            onChange={(value) => setMetric(value as 'booking_count' | 'freight_value')}
            options={[
              { value: 'booking_count', label: 'Booking count' },
              { value: 'freight_value', label: 'Freight value' },
            ]}
          />
          <LabeledSelect
            label="Status"
            value={status}
            onChange={(value) => {
              setStatus(value as typeof status)
              setPage(1)
            }}
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'PENDING_ASSIGNMENT', label: 'Pending assignment' },
              { value: 'PENDING_RATE_APPROVAL', label: 'Pending rate approval' },
              { value: 'DELIVERED', label: 'Delivered' },
            ]}
          />
        </FilterBar>
      </TenantPanel>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <TenantPanel
          title={`Primary trend by ${(selectedTemplate.defaultGroupBy ?? ['month'])[0]}`}
          description="Aggregate buckets rendered as compact command-center bars for quick scanning."
        >
          <div className="space-y-3">
            {analytics.trend.map((point) => (
              <BarRow
                key={point.key}
                label={point.label}
                value={point.value}
                max={Math.max(...analytics.trend.map((item) => item.value), 1)}
              />
            ))}
          </div>
        </TenantPanel>

        <TenantPanel title="Breakdowns" description="Status and customer rollups come from the same normalized analytics query.">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-bold text-text">By status</p>
              {analytics.statusBreakdown.map((point) => (
                <BarRow
                  key={point.key}
                  label={point.label.replaceAll('_', ' ')}
                  value={point.value}
                  max={Math.max(...analytics.statusBreakdown.map((item) => item.value), 1)}
                />
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-text">By customer</p>
              {analytics.customerBreakdown.map((point) => (
                <BarRow
                  key={point.key}
                  label={point.label}
                  value={point.value}
                  max={Math.max(...analytics.customerBreakdown.map((item) => item.value), 1)}
                />
              ))}
            </div>
          </div>
        </TenantPanel>
      </div>

      <TenantPanel title="Template contract" description="These rules shape what the frontend can ask for and how the backend-style executor interprets the request.">
        <div className="grid gap-3 md:grid-cols-3">
          <RuleRow label="Allowed metrics" value={selectedTemplate.allowedMetrics.join(', ')} />
          <RuleRow label="Allowed filters" value={selectedTemplate.allowedFilters.join(', ')} />
          <RuleRow label="Default grouping" value={(selectedTemplate.defaultGroupBy ?? []).join(', ') || 'none'} />
        </div>
      </TenantPanel>

      <TenantPanel
        title="Execution flow"
        description="This page mirrors the reporting-module architecture in frontend form, so the same contracts can later connect to real NestJS controllers and analytical services."
      >
        <div className="grid gap-3 lg:grid-cols-3">
          <FlowStep
            title="1. UI Layer"
            description="Filters, KPIs, charts, drilldowns, and table interactions create a templated report request."
          />
          <FlowStep
            title="2. API Client Layer"
            description="A reporting API client acts like the request entry point and forwards validated report requests."
          />
          <FlowStep
            title="3. Orchestration Layer"
            description="Reporting V1 service validates scope and coordinates the report execution lifecycle."
          />
          <FlowStep
            title="4. Template Layer"
            description="Template registry defines metrics, filters, groupings, and whether execution is generic or specialized."
          />
          <FlowStep
            title="5. Execution Layer"
            description="Template executor routes the request either to the generic booking analytics path or the specialized exception path."
          />
          <FlowStep
            title="6. Response Layer"
            description="The result is normalized into KPI cards, trend bars, breakdowns, and detailed rows for the UI."
          />
        </div>
      </TenantPanel>

      <TenantPanel title="Detailed report output" description="Row-level output stays close to a BI report table: primary line first, contextual metadata second, and status expressed semantically.">
        <DataTable
          rows={analytics.rows}
          columns={rowColumns}
          getRowKey={(row) => row.id}
          page={page}
          pageSize={5}
          onPageChange={setPage}
          emptyState={<p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500">No report rows match the current filters.</p>}
        />
      </TenantPanel>
    </div>
  )
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-semibold text-text">{value}</span>
    </div>
  )
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = `${Math.max(8, (value / max) * 100)}%`

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-text">{label}</span>
        <span className="text-gray-600">{value.toLocaleString('en-IN')}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-primary" style={{ width }} />
      </div>
    </div>
  )
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="flex min-w-[180px] flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function getStatusVariant(status: string): 'success' | 'warning' | 'destructive' | 'muted' {
  if (status === 'DELIVERED') return 'success'
  if (status === 'PENDING_ASSIGNMENT' || status === 'PENDING_RATE_APPROVAL') return 'warning'
  if (status === 'CANCELLED' || status === 'DISPUTED' || status === 'EXCEPTION') return 'destructive'
  return 'muted'
}

function MetricStrip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      <span className="text-right text-sm font-semibold text-text">{value}</span>
    </div>
  )
}

function FlowStep({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-bold text-text">{title}</p>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  )
}
