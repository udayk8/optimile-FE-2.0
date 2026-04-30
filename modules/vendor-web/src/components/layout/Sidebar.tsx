import { NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  Search,
  FileText,
  Truck,
  Ship,
  Receipt,
  ReceiptText,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@vendor/lib/cn'
import { useUIStore } from '@vendor/stores/ui.store'

const NAV_ITEMS = [
  { path: '/home', label: 'Home', subtitle: 'Executive overview', icon: Home },
  { path: '/sourcing', label: 'Sourcing', subtitle: 'Auctions and bids', icon: Search },
  { path: '/contracts', label: 'Contracts', subtitle: 'Active agreements', icon: FileText },
  { path: '/trips', label: 'Trips', subtitle: 'Indents and deliveries', icon: Truck },
  { path: '/fleet', label: 'Fleet', subtitle: 'Vehicles and drivers', icon: Ship },
  { path: '/expenses', label: 'Expenses', subtitle: 'Trip-linked costs', icon: Receipt },
  { path: '/invoices', label: 'Invoices', subtitle: 'Billing and payments', icon: ReceiptText },
  { path: '/profile', label: 'Profile', subtitle: 'Company settings', icon: User },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const location = useLocation()

  return (
    <aside
      className={cn(
        'flex flex-col bg-white border-r border-[#E5E7EB] transition-all duration-300 h-screen sticky top-0 z-40',
        sidebarCollapsed ? 'w-16' : 'w-[270px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-[68px] px-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
            VP
          </div>
          {!sidebarCollapsed && (
            <div>
              <span className="text-sm font-semibold text-[#0F172A] tracking-tight">Vendor Portal</span>
              <p className="text-[11px] text-[#94A3B8] leading-tight">Optimile ERP</p>
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
                  ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                  : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-[#2563EB]' : 'text-[#94A3B8]')} />
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="truncate leading-tight">{item.label}</div>
                  <div className={cn('text-[11px] truncate leading-tight mt-0.5', isActive ? 'text-[#2563EB]/60' : 'text-[#94A3B8]')}>
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
        className="flex items-center justify-center h-12 border-t border-[#E5E7EB] text-[#94A3B8] hover:text-[#475569] transition-colors"
      >
        {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  )
}
