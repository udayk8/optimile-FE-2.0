import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, LogOut } from 'lucide-react'
import type { ModuleManifest } from './types'

export interface ShellUser {
  name?: string
  email?: string
  role?: string
}

interface TopbarProps {
  modules: ModuleManifest[]
  user: ShellUser | null
  onLogout: () => void
  notificationCount?: number
}

function getCrumb(modules: ModuleManifest[], pathname: string): { moduleLabel: string; pageLabel: string } | null {
  const mod = modules.find((m) => pathname === m.basePath || pathname.startsWith(m.basePath + '/'))
  if (!mod) return null
  let best = mod.sidebar[0]
  for (const item of mod.sidebar) {
    if (pathname === item.path || pathname.startsWith(item.path + '/')) {
      if (!best || item.path.length > best.path.length) best = item
    }
  }
  return { moduleLabel: mod.label, pageLabel: best?.label ?? mod.label }
}

export function ShellTopbar({ modules, user, onLogout, notificationCount = 0 }: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const crumb = getCrumb(modules, location.pathname)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    if (notifOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  const displayName = user?.name ?? user?.email ?? 'User'
  const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const roleLine = (user?.role ?? '').toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between gap-6 border-b border-gray-200 bg-white px-8">
      {/* Left — crumb */}
      <div className="flex min-w-0 items-baseline gap-2">
        {crumb && (
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
            {crumb.moduleLabel}
          </p>
        )}
        {crumb && <span className="text-gray-300">/</span>}
        <h1 className="truncate text-[16px] font-bold leading-tight text-text">
          {crumb?.pageLabel ?? 'Dashboard'}
        </h1>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-4">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {notificationCount > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-[340px] rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
              <p className="text-sm font-semibold text-text">Notifications</p>
              <p className="mt-2 text-xs text-gray-500">
                {notificationCount > 0 ? `${notificationCount} unread` : 'No new alerts.'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-[13px] font-semibold text-text">{displayName}</div>
            {roleLine && (
              <div className="text-[10px] font-bold tracking-[0.12em] text-gray-400">
                {roleLine}
              </div>
            )}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {initials}
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
