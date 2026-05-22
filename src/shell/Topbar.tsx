import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Menu, Search, User as UserIcon } from 'lucide-react'
import { useAuth } from '@shared-auth'

interface TopbarProps {
  onMobileMenuClick: () => void
}

export function Topbar({ onMobileMenuClick }: TopbarProps) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
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

  const displayName = user?.name ?? 'User'
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const roleLine = [user?.role, user?.department].filter(Boolean).join(' • ').toUpperCase()

  return (
    <header
      className="
        sticky top-0 z-20 flex h-[var(--shell-topbar-height)] items-center gap-3
        border-b border-border bg-card/85 px-4 backdrop-blur-md
        supports-[backdrop-filter]:bg-card/75 sm:px-6
      "
    >
      <button
        type="button"
        onClick={onMobileMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search — claims the main bar */}
      <div className="relative flex-1 max-w-2xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search across modules…"
          className="
            h-10 w-full rounded-full border border-border bg-muted/50 pl-10 pr-12 text-sm
            text-foreground placeholder:text-muted-foreground outline-none transition
            focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/15
          "
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:block">
          ⌘K
        </kbd>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-primary"
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
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">No new alerts.</div>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-full border border-border bg-card py-1 pl-3 pr-1 transition hover:border-primary/30 sm:gap-3"
            aria-expanded={menuOpen}
          >
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-[13px] font-semibold text-foreground">{displayName}</div>
              {roleLine && (
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {roleLine}
                </div>
              )}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary-500 text-xs font-extrabold text-primary-foreground shadow-soft">
              {initials || <UserIcon className="h-4 w-4" />}
            </div>
            <ChevronDown className="hidden h-4 w-4 pr-1 text-muted-foreground sm:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-elevated">
              <div className="border-b border-border bg-gradient-to-br from-primary/8 to-transparent px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary-500 text-sm font-extrabold text-primary-foreground">
                    {initials || <UserIcon className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email ?? ''}</p>
                  </div>
                </div>
                {(user?.role || user?.department) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {user?.role && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        {user.role}
                      </span>
                    )}
                    {user?.department && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {user.department}
                      </span>
                    )}
                  </div>
                )}
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
