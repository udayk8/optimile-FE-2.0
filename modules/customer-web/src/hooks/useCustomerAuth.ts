import { useMemo } from 'react'
import { useAuth } from '@shared-auth'
import { readPortalCustomerIdentity, type PortalCustomerIdentity } from '../shared/portal-session'

// Mirrors vendor-web's useVendorAuth: wraps the shared useAuth() and resolves the
// customer identity that the unified login page (shared-admin-core) writes to
// optimile.session.context when a user signs in through the customer portal
// (loginType === 'CUSTOMER'). The portal then acts AS that customer.
//
// Unlike useVendorAuth there is no module-local persisted store — customer-web is
// mock/bridge driven and reads identity straight from the session context.
export type CustomerAuth = ReturnType<typeof useAuth> & {
  customer: PortalCustomerIdentity | null
}

export function useCustomerAuth(): CustomerAuth {
  const auth = useAuth()
  const customer = useMemo(() => readPortalCustomerIdentity(), [])
  return { ...auth, customer }
}
