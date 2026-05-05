import { NavLink, useLocation } from 'react-router-dom'
import { Home, Truck, Ship, MoreHorizontal, Search, FileText, User, X } from 'lucide-react'
import { cn } from '@vendor/lib/cn'
import { useUIStore } from '@vendor/stores/ui.store'

const BOTTOM_NAV = [
  { path: '/vendor', label: 'Home', icon: Home },
  { path: '/vendor/bookings', label: 'Bookings', icon: Truck },
  { path: '/vendor/fleet', label: 'Fleet', icon: Ship },
]

const MORE_NAV = [
  { path: '/vendor/sourcing', label: 'Sourcing', icon: Search },
  { path: '/vendor/contracts', label: 'Contracts', icon: FileText },
  { path: '/vendor/profile', label: 'Profile', icon: User },
]

export function MobileNav() {
  const { mobileNavOpen, setMobileNavOpen } = useUIStore()
  const location = useLocation()

  const isMoreActive = MORE_NAV.some((item) => location.pathname.startsWith(item.path))

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-gray-200 bg-white/95 px-2 backdrop-blur md:hidden">
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg text-xs transition-colors',
                isActive ? 'bg-primary/10 font-semibold text-primary' : 'text-gray-500'
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
            isMoreActive ? 'bg-primary/10 font-semibold text-primary' : 'text-gray-500'
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
          <div className="absolute bottom-0 left-0 right-0 rounded-t-xl bg-white p-4 pb-8 animate-slide-in shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text">More</h3>
              <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" onClick={() => setMobileNavOpen(false)}>
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
                      isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50 hover:text-primary'
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs font-semibold">{item.label}</span>
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
