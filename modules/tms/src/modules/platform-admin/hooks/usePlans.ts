import { useMockStore } from "@tms-booking/shared/store/mock-store";

export function usePlans() {
  const { plans } = useMockStore();
  return { data: plans };
}

