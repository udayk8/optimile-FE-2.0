import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Menu, Search, User as UserIcon } from 'lucide-react'
import { useAuth } from '@shared-auth'
import { MODULE_MANIFESTS } from './registry'

interface TopbarProps {
  onMobileMenuClick: () => void
}

function findActiveLabels(pathname: string) {
  const manifest = MODULE_MANIFESTS.find((m) => pathname.startsWith(m.basePath))
  if (!manifest) return { module: 'Home', tab: '' }
  const tab = [...manifest.sidebar]
    .sort((a, b) => b.path.length - a.path.length)
    .find((t) => pathname === t.path || pathname.startsWith(`${t.path}/`))
  return { module: manifest.label, tab: tab?.label ?? '' }
}

export function Topbar({ onMobileMenuClick }: TopbarProps) {
  const { logout, tenant, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
      if (!notifRef.current?.contains(event.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const { module: activeModule, tab: activeTab } = findActiveLabels(location.pathname)
  const displayName = user?.name ?? 'User'
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header
      className="
        sticky top-0 z-20 flex h-[var(--shell-topbar-height)] items-center justify-between gap-3
        border-b border-border bg-card/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-card/70
        sm:px-6
      "
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {activeModule}
          </p>
          <h2 className="truncate text-[15px] font-semibold leading-tight text-foreground">
            {activeTab || 'Overview'}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search anything…"
            className="
              h-10 w-[280px] rounded-xl border border-border bg-muted/60 pl-10 pr-3 text-sm
              text-foreground placeholder:text-muted-foreground outline-none transition
              focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/15
              lg:w-[340px]
            "
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground lg:block">
            ⌘K
          </kbd>
        </div>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-primary"
            aria-label="Notifications"
            aria-expanded={notifOpen}
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-card" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-elevated">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                <p className="text-xs text-muted-foreground">You are all caught up.</p>
              </div>
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                No new alerts.
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-1.5 py-1.5 pr-2.5 transition hover:border-primary/30 sm:gap-3 sm:pr-3"
            aria-expanded={menuOpen}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-xs font-extrabold text-primary-foreground shadow-soft">
              {initials || <UserIcon className="h-4 w-4" />}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-[12px] font-semibold leading-tight text-foreground">{displayName}</div>
              <div className="text-[11px] leading-tight text-muted-foreground">{user?.role ?? ''}</div>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-elevated">
              <div className="border-b border-border bg-gradient-to-br from-primary/8 to-transparent px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-sm font-extrabold text-primary-foreground">
                    {initials || <UserIcon className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email ?? ''}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {user?.role && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                      {user.role}
                    </span>
                  )}
                  {tenant?.name && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {tenant.name}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
