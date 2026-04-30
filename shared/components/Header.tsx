import React, { useEffect, useRef, useState } from 'react';
import { Menu, Bell, Search, User as UserIcon, LogOut, Building2 } from 'lucide-react';
import { useUI } from '../../shared/context/UIContext';
import { useAuth } from '../../shared/context/AuthContext';
import { useToast } from '../../shared/context/ToastContext';

export const Header: React.FC = () => {
  const { toggleSidebar } = useUI();
  const { user, tenant, logout } = useAuth();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (menuRef.current?.contains(target) || menuButtonRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-30 relative shrink-0">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Search */}
        <div className="hidden sm:flex ml-4 lg:ml-0 relative rounded-md shadow-sm max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="Search across modules..."
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="p-1.5 rounded-full text-gray-400 hover:text-gray-500 relative">
          <Bell className="h-6 w-6" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger border-2 border-white"></span>
        </button>

        {/* User info */}
        <div className="relative flex items-center space-x-3 border-l border-gray-200 pl-4 ml-2">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-gray-700">{user?.name}</p>
            <p className="text-xs text-gray-500 uppercase">{user?.role} • {user?.department}</p>
          </div>
          <div className="relative">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen(open => !open)}
              className="flex text-sm border-2 border-transparent rounded-full"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Open user menu"
            >
              {user?.avatarUrl ? (
                <img className="h-8 w-8 rounded-full object-cover" src={user.avatarUrl} alt={user.name} />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <UserIcon className="h-5 w-5" />
                </div>
              )}
            </button>
            <div
              ref={menuRef}
              className={`absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50 ${menuOpen ? 'block' : 'hidden'}`}
            >
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {tenant?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  showToast({ type: 'info', title: 'Profile', message: 'User profile settings coming soon.' });
                }}
                className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Your Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
