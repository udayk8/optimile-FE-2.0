import { NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  Search,
  FileText,
  Truck,
  Ship,
  CreditCard,
  User,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Banknote,
  ReceiptText,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@vendor/lib/cn'
import { useUIStore } from '@vendor/stores/ui.store'

const NAV_ITEMS = [
  { path: '/vendor', label: 'Home', subtitle: 'Executive overview', icon: Home },
  { path: '/vendor/sourcing', label: 'Sourcing', subtitle: 'Auctions and bids', icon: Search },
  { path: '/vendor/contracts', label: 'Contracts', subtitle: 'Active agreements', icon: FileText },
  { path: '/vendor/bookings', label: 'Bookings', subtitle: 'Indents and deliveries', icon: Truck },
  { path: '/vendor/fleet', label: 'Fleet', subtitle: 'Vehicles and drivers', icon: Ship },
  { path: '/vendor/invoices', label: 'Invoices', subtitle: 'Create and track bills', icon: CreditCard },
  { path: '/vendor/ledger', label: 'Ledger', subtitle: 'Invoices and payments', icon: Wallet },
  { path: '/vendor/ledger/payments', label: 'Payments', subtitle: 'Record invoice settlements', icon: ReceiptText },
  { path: '/vendor/nbfc', label: 'Bill Discounting', subtitle: 'Finance and partner applications', icon: Banknote },
  { path: '/vendor/exceptions', label: 'Exceptions', subtitle: 'Incidents and breakdowns', icon: ShieldAlert },
  { path: '/vendor/profile', label: 'Profile', subtitle: 'Company settings', icon: User },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const location = useLocation()

  return (
    <aside
      className={cn(
        'sticky top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-[270px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-[68px] items-center border-b border-gray-200 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
            VP
          </div>
          {!sidebarCollapsed && (
            <div>
              <span className="text-sm font-semibold tracking-tight text-text">Vendor Portal</span>
              <p className="text-[11px] leading-tight text-gray-500">Optimile ERP</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2.5 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-text'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <div className="relative shrink-0">
                <Icon className={cn('h-[18px] w-[18px]', isActive ? 'text-primary' : 'text-gray-400')} />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate leading-tight">{item.label}</span>
                  </div>
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
        className="flex h-12 items-center justify-center border-t border-gray-200 text-gray-500 transition-colors hover:text-gray-700"
      >
        {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  )
}
