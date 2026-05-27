import type {
  HierarchyTemplateCode,
  TenantHierarchyConfig,
  HierarchyLevelRecord,
} from "@/types/tenant-workspace";

export const hierarchyTemplateOptions: {
  code: HierarchyTemplateCode;
  label: string;
  path: string;
}[] = [
  { code: "region-zone", label: "Tenant -> Region -> Zone", path: "Tenant -> Region -> Zone" },
  { code: "region-branch", label: "Tenant -> Region -> Branch", path: "Tenant -> Region -> Branch" },
  {
    code: "region-zone-branch-subbranch",
    label: "Tenant -> Region -> Zone -> Branch -> SubBranch",
    path: "Tenant -> Region -> Zone -> Branch -> SubBranch",
  },
  { code: "custom", label: "Tenant -> Custom", path: "Tenant -> Custom" },
];

function baseLevel(
  tenantId: string,
  id: string,
  name: string,
  order: number,
): HierarchyLevelRecord {
  return {
    id,
    tenantId,
    order,
    name,
    active: true,
  };
}

export function buildHierarchyConfigForTemplate(
  tenantId: string,
  template: HierarchyTemplateCode,
): TenantHierarchyConfig {
  const region = baseLevel(tenantId, "level-region", "Region", 1);
  const zone = baseLevel(tenantId, "level-zone", "Zone", 2);
  const branch = baseLevel(tenantId, "level-branch", "Branch", 3);
  const subBranch = baseLevel(tenantId, "level-subbranch", "SubBranch", 4);

  const map: Record<HierarchyTemplateCode, TenantHierarchyConfig> = {
    "region-zone": {
      tenantId,
      startingBlueprint: template,
      levels: [region, zone],
      lastUpdated: new Date().toISOString(),
    },
    "region-branch": {
      tenantId,
      startingBlueprint: template,
      levels: [region, branch],
      lastUpdated: new Date().toISOString(),
    },
    "region-zone-branch-subbranch": {
      tenantId,
      startingBlueprint: template,
      levels: [region, zone, branch, subBranch],
      lastUpdated: new Date().toISOString(),
    },
    custom: {
      tenantId,
      startingBlueprint: template,
      levels: [region],
      lastUpdated: new Date().toISOString(),
    },
  };

  return map[template];
}

export function getHierarchyTemplateLabel(template: HierarchyTemplateCode) {
  return hierarchyTemplateOptions.find((item) => item.code === template)?.label ?? template;
}
