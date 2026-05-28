import type { PlatformModule } from "@/types/platform";
import { displayModule } from "@/modules/platform-admin/lib/module-display";

export const TENANT_ADMIN_MODULE_CODE = "ADMIN";

export type TenantPermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "export";

export const TENANT_PERMISSION_ACTIONS: TenantPermissionAction[] = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "export",
];

export interface TenantModuleFeature {
  code: string;
  name: string;
}

export interface TenantModuleEntry {
  code: string;
  name: string;
  features: TenantModuleFeature[];
  isVirtual: boolean;
}

const ADMIN_FEATURES: TenantModuleFeature[] = [
  { code: "ORG_UNITS", name: "Organization Units" },
  { code: "USERS", name: "Users" },
  { code: "ROLES", name: "Roles" },
  { code: "PERMISSIONS", name: "Permissions" },
];

const BOOKING_FEATURES: TenantModuleFeature[] = [
  { code: "BOOKING_DASHBOARD", name: "Booking Dashboard" },
  { code: "CUSTOMERS", name: "Customers" },
  { code: "VENDORS", name: "Vendors" },
  { code: "VEHICLE_TYPES", name: "Vehicle Types" },
  { code: "MATERIALS", name: "Materials" },
  { code: "UOM", name: "UOM" },
  { code: "ADDRESS_BOOK", name: "Address Book" },
  { code: "LR_CONFIGURATION", name: "LR Configuration" },
  { code: "LR_MANAGEMENT", name: "LR Management" },
  { code: "ASSIGNMENT_RULES", name: "Assignment Rules" },
  { code: "DOCUMENT_RULES", name: "Document Rules" },
  { code: "POD_RULES", name: "POD Rules" },
  { code: "CREATE_BOOKING", name: "Create Booking" },
  { code: "BOOKING_ASSIGNMENT", name: "Booking Assignment" },
  { code: "SHIPMENT_DOCUMENTS", name: "Shipment Documents" },
  { code: "POD", name: "POD" },
  { code: "BOOKING_REPORTS", name: "Booking Reports" },
];

// Feature lists below are derived from each module's real folder pages.
// See modules/<module-folder>/src/router or src/app/manifest for the
// canonical route list. Adding a new feature code here only makes it
// available in Role Permissions — wiring the actual page is the owning
// module's responsibility.

const FLEET_FEATURES: TenantModuleFeature[] = [
  { code: "FLEET_DASHBOARD", name: "Fleet Dashboard" },
  { code: "FLEET_OPS_INTEL", name: "Ops Intelligence" },
  { code: "FLEET_EXCEPTIONS", name: "Exception Center" },
  { code: "FLEET_LIVE_MAP", name: "Live Map" },
  { code: "FLEET_DISPATCH", name: "Dispatch" },
  { code: "FLEET_VEHICLES", name: "Vehicles" },
  { code: "FLEET_DRIVERS", name: "Drivers" },
  { code: "FLEET_COMPLIANCE", name: "Compliance" },
  { code: "FLEET_MAINTENANCE", name: "Maintenance" },
  { code: "FLEET_GARAGE", name: "Garage" },
  { code: "FLEET_TYRES", name: "Tyres" },
  { code: "FLEET_FUEL", name: "Fuel" },
  { code: "FLEET_COST", name: "Cost Health" },
  { code: "FLEET_SETTINGS", name: "Fleet Settings" },
];

const AUCTION_FEATURES: TenantModuleFeature[] = [
  { code: "AUCTION_DASHBOARD", name: "Auction Dashboard" },
  { code: "AUCTION_CLIENT_HUB", name: "Client Hub" },
  { code: "AUCTION_RFQ_RESPONSES", name: "RFQ Responses" },
  { code: "AUCTION_AUCTIONS", name: "Auctions" },
  { code: "AUCTION_CONTRACTS", name: "Contracts" },
  { code: "CREATE_AUCTION", name: "Create Auction" },
  { code: "CREATE_RFI", name: "Create RFI" },
  { code: "CREATE_RFQ", name: "Create RFQ" },
];

