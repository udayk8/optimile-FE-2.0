import { useCallback } from 'react'
import { clearAuthState, clearStoredAuthSession } from '@shared-auth'
import { SESSION_CONTEXT_KEY } from '../shared/portal-session'

/**
 * Single source of truth for logging out of the customer web app.
 *
 * Clears every session at the STORAGE level and then does one hard redirect:
 *  1. clearStoredAuthSession() — shared auth tokens (+ legacy keys).
 *  2. clearAuthState()        — authMode / selectedPortal / userRole / rememberMe / demo session.
 *  3. removes optimile.session.context — the customer-portal identity @shared-auth doesn't know about.
 *  4. window.location.assign('/login') — a full page load destroys all in-memory
 *     state (React tree, bridge data, caches).
 *
 * We intentionally do NOT call useAuth().logout(): its setUser(null) re-renders
 * ProtectedRoute and briefly flashes the SPA login page before the reload below
 * replaces it. Clearing storage imperatively avoids that flash. The only thing
 * lost vs. the context logout is its best-effort authApi.logout() backend revoke,
 * which the immediate reload was aborting anyway.
 */
export function useCustomerLogout(): () => void {
  return useCallback(() => {
    clearStoredAuthSession()
    clearAuthState()
    try {
      window.localStorage.removeItem(SESSION_CONTEXT_KEY)
    } catch {
      // localStorage unavailable (private mode / SSR) — nothing to clear.
    }
    window.location.assign('/login')
  }, [])
}
