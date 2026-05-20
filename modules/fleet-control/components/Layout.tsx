import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AppNotification } from '../src/app/FleetApp';
import {
  IconDashboard,
  IconTruck,
  IconUsers,
  IconMap,
  IconWrench,
  IconFuel,
  IconCircleDollar,
  IconTyre,
  IconGlobe,
  IconFile,
  IconZap,
  IconBell,
  IconChart,
  IconClipboardCheck,
  IconDatabase,
  IconBox,
  IconBriefcase,
  IconMechanic,
  IconMenu,
  IconX,
  IconBattery,
} from './Icons';
import Logo from '../customer_logo.jpeg';
import { useAuth } from '@shared-auth';

export type Tab =
  | 'dashboard'
  | 'live-map'
  | 'fleet'
  | 'drivers'
  | 'dispatch'
  | 'maintenance'
  | 'fuel'
  | 'cost'
  | 'compliance'
  | 'behavior'
  | 'tyres'
  | 'exceptions'
  | 'ops-intel'
  | 'coverage'
  | 'reconciliation'
  | 'inventory'
  | 'vendors'
  | 'garage'
  | 'batteries'
  | 'settings'
  | 'marketplace';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: Tab;
  onNavigate: (tab: Tab) => void;
  notifications?: AppNotification[];
}

interface NavItem {
  id: Tab;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  /** Full path after /fleet/ — when set, used for navigation and active detection */
  path?: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { id: 'dashboard',      label: 'Dashboard',        icon: IconDashboard },
      { id: 'ops-intel',      label: 'Ops Intelligence', icon: IconChart },
      { id: 'exceptions',     label: 'Exception Center', icon: IconBell },
      // { id: 'coverage',       label: 'Data Coverage',    icon: IconDatabase },
      // { id: 'reconciliation', label: 'Reconciliation',   icon: IconClipboardCheck },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'live-map', label: 'Live Map',         icon: IconMap },
      { id: 'dispatch', label: 'Dispatch Console', icon: IconGlobe },
    ],
  },
  {
    label: 'Assets',
    items: [
      { id: 'fleet',        label: 'Fleet Management',  icon: IconTruck },
      { id: 'drivers',      label: 'Driver Management', icon: IconUsers },
      { id: 'marketplace',  label: 'Marketplace',       icon: IconBriefcase },
      { id: 'compliance',   label: 'Compliance',        icon: IconFile },
      { id: 'behavior',     label: 'Driver Behavior',   icon: IconZap },
    ],
  },
  {
    label: 'Service',
    items: [
      { id: 'maintenance', label: 'Maintenance', icon: IconWrench },
      { id: 'garage',      label: 'Garage',      icon: IconMechanic },
      // { id: 'batteries', label: 'Battery Mgmt', icon: IconBattery },
    ],
  },
  {
    label: 'Tyre Management',
    items: [
      { id: 'tyres', path: 'tyres',             label: 'Overview',            icon: IconTyre },
      { id: 'tyres', path: 'tyres/inventory',   label: 'Tyre Inventory',      icon: IconBox },
      { id: 'tyres', path: 'tyres/tracker',     label: 'Tyre Visual Tracker', icon: IconGlobe },
      { id: 'tyres', path: 'tyres/indents',     label: 'Indents',             icon: IconClipboardCheck },
      { id: 'tyres', path: 'tyres/inspections', label: 'Tyre Inspections', icon: IconFile },
      { id: 'tyres', path: 'tyres/jobs',        label: 'Tyre Job Cards',   icon: IconMechanic },
    ],
  },
  {
    label: 'Logistics',
    items: [
      { id: 'inventory', label: 'Inventory', icon: IconBox },
      // { id: 'vendors', label: 'Vendor & Ledger', icon: IconBriefcase },
      // { id: 'fuel',    label: 'Fuel & Energy',   icon: IconFuel },
      // { id: 'cost',    label: 'Cost Health',     icon: IconCircleDollar },
    ],
  },
  // {
  //   label: 'System',
  //   items: [
  //     { id: 'settings', label: 'Settings', icon: IconWrench },
  //   ],
  // },
];

