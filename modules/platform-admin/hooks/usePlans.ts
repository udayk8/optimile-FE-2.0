import { useMockStore } from "@/shared/store/mock-store";

export function usePlans() {
  const { plans } = useMockStore();
  return { data: plans };
}
