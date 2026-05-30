import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useMockStore } from "@/shared/store/mock-store";
import type { TenantRecord } from "@/types/platform";

export function useTenantRouteContext() {
  const { platformTenants, getTenantById } = useMockStore();
  const { tenantId = platformTenants[0]?.id ?? "" } = useParams();

  const tenant = useMemo(
    () => getTenantById(tenantId) ?? platformTenants[0],
    [getTenantById, platformTenants, tenantId],
  );

  return {
    tenantId: tenant?.id ?? "",
    tenant: tenant ?? ({
      id: "",
      name: "Unknown Tenant",
      code: "",
      region: "",
      industry: "",
      defaultTimezone: "",
      planId: "",
      status: "trial" as const,
      tenantType: "DIRECT_CUSTOMER",
      customerPortalEnabled: false,
      assignmentMode: "AUTO_VENDOR_FLOW",
      commercialMode: "SIMPLE",
      enabledModuleCodes: [],
      initialHierarchyTemplate: "region-zone",
      primaryAdminUserId: "",
      createdAt: "",
      health: {
        activeUsers: 0,
        monthlyBookings: 0,
        policyCount: 0,
        auditEvents24h: 0,
      },
    } satisfies TenantRecord),
  };
}
