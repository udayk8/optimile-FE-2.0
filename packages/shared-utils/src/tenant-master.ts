// Cross-module readers for tenant master data the tenant-admin module persists
// to shared localStorage. Other modules (auction-web, vendor-web) read these so
// dropdowns reflect what's actually onboarded — no hardcoded lists.

const TENANT_VEHICLE_TYPES_KEY = 'optimile.tenant.vehicleTypes'
const TENANT_VENDORS_KEY = 'optimile.tenant.vendors'
const CUSTOMER_ADDRESSES_KEY = 'optimile.tenant.customerAddresses'

interface StoredVehicleType {
  tenantId?: string
  typeCode?: string
  typeName?: string
  status?: string
}

interface StoredVendor {
  id?: string
  tenantId?: string
  name?: string
  status?: string
}

function readJson<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

interface StoredCustomerAddress {
  tenantId?: string
  city?: string
}

/**
 * Cities from the onboarded customers' addresses for the tenant. Used by the
 * auction lane dropdowns. Lenient on tenant scoping: prefer addresses matching
 * the tenant, but if none match (seed/tenant-id mismatch) fall back to every
 * address's city so the dropdown is never empty.
 */
export function listCustomerAddressCities(tenantId?: string): string[] {
  const all = readJson<StoredCustomerAddress>(CUSTOMER_ADDRESSES_KEY)
  const collect = (rows: StoredCustomerAddress[]) => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const a of rows) {
      const city = (a.city ?? '').trim().replace(/\s+/g, ' ')
      if (!city) continue
      const key = city.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(city)
    }
    return out.sort((a, b) => a.localeCompare(b))
  }
  const scoped = tenantId ? all.filter((a) => !a.tenantId || a.tenantId === tenantId) : all
  const cities = collect(scoped)
  return cities.length > 0 ? cities : collect(all)
}

/** Active vehicle-type labels onboarded for the tenant (typeName, else typeCode). */
export function listTenantVehicleTypes(tenantId?: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const vt of readJson<StoredVehicleType>(TENANT_VEHICLE_TYPES_KEY)) {
    if (tenantId && vt.tenantId && vt.tenantId !== tenantId) continue
    if (vt.status && vt.status !== 'active') continue
    const label = (vt.typeName || vt.typeCode || '').trim()
    if (!label || seen.has(label)) continue
    seen.add(label)
    out.push(label)
  }
  return out.sort((a, b) => a.localeCompare(b))
}

/** Active vendors onboarded for the tenant ({ id, name }). */
export function listTenantVendors(tenantId?: string): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = []
  for (const v of readJson<StoredVendor>(TENANT_VENDORS_KEY)) {
    if (tenantId && v.tenantId && v.tenantId !== tenantId) continue
    if (v.status && v.status === 'inactive') continue
    const name = (v.name || '').trim()
    if (!name) continue
    out.push({ id: v.id || name, name })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}
