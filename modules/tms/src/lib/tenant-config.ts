export type TenantType = 'DIRECT_CUSTOMER' | 'LOGISTICS_PROVIDER_3PL';
export type TenantAssignmentMode = 'AUTO_VENDOR_FLOW' | 'CONTROLLED_3PL_FLOW';
export type TenantCommercialMode = 'SIMPLE' | 'BUY_SELL_MARGIN';

type TenantLike = {
  tenantType?: TenantType;
  customerPortalEnabled?: boolean;
  assignmentMode?: TenantAssignmentMode;
  commercialMode?: TenantCommercialMode;
  name?: string;
};

function getTenantType(tenant: TenantLike): TenantType {
  return tenant.tenantType ?? 'DIRECT_CUSTOMER';
}

export function getAssignmentModeLabel(assignmentMode: TenantAssignmentMode | string | null | undefined) {
  return assignmentMode === 'CONTROLLED_3PL_FLOW' ? 'Controlled 3PL Flow' : 'Auto Vendor Flow';
}

export function getCommercialModeLabel(commercialMode: TenantCommercialMode | string | null | undefined) {
  return commercialMode === 'BUY_SELL_MARGIN' ? 'Buy / Sell Margin' : 'Simple';
}

export function isHybridTenant(tenant: TenantLike) {
  return getTenantType(tenant) === 'LOGISTICS_PROVIDER_3PL' && Boolean(tenant.customerPortalEnabled);
}

export function isDirectCustomerTenant(tenant: TenantLike) {
  return getTenantType(tenant) === 'DIRECT_CUSTOMER';
}

export function getTenantOwnershipSummary(tenant: TenantLike) {
  if (getTenantType(tenant) === 'LOGISTICS_PROVIDER_3PL') {
    return isHybridTenant(tenant)
      ? 'Tenant operates transportation workflows on behalf of multiple customer companies. Customer portal users can participate with customer-scoped access while operations remain tenant-controlled.'
      : 'Tenant operates transportation workflows on behalf of multiple customer companies.';
  }
  return 'Tenant itself owns booking, transport assignment, freight, and logistics operations.';
}
