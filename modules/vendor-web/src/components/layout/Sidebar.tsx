import { NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  Search,
  FileText,
  Truck,
  Receipt,
  Ship,
  CreditCard,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { getAllowedModules } from '@shared-auth'
import { cn } from '@vendor/utils/cn'
import { useUIStore } from '@vendor/stores/ui.store'

const NAV_ITEMS = [
  { path: '/vendor/dashboard', label: 'Home', subtitle: 'Executive overview', icon: Home, module: 'dashboard' },
  { path: '/vendor/sourcing', label: 'Sourcing', subtitle: 'Auctions and bids', icon: Search, module: 'sourcing' },
  { path: '/vendor/contracts', label: 'Contracts', subtitle: 'Active agreements', icon: FileText, module: 'contracts' },
  { path: '/vendor/trips', label: 'Trips', subtitle: 'Indents and deliveries', icon: Truck, module: 'trips' },
  { path: '/vendor/expenses', label: 'Expenses', subtitle: 'Trip-linked costs', icon: Receipt, module: 'expenses' },
  { path: '/vendor/fleet', label: 'Fleet', subtitle: 'Vehicles and drivers', icon: Ship, module: 'fleet' },
  { path: '/vendor/invoices', label: 'Invoices', subtitle: 'Billing and payments', icon: CreditCard, module: 'invoices' },
  { path: '/vendor/profile', label: 'Profile', subtitle: 'Company settings', icon: User, module: 'profile' },
] as const

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const location = useLocation()

  return (
    <aside
      className={cn(
        'sticky top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300',
        sidebarCollapsed ? 'w-20' : 'w-80'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
            VP
          </div>
          {!sidebarCollapsed && (
            <div>
              <span className="text-sm font-bold text-text">Vendor Portal</span>
              <p className="text-[11px] leading-tight text-gray-500">Optimile ERP</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-2.5 py-3">
        {getAllowedModules(NAV_ITEMS).map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg border-l-4 px-3 py-3 text-sm transition-colors',
                isActive
                  ? 'border-l-primary bg-primary/10 font-bold text-primary shadow-sm'
                  : 'border-l-transparent text-gray-600 hover:border-l-gray-300 hover:bg-gray-50 hover:text-primary'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-primary' : 'text-gray-400')} />
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="truncate leading-tight">{item.label}</div>
                  <div className={cn('mt-0.5 truncate text-[11px] leading-tight', isActive ? 'text-primary/70' : 'text-gray-500')}>
                    {item.subtitle}
                  </div>
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex h-12 items-center justify-center border-t border-gray-200 text-gray-500 transition-colors hover:text-primary"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  )
}
