import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FileText, Gavel, LayoutDashboard } from 'lucide-react'
import { cn } from '@auction/lib/cn'
import { useUIStore } from '@auction/stores/ui.store'

const NAV_ITEMS = [
  { path: '/auction/dashboard', label: 'Dashboard', subtitle: 'Operational overview', icon: LayoutDashboard },
  { path: '/auction/auctions', label: 'Auctions', subtitle: 'Create, monitor, award', icon: Gavel },
  { path: '/auction/contracts', label: 'Contracts', subtitle: 'Award outputs and status', icon: FileText },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const location = useLocation()

  return (
    <aside
      className={cn(
        'sticky top-0 z-40 flex h-screen flex-col border-r border-[#E5E7EB] bg-white transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-[270px]'
      )}
    >
      <div className="flex h-[68px] items-center border-b border-[#E5E7EB] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
            AW
          </div>
          {!sidebarCollapsed && (
            <div>
              <span className="text-sm font-semibold tracking-tight text-[#0F172A]">Auction Web App</span>
              <p className="text-[11px] leading-tight text-[#94A3B8]">Optimile AMS</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-2.5 py-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200',
                isActive
                  ? 'bg-[#EFF6FF] font-semibold text-[#2563EB]'
                  : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-[#2563EB]' : 'text-[#94A3B8]')} />
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="truncate leading-tight">{item.label}</div>
                  <div className={cn('mt-0.5 truncate text-[11px] leading-tight', isActive ? 'text-[#2563EB]/60' : 'text-[#94A3B8]')}>
                    {item.subtitle}
                  </div>
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      <button
        onClick={toggleSidebar}
        className="flex h-12 items-center justify-center border-t border-[#E5E7EB] text-[#94A3B8] transition-colors hover:text-[#475569]"
      >
        {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  )
}
