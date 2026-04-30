// All ERP modules available in Optimile
export type ERPModule =
  | 'fleet'       // Fleet Management
  | 'ams'         // Auction / Procurement
  | 'vendor'      // Vendor Management
  | 'driver'      // Driver Management
  | 'customer'    // Customer Management
  | 'tms'         // Booking / Transport Management
  | 'tracking'    // Live Tracking
  | 'finance'     // Finance & Accounts
  | 'reporting'   // Reporting / Dashboard
  | 'admin'       // Administration
  | 'ptl'         // Part Truck Load

export type Department =
  | 'Management'
  | 'Operations'
  | 'Fleet'
  | 'Finance'
  | 'Procurement'
  | 'Compliance'
  | 'IT Admin'

export type SystemRole =
  | 'Super Admin'
  | 'CEO'
  | 'Admin'
  | 'Administrator'
  | 'Operations Head'
  | 'Regional Manager'
  | 'Fleet Manager'
  | 'Finance Manager'
  | 'Auction Head'
  | 'Vendor'
  | 'Accountant'
  | 'Procurement Head'
  | 'Supervisor'
  | 'Driver'
  | 'Viewer'

export interface Tenant {
  id: string
  name: string
  slug: string
  logo?: string
  primaryColor?: string
  modules: ERPModule[]
  status: 'active' | 'suspended' | 'trial'
  createdAt: string
}

export interface User {
  id: string
  tenantId: string
  email: string
  name: string
  role: SystemRole
  department: Department
  region?: string
  permissions: string[]
  modules: ERPModule[]
  avatarUrl?: string
  status: 'active' | 'inactive'
}
