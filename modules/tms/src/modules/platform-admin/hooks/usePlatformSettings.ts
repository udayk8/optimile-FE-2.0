import { useMockStore } from "@tms-booking/shared/store/mock-store";

export function usePlatformSettings() {
  const { platformSettings, savePlatformSettings } = useMockStore();
  return {
    data: platformSettings,
    savePlatformSettings,
  };
}

