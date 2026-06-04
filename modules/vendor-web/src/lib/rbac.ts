/**
 * RBAC Utility Functions
 * 
 * These functions provide role-based access control checks for UI rendering.
 * Currently defaults to full access for the vendor portal (single-role app).
 * When backend RBAC is implemented, these should be wired to actual permissions.
 * 
 * Usage:
 *   if (canView('fleet')) { ... }
 *   if (canCreate('fleet', 'vehicle')) { ... }
 */

export type Module = 'dashboard' | 'sourcing' | 'contracts' | 'trips' | 'fleet' | 'invoices' | 'profile'
export type Feature = string

/**
 * Check if the current user can view a module.
 */
export function canView(_module: Module): boolean {
  // Default: all modules visible for vendor portal
  return true
}

/**
 * Check if the current user can create a resource within a module.
 */
export function canCreate(_module: Module, _feature?: Feature): boolean {
  return true
}

/**
 * Check if the current user can edit a resource within a module.
 */
export function canEdit(_module: Module, _feature?: Feature): boolean {
  return true
}

/**
 * Check if the current user can delete a resource within a module.
 */
export function canDelete(_module: Module, _feature?: Feature): boolean {
  return true
}

/**
 * Check if the current user can approve a resource within a module.
 */
export function canApprove(_module: Module, _feature?: Feature): boolean {
  return true
}
