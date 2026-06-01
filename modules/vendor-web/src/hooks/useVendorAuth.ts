import { useEffect, useMemo } from 'react'
import { useAuth } from '@shared-auth'
import type { Vendor } from '@vendor/types'
import { MOCK_VENDOR } from '@vendor/lib/mock-data'
import { useAuthStore } from '@vendor/stores/auth.store'

// The unified login page (shared-admin-core) writes the signed-in session here.
// When a vendor signs in from tenant master data (Admin → Vendors) the session
// carries which vendor they are; the portal then acts AS that vendor.
const SESSION_CONTEXT_KEY = 'optimile.session.context'

type PortalVendorIdentity = { vendorId?: string; vendorName?: string; phone?: string }

function readPortalVendorIdentity(): PortalVendorIdentity | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_CONTEXT_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as {
      loginType?: string
      vendorId?: string
      vendorName?: string
      phone?: string
    }
    if (session?.loginType !== 'VENDOR') return null
    return { vendorId: session.vendorId, vendorName: session.vendorName, phone: session.phone }
  } catch {
    return null
  }
}

function buildVendorFromSharedUser(name: string, email: string): Vendor {
  return {
    ...MOCK_VENDOR,
    primaryContact: {
      ...MOCK_VENDOR.primaryContact,
      email,
      name,
    },
    tradingName: MOCK_VENDOR.tradingName,
  }
}

function buildVendorFromPortalIdentity(identity: PortalVendorIdentity): Vendor {
  const name = identity.vendorName ?? MOCK_VENDOR.tradingName
  return {
    ...MOCK_VENDOR,
    id: identity.vendorId ?? MOCK_VENDOR.id,
    tradingName: name,
    legalName: name,
    primaryContact: {
      ...MOCK_VENDOR.primaryContact,
      name,
      phone: identity.phone || MOCK_VENDOR.primaryContact.phone,
    },
  }
}

export function useVendorAuth() {
  const auth = useAuth()
  const { hydrateVendor, logout: logoutVendorStore, vendor } = useAuthStore()

  const portalIdentity = useMemo(() => readPortalVendorIdentity(), [])

  const derivedVendor = useMemo(() => {
    // A vendor signed in from tenant master data takes precedence so the portal
    // is scoped to the logged-in vendor's identity.
    if (portalIdentity) return buildVendorFromPortalIdentity(portalIdentity)
    if (vendor) return vendor
    if (!auth.user) return null
    return buildVendorFromSharedUser(auth.user.name, auth.user.email)
  }, [auth.user, vendor, portalIdentity])

  useEffect(() => {
    if (!derivedVendor) return
    // Keep the persisted vendor store aligned with the logged-in identity.
    if (portalIdentity) {
      if (!vendor || vendor.id !== derivedVendor.id || vendor.tradingName !== derivedVendor.tradingName) {
        hydrateVendor(derivedVendor)
      }
      return
    }
    if (auth.user && !vendor) {
      hydrateVendor(derivedVendor)
    }
  }, [auth.user, derivedVendor, hydrateVendor, vendor, portalIdentity])

  return {
    ...auth,
    logoutVendorStore,
    vendor: derivedVendor,
  }
}
