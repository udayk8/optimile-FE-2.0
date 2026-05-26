import { useMockStore } from "@/shared/store/mock-store";

export function usePlatformAuditLogs() {
  const { platformAuditLogs } = useMockStore();
  return { data: platformAuditLogs };
}
