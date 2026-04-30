import React from 'react';
import { useAuth } from '../context/AuthContext';

interface PermissionGuardProps {
  /**
   * Required permission string (e.g., 'fleet:write').
   * If an array is provided, 'mode' determines if all or any are required.
   */
  permission?: string | string[];
  
  /**
   * Optional module requirement.
   */
  module?: string;
  
  /**
   * 'all' (default): user must have all provided permissions.
   * 'any': user must have at least one of the provided permissions.
   */
  mode?: 'all' | 'any';
  
  /**
   * What to show if the user does NOT have permission.
   * Default is null (hides the content).
   */
  fallback?: React.ReactNode;
  
  children: React.ReactNode;
}

/**
 * PermissionGuard
 * 
 * A wrapper component to conditionally render UI elements (buttons, sections)
 * based on the user's granular permissions and module access.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  module,
  mode = 'all',
  fallback = null,
  children,
}) => {
  const { user, hasPermission, hasModuleAccess } = useAuth();

  // 1. Check Module Access if specified
  if (module && !hasModuleAccess(module as any)) {
    return <>{fallback}</>;
  }

  // 2. Check Permissions if specified
  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission];
    
    const hasAccess = mode === 'all'
      ? perms.every(p => hasPermission(p))
      : perms.some(p => hasPermission(p));

    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  // 3. User is authorized
  return <>{children}</>;
};

/**
 * usePermission
 * 
 * Hook for programmatic permission checks (e.g., inside an event handler).
 */
export const usePermission = () => {
  const { hasPermission, hasModuleAccess } = useAuth();
  
  return {
    can: (perm: string) => hasPermission(perm),
    hasModule: (mod: string) => hasModuleAccess(mod as any),
  };
};
