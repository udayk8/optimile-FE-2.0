// Customer-portal session identity.
//
// Written at login when a user signs in through the customer portal, and read by the
// customer shells to show the customer's name/role. It lives in localStorage OUTSIDE the
// shared auth session, so it must be cleared explicitly on logout (see useCustomerLogout).

export const SESSION_CONTEXT_KEY = 'optimile.session.context'

export type PortalCustomerIdentity = {
  customerId?: string
  customerName?: string
  phone?: string
}

/**
 * Reads the customer-portal identity from localStorage, or null when the current session
 * is not a CUSTOMER login (or storage is unavailable / malformed).
 */
export function readPortalCustomerIdentity(): PortalCustomerIdentity | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_CONTEXT_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as {
      loginType?: string; customerId?: string; customerName?: string; phone?: string
    }
    if (session?.loginType !== 'CUSTOMER') return null
    return { customerId: session.customerId, customerName: session.customerName, phone: session.phone }
  } catch {
    return null
  }
}
