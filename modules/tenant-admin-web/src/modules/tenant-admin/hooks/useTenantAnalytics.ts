import { useMemo } from 'react'
import type { AnalyticsScope, TemplatedAnalyticsQuery } from '@shared-api'
import { useMockStore } from '../../../store/mock-store'
import { useTenantRouteContext } from './useTenantRouteContext'
import { runReportingV1 } from '../services/reporting-v1.service'

export function useTenantAnalytics(query: TemplatedAnalyticsQuery) {
  const { tenantId } = useTenantRouteContext()
  const {
    listTenantBookings,
    listTenantVehicles,
    listTenantDrivers,
    listTenantVendors,
    listTenantCustomers,
    listTenantAuditLogs,
  } = useMockStore()

  return useMemo(() => {
    const scope: AnalyticsScope = {
      portal: 'tenant-admin',
      tenantId,
    }

    return runReportingV1(
      {
        scope,
        query,
        dataset: {
          tenantId,
          bookings: listTenantBookings(tenantId),
          vehicles: listTenantVehicles(tenantId),
          drivers: listTenantDrivers(tenantId),
          vendors: listTenantVendors(tenantId),
          customers: listTenantCustomers(tenantId),
          auditLogs: listTenantAuditLogs(tenantId),
        },
      },
    )
  }, [
    listTenantAuditLogs,
    listTenantBookings,
    listTenantCustomers,
    listTenantDrivers,
    listTenantVendors,
    listTenantVehicles,
    query,
    tenantId,
  ])
}
