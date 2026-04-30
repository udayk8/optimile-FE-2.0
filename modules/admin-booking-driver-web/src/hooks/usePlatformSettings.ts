import { useMockStore } from "@/app/mock-store";

export function usePlatformSettings() {
  const { platformSettings, savePlatformSettings } = useMockStore();
  return {
    data: platformSettings,
    savePlatformSettings,
  };
}
