import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { ERPModule } from '../../shared/types';

interface ProtectedRouteProps {
  requiredPermissions?: string[];
  requiredModule?: ERPModule;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermissions,
  requiredModule,
}) => {
  const { isAuthenticated, hasPermission, hasModuleAccess, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading Optimile ERP...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check module access
  if (requiredModule && !hasModuleAccess(requiredModule)) {
    return <Navigate to="/access-denied" replace />;
  }

  // Check specific permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!hasPermission(requiredPermissions)) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  return <Outlet />;
};
