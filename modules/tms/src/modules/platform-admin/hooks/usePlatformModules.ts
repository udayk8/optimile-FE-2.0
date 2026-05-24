import { useMockStore } from "@tms-booking/shared/store/mock-store";
import type { PlatformModule } from "@/types/platform";

export function usePlatformModules() {
  const { modules, createPlatformModule, updatePlatformModule } = useMockStore();
  return {
    data: modules,
    createModule: (input: Omit<PlatformModule, "id">) => createPlatformModule(input),
    updateModule: (moduleId: string, updates: Partial<Omit<PlatformModule, "id">>) =>
      updatePlatformModule(moduleId, updates),
  };
}

