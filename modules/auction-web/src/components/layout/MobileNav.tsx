import { NavLink, useLocation } from 'react-router-dom'
import { Home, Truck, Receipt, CreditCard, MoreHorizontal, Search, FileText, Ship, User, X } from 'lucide-react'
import { cn } from '@auction/lib/cn'
import { useUIStore } from '@auction/stores/ui.store'

const BOTTOM_NAV = [
  { path: '/auction/dashboard', label: 'Home', icon: Home },
  { path: '/auction/auctions', label: 'Auctions', icon: Truck },
  { path: '/auction/contracts', label: 'Contracts', icon: Receipt },
  { path: '/auction/auctions/new', label: 'Create', icon: CreditCard },
]

const MORE_NAV = [
  { path: '/auction/auctions', label: 'Sourcing', icon: Search },
  { path: '/auction/contracts', label: 'Contracts', icon: FileText },
  { path: '/auction/dashboard', label: 'Fleet', icon: Ship },
  { path: '/auction/dashboard', label: 'Profile', icon: User },
]

export function MobileNav() {
  const { mobileNavOpen, setMobileNavOpen } = useUIStore()
  const location = useLocation()

  const isMoreActive = MORE_NAV.some((item) => location.pathname.startsWith(item.path))

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t flex items-center justify-around h-16 px-2">
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg text-xs transition-colors',
                isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
        <button
          onClick={() => setMobileNavOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg text-xs transition-colors',
            isMoreActive ? 'text-primary font-semibold' : 'text-muted-foreground'
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>

      {/* More sheet overlay */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl p-4 pb-8 animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">More</h3>
              <button onClick={() => setMobileNavOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {MORE_NAV.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname.startsWith(item.path)
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground'
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
