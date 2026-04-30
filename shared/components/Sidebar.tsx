// ============================================================
// Optimile ERP – Unified Sidebar (TMS Theme)
// ============================================================
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { NAV_SECTIONS } from '../../shared/constants/navigation';
import { useUI } from '../../shared/context/UIContext';
import { useAuth } from '../../shared/context/AuthContext';
import { OptimileLogo } from './OptimileLogo';
import { ERPModule } from '../../shared/types';

export const Sidebar: React.FC = () => {
  const { sidebarOpen, closeSidebar } = useUI();
  const { hasPermission, hasModuleAccess, tenant } = useAuth();
  const location = useLocation();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  // Filter sections based on tenant license + user module access
  const visibleSections = NAV_SECTIONS.filter(section => {
    return hasModuleAccess(section.module);
  }).map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (!item.requiredPermissions) return true;
      return hasPermission(item.requiredPermissions);
    }),
  })).filter(section => section.items.length > 0);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-gray-600 bg-opacity-75 transition-opacity lg:hidden ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:shadow-none border-r border-gray-200 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 bg-primary text-white shrink-0">
          <div className="flex items-center space-x-2">
            <OptimileLogo className="h-10 w-auto text-white" />
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-1 rounded-md hover:bg-white/10"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tenant name */}
        {tenant && (
          <div className="px-5 py-2 bg-primary/5 border-b border-gray-200">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">
              {tenant.name}
            </p>
          </div>
        )}

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {visibleSections.map((section) => {
            const isCollapsed = collapsedSections.has(section.title);
            const isActiveSection = section.items.some(item =>
              location.pathname.startsWith(item.path)
            );

            return (
              <div key={section.title} className="mb-2">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.title)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-colors ${
                    isActiveSection
                      ? 'text-primary bg-primary/5'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span>{section.title}</span>
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>

                {/* Section items */}
                {!isCollapsed && (
                  <div className="space-y-0.5 mt-1">
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => {
                            if (window.innerWidth < 1024) closeSidebar();
                          }}
                          className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <Icon
                            className={`mr-3 h-4 w-4 flex-shrink-0 transition-colors ${
                              isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-200 p-4">
          <div className="text-xs text-gray-400">
            &copy; 2025 Optimile ERP <br /> v1.0.0
          </div>
        </div>
      </div>
    </>
  );
};
