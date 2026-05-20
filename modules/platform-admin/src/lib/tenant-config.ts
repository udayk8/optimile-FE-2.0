import type {
  TenantAssignmentMode,
  TenantCommercialMode,
  TenantRecord,
  TenantType,
} from "../types/platform";

type TenantSummaryInput = Pick<TenantRecord, "tenantType" | "customerPortalEnabled"> & {
  assignmentMode?: TenantAssignmentMode;
  commercialMode?: TenantCommercialMode;
  name?: string;
};

type TenantOwnershipInput = Pick<TenantRecord, "tenantType" | "customerPortalEnabled">;

export const tenantTypeOptions = [
  {
    value: "DIRECT_CUSTOMER" as const,
    label: "Direct Customer",
    description: "Single-tenant operating model where the tenant owns its own transportation workflows.",
    instruction: "Use this when the tenant runs bookings and execution directly for its own business.",
    examples: ["Manufacturer", "Retailer", "Enterprise shipper"],
  },
  {
    value: "LOGISTICS_PROVIDER_3PL" as const,
    label: "3PL / Logistics Provider",
    description: "Tenant can operate bookings and execution for multiple customer accounts under the same workspace.",
    instruction: "Use this when the tenant provides logistics services to external customers and vendors.",
    examples: ["3PL", "Freight operator", "Managed transport provider"],
  },
] as const;

const tenantTypeMeta: Record<
  TenantType,
  {
    description: string;
    operatingStyle: string;
  }
> = {
  DIRECT_CUSTOMER: {
    description: "The tenant directly manages its own transport workflows and internal operating controls.",
    operatingStyle: "Direct shipper workflow with internal ownership of bookings and execution.",
  },
  LOGISTICS_PROVIDER_3PL: {
    description: "The tenant acts as a service provider and can manage execution for multiple linked customers.",
    operatingStyle: "3PL workflow with customer-servicing, vendor orchestration, and controlled assignment.",
  },
};

export function getTenantTypeMeta(tenantType: TenantType) {
  return tenantTypeMeta[tenantType];
}

export function getTenantTypeLabel(tenantType: TenantType) {
  return tenantType === "DIRECT_CUSTOMER" ? "Direct Customer" : "3PL / Logistics Provider";
}

export function getDefaultAssignmentMode(tenantType: TenantType): TenantAssignmentMode {
  return tenantType === "DIRECT_CUSTOMER" ? "AUTO_VENDOR_FLOW" : "CONTROLLED_ASSIGNMENT";
}

export function getDefaultCommercialMode(tenantType: TenantType): TenantCommercialMode {
  return tenantType === "DIRECT_CUSTOMER" ? "SIMPLE" : "BUY_SELL_MARGIN";
}

export function getAssignmentModeLabel(mode: TenantAssignmentMode) {
  return mode === "AUTO_VENDOR_FLOW" ? "Auto Vendor Flow" : "Controlled Assignment";
}

export function getCommercialModeLabel(mode: TenantCommercialMode) {
  return mode === "SIMPLE" ? "Simple" : "Buy / Sell Margin";
}

export function getTenantOperationalSummary(input: TenantSummaryInput) {
  const name = input.name ?? "This tenant";
  const assignmentMode = input.assignmentMode ?? getDefaultAssignmentMode(input.tenantType);
  const commercialMode = input.commercialMode ?? getDefaultCommercialMode(input.tenantType);
  if (input.tenantType === "DIRECT_CUSTOMER") {
    return `${name} runs its own transport workflows directly with ${getAssignmentModeLabel(assignmentMode).toLowerCase()} and ${getCommercialModeLabel(commercialMode).toLowerCase()} commercial handling.`;
  }

  if (input.customerPortalEnabled) {
    return `${name} operates as a 3PL with customer portal access enabled for linked customers under controlled execution.`;
  }

  return `${name} operates as a 3PL with internal tenant users managing customer demand, vendor assignment, and execution control.`;
}

export function getTenantOwnershipSummary(input: TenantOwnershipInput) {
  if (input.tenantType === "DIRECT_CUSTOMER") {
    return "Platform owns provisioning, plans, and module enablement. Ongoing org structure, users, roles, and workflows stay with the tenant admin team.";
  }

  if (input.customerPortalEnabled) {
    return "Platform owns provisioning, plans, and module enablement. Tenant admin owns the multi-party operating model, including customer portal users, roles, and execution controls.";
  }

  return "Platform owns provisioning, plans, and module enablement. Tenant admin owns customer-servicing workflows, hierarchy, roles, and operational controls.";
}
