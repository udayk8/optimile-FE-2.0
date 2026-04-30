// ============================================================
// Optimile ERP – Layout Shell
// ============================================================
import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../shared/context/AuthContext';
import { UIProvider } from '../../shared/context/UIContext';

export const Layout: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <UIProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 w-0 overflow-hidden">
          <Header />
          <main className="flex-1 flex flex-col relative overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
              <div className="max-w-7xl mx-auto h-full flex flex-col">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </UIProvider>
  );
};
