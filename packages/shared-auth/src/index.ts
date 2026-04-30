// ── Core auth system ─────────────────────────────────────────
export * from './types'
export * from './context/AuthContext'
export * from './moduleRoutes'
export * from './services/authStorage'
export * from './services/apiClient'

// ── Guards ───────────────────────────────────────────────────
export * from './guards/RouteGuard'
export * from './guards/withAuthGuard'
export * from './guards/AccessGate'

// ── Fleet-specific auth ──────────────────────────────────────
export * from './hooks/useFleetAuth'
export * from './modulePermissions'
export * from './permissions'

// ── Legacy helpers (fleet module uses these) ─────────────────
export {
  PORTALS, AUTH_MODES, isPortal, isAuthMode,
  getSelectedPortal, getAuthMode, getSelectedRole,
  storePortalSelection, storeDemoLogin, storeTokenLogin,
  clearAuthState, getPortalDashboardPath, getPortalDashboardUrl,
  hasValidAuthState, type Portal, type AuthMode,
} from './utils/authStorage'
export { ROLE_CONSTANTS, isDemoRole, isCeoRole } from './roles'

// ── Components ───────────────────────────────────────────────
export { LoginShell }           from './components/LoginShell'
export { ForgotPassword }       from './components/ForgotPassword'
export { ResetPassword }        from './components/ResetPassword'
export { OptimileLogo }         from './components/OptimileLogo'
export { ModuleSelector }       from './components/ModuleSelector'
export { PostLoginDashboard }   from './components/PostLoginDashboard'
