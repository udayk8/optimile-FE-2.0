// ============================================================
// Optimile ERP – Shared Types
// ============================================================
import { LucideIcon } from 'lucide-react';

// Re-export platform master types
export type { PlatformVendor, TMSVendorExtension, AMSVendorExtension, VendorType as PlatformVendorType, VendorStatus as PlatformVendorStatus, VerificationLevel, VendorCreatedFrom, VendorDocument, VendorDocumentType, VendorDocumentStatus, TMSRateAgreement } from './vendor';
export { EMPTY_PLATFORM_VENDOR, EMPTY_TMS_EXTENSION } from './vendor';
export type { PlatformCustomer, CustomerTier, CustomerStatus as PlatformCustomerStatus, CustomerContact } from './customer';
export { EMPTY_CUSTOMER } from './customer';

// ── Tenant / Multi-tenancy ──────────────────────────────────
export interface Tenant {
  id: string;
  name: string;           // "ABC Logistics Pvt Ltd"
  slug: string;           // "abc-logistics" (used in URLs)
  logo?: string;
  primaryColor?: string;  // Optional branding override
  modules: ERPModule[];   // Which modules are licensed
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
}

// ── ERP Modules ─────────────────────────────────────────────
export type ERPModule =
  | 'tms'              // Transport Management
  | 'fleet'            // Fleet Management
  | 'ams'              // Auction Management / Procurement
  | 'finance'          // Financial Management
  | 'ptl'              // Part Truck Load
  ;

// ── Departments ─────────────────────────────────────────────
export type Department =
  | 'Management'
  | 'Operations'
  | 'Fleet'
  | 'Finance'
  | 'Procurement'
  | 'Compliance'
  | 'IT Admin'
  ;

// ── Roles ───────────────────────────────────────────────────
export type SystemRole =
  | 'Super Admin'       // Full access to everything + tenant config
  | 'CEO'               // Read access to all dashboards
  | 'Admin'             // Full access within assigned modules
  | 'Operations Head'   // TMS + Fleet operations
  | 'Regional Manager'  // TMS regional scope
  | 'Fleet Manager'     // Fleet Control module
  | 'Finance Manager'   // Finance module
  | 'Accountant'        // Finance - restricted write
  | 'Procurement Head'  // AMS module
  | 'Supervisor'        // TMS loading bay / check-in
  | 'Driver'            // Mobile / walkaround only
  | 'Viewer'            // Read-only across permitted modules
  ;

// ── Permissions ─────────────────────────────────────────────
// Permissions follow the format "module:action" (e.g., "tms:read", "fleet:write")
// This matches the database standard for multi-tenant isolation.
// The RBAC engine checks: user.permissions includes required permission
// "all" = superadmin/CEO wildcard

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: SystemRole;
  department: Department;
  region?: string;         // For regional scoping
  permissions: string[];   // Flat permission list
  modules: ERPModule[];    // Which modules this user can access
  avatarUrl?: string;
  status: 'active' | 'inactive';
}

// ── Navigation ──────────────────────────────────────────────
export interface NavSection {
  title: string;           // Section heading in sidebar
  module: ERPModule;       // Which module this belongs to
  items: NavItem[];
}

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  module: ERPModule;
  requiredPermissions?: string[];
  badge?: string;          // e.g., notification count
}

// ── Event Bus ───────────────────────────────────────────────
// Cross-module communication without tight coupling
export interface ERPEvent {
  type: string;
  module: ERPModule;
  payload: any;
  timestamp: string;
  userId: string;
  tenantId: string;
}

// Common event types for cross-module data flow
export type ERPEventType =
  | 'trip.completed'          // TMS → Finance (auto-create expense)
  | 'trip.statusChanged'      // TMS → Fleet (update vehicle status)
  | 'trip.dispatched'         // State machine → Fleet (vehicle in use)
  | 'trip.inTransit'          // State machine → Control Tower (tracking)
  | 'trip.delivered'          // State machine → Finance (start invoicing)
  | 'trip.invoiced'           // Finance → TMS (link invoice)
  | 'trip.cancelled'          // TMS → Fleet (release vehicle)
  | 'trip.shortClosed'        // TMS → Finance (partial settlement)
  | 'vehicle.maintenance'     // Fleet → TMS (remove from dispatch pool)
  | 'invoice.created'         // Finance → TMS (link to booking)
  | 'auction.awarded'         // AMS → TMS (create contract rates)
  | 'vendor.created'          // TMS/AMS → Finance, Fleet (new vendor available)
  | 'vendor.updated'          // TMS/AMS → Finance, Fleet (vendor data changed)
  | 'vendor.statusChanged'    // TMS/AMS → All (vendor active/inactive/blacklisted)
  | 'vendor.onboarded'        // AMS → Finance (create vendor ledger)
  | 'customer.created'        // TMS → Finance, AMS (new customer available)
  | 'customer.updated'        // TMS → Finance (customer data changed)
  | 'customer.creditLimitBreached' // Finance → TMS (block bookings)
  | 'exception.raised'        // TMS → Control Tower (new exception)
  | 'exception.resolved'      // TMS → Control Tower (exception cleared)
  | 'exception.escalated'     // System → Notifications (auto-escalation)
  | 'exception.slaBreached'   // System → Notifications (SLA breach alert)
  | 'exception.replacementAssigned' // TMS → Fleet (replacement vehicle)
  | 'eta.updated'             // Control Tower → TMS (revised ETA)
  | 'eta.delayDetected'       // Control Tower → TMS (delay alert)
  | 'tyre.replaced'           // Fleet/Tyre → Finance (record expense)
  | 'fuel.recorded'           // Fleet → Finance (record expense)
  ;

// ── Shared Data Models (cross-module) ───────────────────────

export interface Vehicle {
  id: string;
  tenantId: string;
  plate: string;
  model: string;
  status: 'Available' | 'In Transit' | 'Maintenance' | 'Dispatched';
  driverId?: string;
  fuelLevel: number;
}

export interface Driver {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  license: string;
  status: 'Active' | 'On Trip' | 'Off Duty' | 'Suspended';
}

export interface Vendor {
  id: string;
  tenantId: string;
  name: string;
  type: 'transporter' | 'tyre' | 'maintenance' | 'fuel' | 'other';
  balance: number;
  status: 'active' | 'inactive' | 'blacklisted';
}

export interface Booking {
  id: string;
  tenantId: string;
  customerId: string;
  origin: string;
  destination: string;
  status: 'Pending' | 'Approved' | 'In Transit' | 'Delivered' | 'Cancelled';
  vehicleId?: string;
  driverId?: string;
  vendorId?: string;
  amount: number;
}

// ── UI Types ────────────────────────────────────────────────
export interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  color?: string;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}
