import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useMockStore } from "../store/mock-store";

export function useTenantRouteContext() {
  const { platformTenants, getTenantById } = useMockStore();
  const { tenantId = platformTenants[0]?.id ?? "" } = useParams();

  const tenant = useMemo(
    () => getTenantById(tenantId) ?? platformTenants[0],
    [getTenantById, platformTenants, tenantId],
  );

  return {
    tenantId: tenant?.id ?? "",
    tenant: tenant ?? {
      id: "",
      name: "Unknown Tenant",
      code: "",
      region: "",
      industry: "",
      planId: "",
      status: "trial" as const,
      enabledModuleCodes: [],
      createdAt: "",
      health: {
        activeUsers: 0,
        monthlyBookings: 0,
        policyCount: 0,
        auditEvents24h: 0,
      },
    },
  };
}
