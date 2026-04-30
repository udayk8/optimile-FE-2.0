import { useMockStore } from "@/app/mock-store";
import type {
  TenantLRConfigInput,
  TenantMaterialInput,
  TenantUOMDefinitionInput,
  TenantUOMMappingInput,
  TenantVehicleTypeInput,
} from "@/types/master-data";

export function useTenantVehicleTypes(tenantId: string) {
  const { listTenantVehicleTypes, createTenantVehicleType, updateTenantVehicleType } = useMockStore();
  return {
    data: listTenantVehicleTypes(tenantId),
    createVehicleType: (input: TenantVehicleTypeInput) =>
      createTenantVehicleType({
        tenantId,
        ...input,
      }),
    updateVehicleType: (
      vehicleTypeId: string,
      updates: Partial<TenantVehicleTypeInput>,
    ) => updateTenantVehicleType(vehicleTypeId, updates),
  };
}

export function useTenantMaterials(tenantId: string) {
  const { listTenantMaterials, createTenantMaterial, updateTenantMaterial } = useMockStore();
  return {
    data: listTenantMaterials(tenantId),
    createMaterial: (input: TenantMaterialInput) =>
      createTenantMaterial({
        tenantId,
        ...input,
      }),
    updateMaterial: (materialId: string, updates: Partial<TenantMaterialInput>) =>
      updateTenantMaterial(materialId, updates),
  };
}

export function useTenantLRConfigs(tenantId: string) {
  const { listTenantLRConfigs, createTenantLRConfig, updateTenantLRConfig } = useMockStore();
  return {
    data: listTenantLRConfigs(tenantId),
    createLRConfig: (input: TenantLRConfigInput) =>
      createTenantLRConfig({
        tenantId,
        ...input,
      }),
    updateLRConfig: (lrConfigId: string, updates: Partial<TenantLRConfigInput>) =>
      updateTenantLRConfig(lrConfigId, updates),
  };
}

export function useTenantUOMConfigurations(tenantId: string) {
  const {
    listTenantUOMDefinitions,
    createTenantUOMDefinition,
    updateTenantUOMDefinition,
    listTenantUOMMappings,
    createTenantUOMMapping,
    updateTenantUOMMapping,
    deleteTenantUOMMapping,
  } = useMockStore();

  return {
    definitions: listTenantUOMDefinitions(tenantId),
    mappings: listTenantUOMMappings(tenantId),
    createDefinition: (input: TenantUOMDefinitionInput) =>
      createTenantUOMDefinition({
        tenantId,
        ...input,
      }),
    updateDefinition: (definitionId: string, updates: Partial<TenantUOMDefinitionInput>) =>
      updateTenantUOMDefinition(definitionId, updates),
    createMapping: (input: TenantUOMMappingInput) =>
      createTenantUOMMapping({
        tenantId,
        ...input,
      }),
    updateMapping: (mappingId: string, updates: Partial<TenantUOMMappingInput>) =>
      updateTenantUOMMapping(mappingId, updates),
    deleteMapping: (mappingId: string) => deleteTenantUOMMapping(mappingId),
  };
}