const severityDot: Record<string, string> = {
  Critical: 'bg-red-500',
  High:     'bg-orange-400',
  Medium:   'bg-amber-400',
  Low:      'bg-blue-400',
};

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onNavigate, notifications = [] }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isNotifOpen]);

  // Navigate to a specific notification — passes the ID as router state so
  // AlertManagementPage can scroll to and highlight that exact row.
  const handleNotifItemClick = (notif: AppNotification) => {
    setIsNotifOpen(false);
    navigate('/fleet/exceptions', { state: { highlightId: notif.id } });
  };

  const handleNotifClick = (tab: Tab) => {
    setIsNotifOpen(false);
    onNavigate(tab);
  };

  const displayName = user?.name ?? user?.email ?? 'Fleet User';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const role = (user?.role ?? 'Fleet Manager').replace(/-/g, ' ');

  const handleNav = (item: NavItem) => {
    if (item.path) {
      navigate(`/fleet/${item.path}`);
    } else {
      onNavigate(item.id);
    }
    setIsMobileMenuOpen(false);
  };

  const isItemActive = (item: NavItem): boolean => {
    if (item.path) {
      return location.pathname === `/fleet/${item.path}`;
    }
    return activeTab === item.id;
  };

  const NavLinks = () => (
    <nav className="flex-1 overflow-y-auto px-2">
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
          {group.label && (
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = isItemActive(item);
              return (
                <button
                  key={item.path ?? item.id}
                  onClick={() => handleNav(item)}
                  className={`group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-4 w-4 flex-shrink-0 ${
                      isActive
                        ? 'text-primary-600'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const userProfile = (
    <div className="flex-shrink-0 border-t border-gray-200 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-700">{displayName}</p>
          <p className="truncate text-xs capitalize text-gray-400">{role}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Mobile header ──────────────────────────────────────────────── */}
      <div className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm md:hidden">
        <img src={Logo} alt="Optimile" className="h-8 w-auto object-contain" />
        <div className="flex items-center gap-1">
          {/* Bell — mobile */}
          <button
            onClick={() => setIsNotifOpen((v) => !v)}
            className="relative rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Notifications"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifications.length > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                {notifications.length > 99 ? '99+' : notifications.length}
              </span>
            )}
          </button>
          <button
            onClick={logout}
            title="Sign out"
            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-md p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <IconMenu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── Mobile sidebar overlay ─────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 flex md:hidden">
          <div
            className="fixed inset-0 bg-gray-600/75 transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex h-full w-72 max-w-xs flex-col bg-white">
            <div className="absolute -right-12 top-2">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <IconX className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-shrink-0 px-4 py-5">
              <img src={Logo} alt="Optimile" className="h-8 w-auto object-contain" />
              <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">
                Powered by Optimile
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
              <NavLinks />
            </div>
            {userProfile}
          </div>
          <div className="w-14 flex-shrink-0" />
        </div>
      )}

      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex w-56 flex-col border-r border-gray-200 bg-white">
          <div className="flex-shrink-0 px-4 pb-3 pt-5">
            <img src={Logo} alt="Optimile" className="h-8 w-auto object-contain" />
            <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">
              Powered by Optimile
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            <NavLinks />
          </div>
          {userProfile}
        </div>
      </aside>

      {/* ── Main content area ──────────────────────────────────────────── */}
      <div className="flex w-0 flex-1 flex-col overflow-hidden pt-14 md:pt-0">
        <div className="hidden h-12 flex-shrink-0 items-center justify-end gap-2 border-b border-gray-200 bg-white px-6 md:flex">

          {/* Notification bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setIsNotifOpen((v) => !v)}
              className="relative rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Notifications"
            >
              {/* Bell icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Badge */}
              {notifications.length > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                  {notifications.length > 99 ? '99+' : notifications.length}
                </span>
              )}
            </button>

            {/* Dropdown panel */}
            {isNotifOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">Notifications</span>
                    {notifications.length > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                        {notifications.length} open
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsNotifOpen(false)}
                    className="rounded p-0.5 text-gray-400 hover:text-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <p className="text-sm font-medium text-gray-500">All clear</p>
                      <p className="text-xs text-gray-400">No open exceptions</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifItemClick(n)}
                        className="flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-gray-50"
                      >
                        <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${severityDot[n.severity] ?? 'bg-gray-400'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-gray-700">{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-400">{n.description}</p>
                        </div>
                        <span className={`mt-0.5 flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          n.severity === 'Critical' ? 'bg-red-100 text-red-600' :
                          n.severity === 'High'     ? 'bg-orange-100 text-orange-600' :
                          n.severity === 'Medium'   ? 'bg-amber-100 text-amber-600' :
                                                      'bg-blue-100 text-blue-600'
                        }`}>
                          {n.severity}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-2.5">
                    <button
                      onClick={() => handleNotifClick('exceptions')}
                      className="w-full text-center text-xs font-semibold text-primary-600 hover:text-primary-800"
                    >
                      View all exceptions →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={logout}
            title="Sign out"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            Sign out
          </button>
        </div>
        <main className="scrollbar-hide relative flex-1 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
