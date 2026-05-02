import { useMockStore } from "../../../store/mock-store";

export function usePlatformSettings() {
  const { platformSettings, savePlatformSettings } = useMockStore();
  return {
    data: platformSettings,
    savePlatformSettings,
  };
}
