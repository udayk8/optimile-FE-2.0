import { useMockStore } from "@tms-booking/shared/store/mock-store";

export function usePlatformAuditLogs() {
  const { platformAuditLogs } = useMockStore();
  return { data: platformAuditLogs };
}

