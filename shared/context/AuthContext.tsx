// ============================================================
// Optimile ERP – Unified Auth Context
// ============================================================
// Single auth system that controls access to ALL modules.
// Supports: multi-tenant, RBAC, module-level gating.
// ============================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, ERPModule, Tenant } from '../types';
import { authApi, AuthTenantDto, AuthUserDto } from '../services/authApi';
import { clearStoredAuthSession, getStoredAuthSession, persistAuthSession } from '../services/authStorage';
import { ApiError, checkBackendHealth } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  /** null = check not yet complete; true = backend reachable; false = offline */
  backendAvailable: boolean | null;
  login: (email: string, password: string, rememberMe: boolean, tenantId?: string) => Promise<void>;
  logout: () => void;
  hasPermission: (requiredPermissions: string | string[]) => boolean;
  hasModuleAccess: (module: ERPModule) => boolean;
  switchTenant: (tenantId: string) => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ENV_TENANT_HINT = (import.meta.env.VITE_AUTH_TENANT_ID as string | undefined)?.trim() ?? '';
const ERP_MODULES: ERPModule[] = ['tms', 'fleet', 'ams', 'finance', 'ptl'];
const TENANT_STATUSES: Tenant['status'][] = ['active', 'suspended', 'trial'];
const USER_STATUSES: User['status'][] = ['active', 'inactive'];

function isERPModule(value: string): value is ERPModule {
  return ERP_MODULES.includes(value as ERPModule);
}

function mapTenant(apiTenant: AuthTenantDto): Tenant {
  const status = TENANT_STATUSES.includes(apiTenant.status as Tenant['status'])
    ? (apiTenant.status as Tenant['status'])
    : 'active';

  return {
    id: apiTenant.id,
    name: apiTenant.name,
    slug: apiTenant.slug,
    modules: (apiTenant.modules ?? []).filter(isERPModule),
    status,
    createdAt: apiTenant.createdAt,
  };
}

function mapUser(apiUser: AuthUserDto): User {
  const status = USER_STATUSES.includes(apiUser.status as User['status'])
    ? (apiUser.status as User['status'])
    : 'inactive';

  return {
    id: apiUser.id,
    tenantId: apiUser.tenantId,
    email: apiUser.email,
    name: apiUser.name,
    role: apiUser.role as User['role'],
    department: (apiUser.department || 'IT Admin') as User['department'],
    region: apiUser.region || undefined,
    permissions: apiUser.permissions ?? [],
    modules: (apiUser.modules ?? []).filter(isERPModule),
    status,
  };
}

function clearLegacySessionKeys() {
  const legacyKeys = [
    'optimile_erp_user',
    'optimile_erp_tenant',
  ];
  legacyKeys.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function mapLoginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Invalid email or password';
    }
    if (error.status === 403) {
      return 'Login is currently blocked by backend security policy';
    }
    if (error.status === 409) {
      return 'Login conflict on server. Please retry once.';
    }
    return error.message || `Login failed (${error.status})`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unable to sign in right now';
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 8-O3: Non-blocking health check — runs concurrently with session restore
    checkBackendHealth().then(ok => { if (isMounted) setBackendAvailable(ok); });

    const restoreSession = async () => {
      const storedAuth = getStoredAuthSession();
      if (!storedAuth) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const me = await authApi.me();
        if (!isMounted) return;
        setUser(mapUser(me.user));
        setTenant(mapTenant(me.tenant));
      } catch {
        clearStoredAuthSession();
        clearLegacySessionKeys();
        if (!isMounted) return;
        setUser(null);
        setTenant(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean, tenantId?: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const authResponse = await authApi.login({
        tenantId: tenantId?.trim() || ENV_TENANT_HINT,
        email,
        password,
        rememberMe,
      });

      // 1-A3: persist tenantId alongside tokens for X-Tenant-ID header injection
      persistAuthSession({
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        tokenType: authResponse.tokenType || 'Bearer',
        expiresAt: Date.now() + Math.max(0, authResponse.expiresInSeconds) * 1000,
      }, rememberMe, authResponse.tenant.id);

      clearLegacySessionKeys();
      setUser(mapUser(authResponse.user));
      setTenant(mapTenant(authResponse.tenant));
    } catch (error) {
      const message = mapLoginError(error);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    const refreshToken = getStoredAuthSession()?.tokens.refreshToken;
    void authApi.logout(refreshToken).catch(() => {
      // Ignore API logout errors and clear local session regardless.
    });

    setUser(null);
    setTenant(null);
    setError(null);
    clearStoredAuthSession();
    clearLegacySessionKeys();
  };

  const hasPermission = (requiredPermissions: string | string[]): boolean => {
    if (!user) return false;
    if (user.permissions.includes('all')) return true;
    const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    return required.some(p => user.permissions.includes(p));
  };

  const hasModuleAccess = (module: ERPModule): boolean => {
    if (!user || !tenant) return false;
    // Tenant must have the module licensed
    if (!tenant.modules.includes(module)) return false;
    // User must have the module in their access list (or have 'all' permissions)
    if (user.permissions.includes('all')) return true;
    return user.modules.includes(module);
  };
  const switchTenant = (tenantId: string) => {
    if (!tenant) return;
    if (tenant.id === tenantId) return; // already on this tenant
    // 1-A4: Clear session and redirect to login with target tenantId as query param.
    clearStoredAuthSession();
    clearLegacySessionKeys();
    setUser(null);
    setTenant(null);
    window.location.assign(`/login?tenantId=${encodeURIComponent(tenantId)}`);
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      await authApi.forgotPassword(email);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process request';
      setError(message);
      throw new Error(message);
    }
  };

  const resetPassword = async (token: string, password: string): Promise<void> => {
    try {
      await authApi.resetPassword({ token, newPassword: password });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      setError(message);
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isAuthenticated: !!user,
        loading,
        error,
        backendAvailable,
        login,
        logout,
        hasPermission,
        hasModuleAccess,
        switchTenant,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
