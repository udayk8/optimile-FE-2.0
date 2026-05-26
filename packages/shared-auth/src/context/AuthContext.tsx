/// <reference types="vite/client" />
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, ERPModule, Tenant, SystemRole } from '../types'
import { authApi, AuthTenantDto, AuthUserDto } from '../services/authApi'
import { clearStoredAuthSession, getStoredAuthSession, persistAuthSession } from '../services/authStorage'
import { ApiError, checkBackendHealth } from '../services/apiClient'
import { canUserAccessModule, getPostLoginRouteForUser } from '../moduleRoutes'
import {
  clearAuthState,
  clearDemoSession,
  storeDemoLogin,
  storeDemoSession,
  storeTokenLogin,
  type Portal,
} from '../utils/authStorage'

// ── Mock users for demo mode ─────────────────────────────────
interface MockUser { name: string; role: SystemRole; modules: ERPModule[]; permissions: string[] }

export const DEMO_CREDENTIALS: Record<string, MockUser> = {
  // CEO — full access to all in-scope modules → goes into unified shell
  'ceo@uday.ts.com': {
    name: 'Uday Yaduwanshi',
    role: 'CEO',
    permissions: ['all'],
    modules: ['fleet', 'ams', 'vendor'],
  },
  // Platform Admin — platform administration console
  'platform-admin@optimile.com': {
    name: 'Platform Administrator',
    role: 'Platform Admin',
    permissions: ['platform-admin:read', 'platform-admin:write'],
    modules: ['platform-admin'],
  },
  // Tenant Admin — tenant administration console
  'tenant-admin@optimile.com': {
    name: 'Tenant Administrator',
    role: 'Tenant Admin',
    permissions: ['tenant-admin:read', 'tenant-admin:write'],
    modules: ['tenant-admin'],
  },
  // TMS Booking — standalone booking module
  'tms-booking@optimile.com': {
    name: 'TMS Booking User',
    role: 'TMS',
    permissions: ['tms-booking:read', 'tms-booking:write'],
    modules: ['tms-booking'],
  },
  // Vendor + Fleet combined — no auction
  'vendor-fleet@optimile.com': {
    name: 'Vendor Fleet User',
    role: 'Vendor Fleet',
    permissions: ['vendor:read', 'vendor:write', 'fleet:read', 'fleet:write'],
    modules: ['fleet', 'vendor'],
  },
  // Auction only
  'auction@optimile.com': {
    name: 'Auction User',
    role: 'Auction Only',
    permissions: ['ams:read', 'ams:write'],
    modules: ['ams'],
  },
  // Fleet only
  'fleet@optimile.com': {
    name: 'Fleet User',
    role: 'Fleet Only',
    permissions: ['fleet:read', 'fleet:write'],
    modules: ['fleet'],
  },
  // Vendor only
  'vendor@optimile.com': {
    name: 'Vendor User',
    role: 'Vendor Only',
    permissions: ['vendor:read', 'vendor:write'],
    modules: ['vendor'],
  },
  // Track and Trace — standalone track-trace-web module
  'track-trace@optimile.com': {
    name: 'Track and Trace User',
    role: 'Track and Trace',
    permissions: ['tracking:read', 'tracking:write'],
    modules: ['tracking'],
  },
  // CBD — standalone customer-web module
  'cbd@optimile.com': {
    name: 'CBD User',
    role: 'CBD',
    permissions: ['customer:read', 'customer:write'],
    modules: ['customer'],
  },
}

export const DEMO_PASSWORD = 'testing'

// ── Context type ─────────────────────────────────────────────
interface AuthContextType {
  user: User | null
  tenant: Tenant | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  backendAvailable: boolean | null
  login: (email: string, password: string, rememberMe?: boolean) => Promise<string>
  logout: () => void
  hasPermission: (required: string | string[]) => boolean
  hasModuleAccess: (module: ERPModule) => boolean
  /** Returns the route to redirect to after login */
  getPostLoginRoute: () => string
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ENV_TENANT_HINT = (import.meta.env.VITE_AUTH_TENANT_ID as string | undefined)?.trim() ?? ''
const ALL_ERP_MODULES: ERPModule[] = ['admin', 'ams', 'fleet', 'vendor', 'customer', 'tms', 'tracking', 'finance', 'reporting', 'ptl', 'platform-admin', 'tenant-admin', 'tms-booking', 'driver-app']
const TENANT_STATUSES: Tenant['status'][] = ['active', 'suspended', 'trial']
const USER_STATUSES: User['status'][] = ['active', 'inactive']

function isERPModule(value: string): value is ERPModule {
  return ALL_ERP_MODULES.includes(value as ERPModule)
}

function mapTenant(apiTenant: AuthTenantDto): Tenant {
  const status = TENANT_STATUSES.includes(apiTenant.status as Tenant['status'])
    ? (apiTenant.status as Tenant['status']) : 'active'
  return {
    id: apiTenant.id, name: apiTenant.name, slug: apiTenant.slug,
    modules: (apiTenant.modules ?? []).filter(isERPModule), status, createdAt: apiTenant.createdAt,
  }
}

function mapUser(apiUser: AuthUserDto): User {
  const status = USER_STATUSES.includes(apiUser.status as User['status'])
    ? (apiUser.status as User['status']) : 'inactive'
  return {
    id: apiUser.id, tenantId: apiUser.tenantId, email: apiUser.email, name: apiUser.name,
    role: apiUser.role as User['role'],
    department: (apiUser.department || 'IT Admin') as User['department'],
    region: apiUser.region || undefined,
    permissions: apiUser.permissions ?? [],
    modules: (apiUser.modules ?? []).filter(isERPModule), status,
  }
}

function clearLegacyKeys() {
  ['optimile_erp_user', 'optimile_erp_tenant'].forEach(k => {
    localStorage.removeItem(k); sessionStorage.removeItem(k)
  })
}

function mapLoginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Invalid email or password'
    if (error.status === 403) return 'Account access is blocked. Contact your administrator.'
    return error.message || `Login failed (${error.status})`
  }
  if (error instanceof Error) return error.message
  return 'Unable to sign in right now'
}

