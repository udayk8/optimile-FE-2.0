import type { PlatformModule } from "@/types/platform";

const DISPLAY_OVERRIDES: Record<string, { name: string; code: string }> = {
  TMS: { name: "Booking", code: "BOOKING" },
};

export function getModuleDisplayName(name: string, code: string) {
  const override = DISPLAY_OVERRIDES[code];
  return override?.name ?? name;
}

export function getModuleDisplayCode(code: string) {
  return DISPLAY_OVERRIDES[code]?.code ?? code;
}

export function displayModule(module: PlatformModule): PlatformModule {
  const override = DISPLAY_OVERRIDES[module.code];
  if (!override) return module;
  return { ...module, name: override.name, code: override.code };
}

export function getModuleNameByCode(code: string, modules: PlatformModule[]) {
  const override = DISPLAY_OVERRIDES[code];
  if (override) return override.name;
  return modules.find((module) => module.code === code)?.name ?? code;
}