const CUSTOMER_FEATURES: TenantModuleFeature[] = [
  { code: "CUSTOMER_DASHBOARD", name: "Customer Dashboard" },
];

const VENDOR_FEATURES: TenantModuleFeature[] = [
  { code: "VENDOR_DASHBOARD", name: "Vendor Dashboard" },
  { code: "VENDOR_TRIPS", name: "Vendor Trips" },
  { code: "VENDOR_SOURCING", name: "Sourcing" },
  { code: "VENDOR_CONTRACTS", name: "Vendor Contracts" },
  { code: "VENDOR_INVOICES", name: "Invoices" },
  { code: "VENDOR_LEDGER", name: "Ledger" },
  { code: "VENDOR_PAYMENTS", name: "Payments" },
  { code: "VENDOR_FLEET", name: "Vendor Fleet" },
  { code: "VENDOR_SUPPORT", name: "Vendor Support" },
];

const TRACKING_FEATURES: TenantModuleFeature[] = [
  { code: "TRACKING_DASHBOARD", name: "Tracking Dashboard" },
  { code: "TRACKING_TRIPS", name: "Active Trips" },
  { code: "TRACKING_LIVE_MAP", name: "Live Map" },
  { code: "TRACKING_ALERTS", name: "Alerts" },
  { code: "TRACKING_GEOFENCES", name: "Geofences" },
  { code: "TRACKING_ANALYTICS", name: "Analytics" },
];

const PLATFORM_MODULE_FEATURES: Record<string, TenantModuleFeature[]> = {
  TMS: BOOKING_FEATURES,
  FLEET: FLEET_FEATURES,
  AUCTION: AUCTION_FEATURES,
  CUSTOMER: CUSTOMER_FEATURES,
  VENDOR: VENDOR_FEATURES,
  TRACKING: TRACKING_FEATURES,
};

export function getTenantAdminModule(): TenantModuleEntry {
  return {
    code: TENANT_ADMIN_MODULE_CODE,
    name: "Admin",
    features: ADMIN_FEATURES,
    isVirtual: true,
  };
}

export function buildTenantModuleEntries(
  enabledModuleCodes: string[],
  platformModules: PlatformModule[],
): TenantModuleEntry[] {
  const enabledSet = new Set(enabledModuleCodes);
  const platformEntries: TenantModuleEntry[] = platformModules
    // ADMIN is the virtual governance module — always prepended below via
    // getTenantAdminModule(), so it must never come through the platform
    // loop (otherwise it would appear twice).
    .filter(
      (module) =>
        module.status === "active" &&
        module.code !== TENANT_ADMIN_MODULE_CODE &&
        enabledSet.has(module.code),
    )
    .map((module) => {
      const display = displayModule(module);
      return {
        code: module.code,
        name: display.name,
        features: PLATFORM_MODULE_FEATURES[module.code] ?? [
          { code: `${module.code}_DASHBOARD`, name: `${display.name} Dashboard` },
        ],
        isVirtual: false,
      };
    });

  return [getTenantAdminModule(), ...platformEntries];
}

export function isVirtualAdminModuleCode(code: string) {
  return code === TENANT_ADMIN_MODULE_CODE;
}

// The Tenant Admin is the system-managed tenant owner account.
// It is NOT a configurable role: not editable, not hierarchy-mapped, not
// listed in the Roles table or role pickers, not previewable.
export function isTenantAdminRole(role: { id: string; name: string }) {
  const normalizedName = role.name.trim().toLowerCase();
  return (
    role.id.endsWith("-tenant-admin") ||
    normalizedName === "tenant admin" ||
    normalizedName === "tenant admin / ceo"
  );
}

// Levels we never present to the user when choosing a hierarchy mapping for
// a *role*: tenant-created roles operate on business hierarchy only.
export function isBusinessHierarchyLevel(level: { name: string }) {
  const normalized = level.name.trim().toLowerCase();
  return !(
    normalized === "tenant" ||
    normalized === "tenant / company level" ||
    normalized.startsWith("tenant /") ||
    normalized === "company" ||
    normalized === "company level"
  );
}
