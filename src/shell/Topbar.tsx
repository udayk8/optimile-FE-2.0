import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Search } from 'lucide-react'
import { useAuth } from '@shared-auth'
import { MODULE_MANIFESTS } from './registry'

function findActiveLabels(pathname: string) {
  const manifest = MODULE_MANIFESTS.find((m) => pathname.startsWith(m.basePath))
  if (!manifest) return { module: 'Home', tab: '' }
  const tab = [...manifest.sidebar]
    .sort((a, b) => b.path.length - a.path.length)
    .find((t) => pathname === t.path || pathname.startsWith(`${t.path}/`))
  return { module: manifest.label, tab: tab?.label ?? '' }
}

export function Topbar() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const { module: activeModule, tab: activeTab } = findActiveLabels(location.pathname)
  const initial = (user?.name ?? 'U').charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-4 border-b border-gray-200 bg-white px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-[13px] font-medium text-gray-500">{activeModule}</span>
        {activeTab && (
          <>
            <span className="text-gray-300">/</span>
            <h2 className="truncate text-[15px] font-semibold text-text">{activeTab}</h2>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search…"
            className="h-9 w-[280px] rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 transition hover:bg-gray-50"
            aria-expanded={menuOpen}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">
              {initial}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-[12px] font-semibold leading-tight text-text">{user?.name ?? 'User'}</div>
              <div className="text-[11px] leading-tight text-gray-500">{user?.role ?? ''}</div>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-text">{user?.name ?? 'User'}</p>
                <p className="truncate text-xs text-gray-500">{user?.email ?? ''}</p>
                {user?.role && <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-primary">{user.role}</p>}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 text-gray-500" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
