import {
  buildAnalyticsCacheKey,
  normalizeTemplatedQuery,
  routeAnalyticsQuery,
  type AnalyticsQuery,
  type AnalyticsRoutingDecision,
  type AnalyticsScope,
  type ReportExecutionMeta,
  type TemplatedAnalyticsQuery,
} from '@shared-api'
import type { AuditLogRecord } from '../../../types/abac'
import type { TenantCustomer } from '../../../types/customer'
import type { TenantDriver, TenantVehicle } from '../../../types/fleet'
import type { TenantVendor } from '../../../types/vendor'
import type { BookingRecord, BookingStatus } from '../../tms/booking/types'
import { tenantReportRegistry } from './tenant-report-templates'

export interface TenantAnalyticsSnapshot {
  totalBookings: number
  deliveredBookings: number
  approvalPendingBookings: number
  activeVehicles: number
  activeDrivers: number
  activeVendors: number
  totalFreightValue: number
  deliveredFreightValue: number
}

export interface TenantAnalyticsSeriesPoint {
  key: string
  label: string
  value: number
}

export interface TenantAnalyticsTableRow {
  id: string
  bookingId: string
  customer: string
  status: BookingStatus
  serviceType: string
  commercialType: string
  freight: number
  weight: number
  createdAt: string
  assignedVendor: string
  assignedDriver: string
}

export interface TenantAnalyticsResult {
  meta: ReportExecutionMeta
  decision: AnalyticsRoutingDecision
  cacheKey: string
  snapshot: TenantAnalyticsSnapshot
  trend: TenantAnalyticsSeriesPoint[]
  statusBreakdown: TenantAnalyticsSeriesPoint[]
  customerBreakdown: TenantAnalyticsSeriesPoint[]
  rows: TenantAnalyticsTableRow[]
}

export interface TenantAnalyticsInput {
  tenantId: string
  bookings: BookingRecord[]
  vehicles: TenantVehicle[]
  drivers: TenantDriver[]
  vendors: TenantVendor[]
  customers: TenantCustomer[]
  auditLogs: AuditLogRecord[]
}

function formatMonthKey(dateValue: string) {
  const date = new Date(dateValue)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function getGroupingValue(
  booking: BookingRecord,
  groupBy: string | undefined,
  customerMap: Map<string, string>,
) {
  switch (groupBy) {
    case 'status':
      return { key: booking.status, label: booking.status.replaceAll('_', ' ') }
    case 'customer':
      return {
        key: booking.customerId,
        label: customerMap.get(booking.customerId) ?? 'Unmapped customer',
      }
    case 'serviceType':
      return { key: booking.serviceType, label: booking.serviceType }
    case 'commercialType':
      return { key: booking.commercialType, label: booking.commercialType }
    case 'month':
    default: {
      const monthKey = formatMonthKey(booking.createdAt)
      return { key: monthKey, label: formatMonthLabel(monthKey) }
    }
  }
}

function sumFreight(bookings: BookingRecord[]) {
  return bookings.reduce((total, booking) => total + booking.pricing.calculatedFreight, 0)
}

function buildBreakdown<T extends string>(values: T[]) {
  const counts = new Map<string, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))

  return [...counts.entries()]
    .map(([key, value]) => ({ key, label: key, value }))
    .sort((a, b) => b.value - a.value)
}

function applyBookingFilters(bookings: BookingRecord[], query: AnalyticsQuery) {
  return bookings.filter((booking) => {
    return (query.filters ?? []).every((filter) => {
      const valueMap: Record<string, string> = {
        status: booking.status,
        customerId: booking.customerId,
        serviceType: booking.serviceType,
        commercialType: booking.commercialType,
      }
      const fieldValue = valueMap[filter.field]

      if (filter.operator === 'eq') {
        return fieldValue === String(filter.value)
      }

      if (filter.operator === 'in' && Array.isArray(filter.value)) {
        return filter.value.map(String).includes(fieldValue)
      }

      if (filter.operator === 'contains') {
        return fieldValue.toLowerCase().includes(String(filter.value).toLowerCase())
      }

      return true
    })
  })
}

function applySearch(rows: TenantAnalyticsTableRow[], search: string | undefined) {
  const needle = (search ?? '').trim().toLowerCase()
  if (!needle) {
    return rows
  }

  return rows.filter((row) =>
    [
      row.bookingId,
      row.customer,
      row.status,
      row.assignedVendor,
      row.assignedDriver,
      row.commercialType,
      row.serviceType,
    ].some((value) => value.toLowerCase().includes(needle)),
  )
}

export function runTenantAnalyticsQuery(
  input: TenantAnalyticsInput,
  query: TemplatedAnalyticsQuery,
  scope: AnalyticsScope,
): TenantAnalyticsResult {
  return buildTenantAnalyticsResult(input, query, scope, false)
}

