import { useMemo } from "react";
import type { AnalyticsScope, TemplatedAnalyticsQuery } from "@shared-api";
import { useMockStore } from "@/shared/store/mock-store";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { reportingApiClient } from "@tms-booking/modules/tenant-admin/services/reporting-api.client";

export function useTmsReporting(query: TemplatedAnalyticsQuery) {
  const { tenantId } = useTenantRouteContext();
  const {
    listTenantBookings,
    listTenantVehicles,
    listTenantDrivers,
    listTenantVendors,
    listTenantCustomers,
    listTenantAuditLogs,
  } = useMockStore();

  return useMemo(() => {
    const scope: AnalyticsScope = {
      portal: "tms-booking",
      tenantId,
      allowedModuleCodes: ["TMS"],
    };

    return reportingApiClient.runReport({
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
    });
  }, [
    listTenantAuditLogs,
    listTenantBookings,
    listTenantCustomers,
    listTenantDrivers,
    listTenantVendors,
    listTenantVehicles,
    query,
    tenantId,
  ]);
}
