import { useMockStore } from "@/app/mock-store";

export function usePlans() {
  const { plans } = useMockStore();
  return { data: plans };
}