export function runTenantExceptionAnalyticsQuery(
  input: TenantAnalyticsInput,
  query: TemplatedAnalyticsQuery,
  scope: AnalyticsScope,
): TenantAnalyticsResult {
  return buildTenantAnalyticsResult(input, query, scope, true)
}

function buildTenantAnalyticsResult(
  input: TenantAnalyticsInput,
  query: TemplatedAnalyticsQuery,
  scope: AnalyticsScope,
  forceOperationalFocus: boolean,
): TenantAnalyticsResult {
  const tenantBookings = input.bookings.filter((booking) => booking.tenantId === input.tenantId)
  const tenantVehicles = input.vehicles.filter((vehicle) => vehicle.tenantId === input.tenantId)
  const tenantDrivers = input.drivers.filter((driver) => driver.tenantId === input.tenantId)
  const tenantVendors = input.vendors.filter((vendor) => vendor.tenantId === input.tenantId)
  const tenantCustomers = input.customers.filter((customer) => customer.tenantId === input.tenantId)
  const template = tenantReportRegistry.require(query.templateKey)
  const normalizedQuery = normalizeTemplatedQuery(template, query)

  const decision = routeAnalyticsQuery(normalizedQuery, template.summaryCapabilities)
  const baseBookings = applyBookingFilters(tenantBookings, decision.normalizedQuery)
  const filteredBookings = forceOperationalFocus
    ? baseBookings.filter(
        (booking) =>
          booking.status === 'PENDING_RATE_APPROVAL' ||
          booking.status === 'PENDING_ASSIGNMENT' ||
          booking.status === 'EXCEPTION',
      )
    : baseBookings
  const customerMap = new Map(tenantCustomers.map((customer) => [customer.id, customer.name]))
  const vendorMap = new Map(tenantVendors.map((vendor) => [vendor.id, vendor.name]))
  const driverMap = new Map(tenantDrivers.map((driver) => [driver.id, driver.name]))

  const rows = applySearch(
    filteredBookings.map((booking) => ({
      id: booking.id,
      bookingId: booking.bookingId,
      customer: customerMap.get(booking.customerId) ?? 'Unmapped customer',
      status: booking.status,
      serviceType: booking.serviceType,
      commercialType: booking.commercialType,
      freight: booking.pricing.calculatedFreight,
      weight: booking.weight,
      createdAt: booking.createdAt,
      assignedVendor:
        (booking.assignment?.vendorId && vendorMap.get(booking.assignment.vendorId)) ||
        booking.assignment?.vendorName ||
        'Unassigned',
      assignedDriver:
        (booking.assignment?.driverId && driverMap.get(booking.assignment.driverId)) ||
        booking.assignment?.driverName ||
        'Unassigned',
    })),
    decision.normalizedQuery.search,
  )

  const trendTotals = new Map<string, TenantAnalyticsSeriesPoint>()
  const primaryGroup = decision.normalizedQuery.groupBy?.[0] ?? 'month'
  filteredBookings.forEach((booking) => {
    const grouping = getGroupingValue(booking, primaryGroup, customerMap)
    const currentValue = trendTotals.get(grouping.key)?.value ?? 0
    const increment = decision.normalizedQuery.metric === 'freight_value' ? booking.pricing.calculatedFreight : 1
    trendTotals.set(grouping.key, {
      key: grouping.key,
      label: grouping.label,
      value: currentValue + increment,
    })
  })

  const deliveredBookings = filteredBookings.filter((booking) => booking.status === 'DELIVERED')
  const approvalPendingBookings = filteredBookings.filter((booking) => booking.status === 'PENDING_RATE_APPROVAL')

  const snapshot: TenantAnalyticsSnapshot = {
    totalBookings: filteredBookings.length,
    deliveredBookings: deliveredBookings.length,
    approvalPendingBookings: approvalPendingBookings.length,
    activeVehicles: tenantVehicles.filter((vehicle) => vehicle.isActive).length,
    activeDrivers: tenantDrivers.filter((driver) => driver.isActive).length,
    activeVendors: tenantVendors.filter((vendor) => vendor.status === 'active').length,
    totalFreightValue: sumFreight(filteredBookings),
    deliveredFreightValue: sumFreight(deliveredBookings),
  }

  return {
    meta: {
      templateKey: template.key,
      executionMode: template.executionMode,
      title: template.title,
      description: forceOperationalFocus
        ? `${template.description} The specialized executor narrows focus to approval and assignment issues.`
        : template.description,
    },
    decision,
    cacheKey: buildAnalyticsCacheKey(decision.normalizedQuery, scope),
    snapshot,
    trend: [...trendTotals.values()].sort((left, right) => left.key.localeCompare(right.key)),
    statusBreakdown: buildBreakdown(filteredBookings.map((booking) => booking.status)),
    customerBreakdown: buildBreakdown(
      filteredBookings.map((booking) => customerMap.get(booking.customerId) ?? 'Unmapped customer'),
    ),
    rows,
  }
}
