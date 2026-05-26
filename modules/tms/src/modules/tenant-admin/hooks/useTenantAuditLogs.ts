import { useMockStore } from "@tms-booking/shared/store/mock-store";

export function useTenantAuditLogs(tenantId: string) {
  const { listTenantAuditLogs } = useMockStore();
  return { data: listTenantAuditLogs(tenantId) };
}