const DEMO_TENANT: Tenant = {
  id: 'demo-tenant', name: 'Optimile Demo', slug: 'optimile-demo',
  modules: ALL_ERP_MODULES, status: 'active', createdAt: new Date().toISOString(),
}

function getPrimaryPortal(modules: ERPModule[]): Portal {
  if (modules.includes('ams')) return 'auction'
  if (modules.includes('admin')) return 'admin'
  if (modules.includes('platform-admin')) return 'platform-admin'
  if (modules.includes('tenant-admin')) return 'tenant-admin'
  if (modules.includes('tms-booking')) return 'tms-booking'
  if (modules.includes('driver-app')) return 'driver-app'
  if (modules.includes('tracking')) return 'tracking'
  if (modules.includes('tms')) return 'tms'
  if (modules.includes('fleet')) return 'fleet'
  if (modules.includes('vendor')) return 'vendor'
  if (modules.includes('customer')) return 'customer'
  return 'admin'
}

function buildDemoUser(emailKey: string, mock: MockUser): User {
  return {
    id: `demo-${emailKey}`,
    tenantId: 'demo-tenant',
    email: emailKey,
    name: mock.name,
    role: mock.role,
    department: 'Management',
    permissions: mock.permissions,
    modules: mock.modules,
    status: 'active',
  }
}

// ── Provider ─────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser]                     = useState<User | null>(null)
  const [tenant, setTenant]                 = useState<Tenant | null>(null)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    checkBackendHealth().then(ok => { if (mounted) setBackendAvailable(ok) })

    const restore = async () => {
      const storedSession = getStoredAuthSession()
      if (!storedSession) {
        clearDemoSession()
        if (mounted) setLoading(false)
        return
      }
      try {
        const me = await authApi.me()
        if (!mounted) return
        setUser(mapUser(me.user))
        setTenant(mapTenant(me.tenant))
      } catch {
        clearStoredAuthSession(); clearLegacyKeys()
        if (!mounted) return
        setUser(null); setTenant(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void restore()
    return () => { mounted = false }
  }, [])

  const login = async (email: string, password: string, rememberMe = false) => {
    setLoading(true)
    setError(null)

    // Demo mode — match against mock credentials
    const emailKey = email.trim().toLowerCase()
    const mock = DEMO_CREDENTIALS[emailKey]
    if (mock && (password === DEMO_PASSWORD || backendAvailable === false)) {
      const demoUser = buildDemoUser(emailKey, mock)

      setUser(demoUser)
      setTenant(DEMO_TENANT)
      storeDemoLogin(getPrimaryPortal(mock.modules), mock.role)
      storeDemoSession(emailKey, rememberMe)
      setLoading(false)
      return getPostLoginRouteForUser(demoUser)
    }

    // Real backend auth
    try {
      const res = await authApi.login({ tenantId: ENV_TENANT_HINT, email, password, rememberMe })
      persistAuthSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        tokenType: res.tokenType || 'Bearer',
        expiresAt: Date.now() + Math.max(0, res.expiresInSeconds) * 1000,
      }, rememberMe, res.tenant.id)
      clearLegacyKeys()
      const nextUser = mapUser(res.user)
      setUser(nextUser)
      setTenant(mapTenant(res.tenant))
      storeTokenLogin(getPrimaryPortal(nextUser.modules))
      return getPostLoginRouteForUser(nextUser)
    } catch (err) {
      const message = mapLoginError(err)
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    const token = getStoredAuthSession()?.tokens.refreshToken
    void authApi.logout(token).catch(() => {})
    setUser(null); setTenant(null); setError(null)
    clearStoredAuthSession(); clearLegacyKeys(); clearDemoSession(); clearAuthState()
  }

  const hasPermission = (required: string | string[]): boolean => {
    if (!user) return false
    if (user.permissions.includes('all')) return true
    const list = Array.isArray(required) ? required : [required]
    return list.some(p => user.permissions.includes(p))
  }

  const hasModuleAccess = (module: ERPModule): boolean => {
    return canUserAccessModule(user, module)
  }

  const getPostLoginRoute = (): string => {
    return getPostLoginRouteForUser(user)
  }

  const forgotPassword = async (email: string) => {
    try { await authApi.forgotPassword(email) }
    catch (err) { const m = err instanceof Error ? err.message : 'Failed'; setError(m); throw new Error(m) }
  }

  const resetPassword = async (token: string, password: string) => {
    try { await authApi.resetPassword({ token, newPassword: password }) }
    catch (err) { const m = err instanceof Error ? err.message : 'Failed'; setError(m); throw new Error(m) }
  }

  return (
    <AuthContext.Provider value={{
      user, tenant, isAuthenticated: !!user, loading, error, backendAvailable,
      login, logout, hasPermission, hasModuleAccess, getPostLoginRoute,
      forgotPassword, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
