import { useEffect, useMemo } from 'react'
import { useAuth } from '@shared-auth'
import type { Vendor } from '@vendor/types'
import { MOCK_VENDOR } from '@vendor/lib/mock-data'
import { useAuthStore } from '@vendor/stores/auth.store'

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

export function useVendorAuth() {
  const auth = useAuth()
  const { hydrateVendor, logout: logoutVendorStore, vendor } = useAuthStore()

  const derivedVendor = useMemo(() => {
    if (vendor) return vendor
    if (!auth.user) return null
    return buildVendorFromSharedUser(auth.user.name, auth.user.email)
  }, [auth.user, vendor])

  useEffect(() => {
    if (auth.user && !vendor && derivedVendor) {
      hydrateVendor(derivedVendor)
    }
  }, [auth.user, derivedVendor, hydrateVendor, vendor])

  return {
    ...auth,
    logoutVendorStore,
    vendor: derivedVendor,
  }
}
