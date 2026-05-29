import type {
  TenantAssignmentMode,
  TenantCommercialMode,
  TenantRecord,
  TenantType,
} from "@/types/platform";

type TenantTypeMeta = {
  value: TenantType;
  label: string;
  description: string;
  instruction: string;
  examples: string[];
  operatingStyle: string;
  ownershipSummary: string;
};

export const tenantTypeOptions: TenantTypeMeta[] = [
  {
    value: "DIRECT_CUSTOMER",
    label: "Direct Customer",
    description: "This tenant will operate its own transportation workflows directly.",
    instruction: "Tenant itself is the shipment owner and operator inside the same workspace.",
    examples: ["Manufacturers", "Cement companies", "FMCG companies", "Enterprise shippers"],
    operatingStyle: "Own transportation workflows",
    ownershipSummary: "Tenant itself owns booking, transport assignment, freight, and logistics operations.",
  },
  {
    value: "LOGISTICS_PROVIDER_3PL",
    label: "Logistics Provider / 3PL",
    description: "This tenant will operate transportation workflows for multiple customers.",
    instruction: "Customer management becomes the primary operating model for tenant bookings, LR visibility, and invoicing.",
    examples: ["Transport operators", "Logistics providers", "Managed logistics companies"],
    operatingStyle: "Operate for multiple customers",
    ownershipSummary: "Tenant operates transportation workflows on behalf of multiple customer companies.",
  },
];

export function getTenantTypeMeta(tenantType: TenantType) {
  return tenantTypeOptions.find((item) => item.value === tenantType) ?? tenantTypeOptions[0];
}

export function getTenantTypeLabel(tenantType: TenantType) {
  return getTenantTypeMeta(tenantType).label;
}

export function getTenantOwnershipSummary(tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled">) {
  const baseSummary = getTenantTypeMeta(tenant.tenantType).ownershipSummary;
  if (isHybridTenant(tenant)) {
    return `${baseSummary} Customer portal users can participate with customer-scoped access while operations remain tenant-controlled.`;
  }
  return baseSummary;
}

export function getTenantOperationalSummary(tenant: Pick<TenantRecord, "name" | "tenantType" | "customerPortalEnabled">) {
  const typeMeta = getTenantTypeMeta(tenant.tenantType);
  const portalPhrase =
    isHybridTenant(tenant)
      ? " Customer portal access is enabled for linked customer users."
      : tenant.customerPortalEnabled
        ? " Customer portal access is enabled."
        : "";
  return `${tenant.name} will ${typeMeta.operatingStyle.toLowerCase()} using the Optimile TMS workspace.${portalPhrase}`;
}

export function getDefaultAssignmentMode(tenantType: TenantType): TenantAssignmentMode {
  return tenantType === "DIRECT_CUSTOMER" ? "AUTO_VENDOR_FLOW" : "CONTROLLED_3PL_FLOW";
}

export function getDefaultCommercialMode(tenantType: TenantType): TenantCommercialMode {
  return tenantType === "DIRECT_CUSTOMER" ? "SIMPLE" : "BUY_SELL_MARGIN";
}

export function getAssignmentModeLabel(assignmentMode: TenantAssignmentMode) {
  return assignmentMode === "AUTO_VENDOR_FLOW" ? "Auto Vendor Flow" : "Controlled 3PL Flow";
}

export function getCommercialModeLabel(commercialMode: TenantCommercialMode) {
  return commercialMode === "SIMPLE" ? "Simple" : "Buy / Sell Margin";
}

export function isHybridTenant(tenant: Pick<TenantRecord, "tenantType" | "customerPortalEnabled">) {
  return tenant.tenantType === "LOGISTICS_PROVIDER_3PL" && tenant.customerPortalEnabled;
}

export function isDirectCustomerTenant(tenant: Pick<TenantRecord, "tenantType">) {
  return tenant.tenantType === "DIRECT_CUSTOMER";
}
