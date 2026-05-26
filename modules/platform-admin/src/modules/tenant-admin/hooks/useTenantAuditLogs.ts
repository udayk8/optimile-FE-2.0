import { useMockStore } from "@/shared/store/mock-store";

export function useTenantAuditLogs(tenantId: string) {
  const { listTenantAuditLogs } = useMockStore();
  return { data: listTenantAuditLogs(tenantId) };
}
