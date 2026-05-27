import { useAppStore } from "@/shared/store/useAppStore";
import type { TenantInvoiceRecord } from "@/modules/tms/booking/types";

export function useTenantFinance(tenantId: string) {
  const appStore = useAppStore(tenantId);

  return {
    data: appStore.invoices,
    createInvoice: (input: TenantInvoiceRecord) => appStore.createInvoice(input),
  };
}
