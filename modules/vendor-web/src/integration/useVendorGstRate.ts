import { readIdentity } from '@vendor/integration/auctionBridge'

/**
 * Cross-module: the vendor's GST rate is configured by the tenant admin during
 * vendor onboarding and stored on the shared tenant-vendors record. The vendor
 * portal reads it (same-origin localStorage) so invoices use the vendor's own
 * configured rate instead of a hardcoded default. Falls back to 12% when no
 * configured rate is found (e.g. standalone vendor build).
 */
const TENANT_VENDORS_KEY = 'optimile.tenant.vendors'
const DEFAULT_GST_RATE = 12

type StoredVendor = { id: string; name: string; gstRate?: number }

export function readVendorGstRate(): number {
  if (typeof window === 'undefined') return DEFAULT_GST_RATE
  try {
    const raw = window.localStorage.getItem(TENANT_VENDORS_KEY)
    if (!raw) return DEFAULT_GST_RATE
    const vendors = JSON.parse(raw) as StoredVendor[]
    const identity = readIdentity()
    const name = identity.vendorName.toLowerCase()
    const match = vendors.find(
      (vendor) => vendor.id === identity.vendorId || vendor.name?.toLowerCase() === name,
    )
    return match?.gstRate ?? DEFAULT_GST_RATE
  } catch {
    return DEFAULT_GST_RATE
  }
}

/** Hook wrapper for components. */
export function useVendorGstRate(): number {
  return readVendorGstRate()
}
