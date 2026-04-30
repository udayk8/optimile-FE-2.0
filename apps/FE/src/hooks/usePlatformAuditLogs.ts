import { useMockStore } from "@/app/mock-store";

export function usePlatformAuditLogs() {
  const { platformAuditLogs } = useMockStore();
  return { data: platformAuditLogs };
}
