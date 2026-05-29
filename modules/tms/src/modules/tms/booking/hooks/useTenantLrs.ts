import { useAppStore } from "@tms-booking/shared/store/useAppStore";
import type { BookingStatus, TenantLrRecord } from "@/modules/tms/booking/types";

export function useTenantLrs(tenantId: string) {
  const appStore = useAppStore(tenantId);

  return {
    data: appStore.lrs,
    pools: appStore.lrPools,
    upsertLrPools: appStore.upsertLrPools,
    createLrs: (input: TenantLrRecord[]) => appStore.createLrs(input),
    syncLrsForBooking: (bookingId: string, status: BookingStatus) =>
      appStore.syncLrsForBooking(bookingId, status),
  };
}

