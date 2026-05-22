import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight, Circle, X } from 'lucide-react'
import { OptimileLogo, useAuth } from '@shared-auth'
import { MODULE_MANIFESTS } from './registry'
import type { ModuleManifest } from './manifest'

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation()
  const { tenant } = useAuth()

  const activeModuleKey = useMemo(
    () => MODULE_MANIFESTS.find((m) => location.pathname.startsWith(m.basePath))?.key,
    [location.pathname],
  )

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    MODULE_MANIFESTS.forEach((m) => {
      init[m.key] = location.pathname.startsWith(m.basePath)
    })
    return init
  })

  useEffect(() => {
    if (!activeModuleKey) return
    setExpanded((state) => (state[activeModuleKey] ? state : { ...state, [activeModuleKey]: true }))
  }, [activeModuleKey])

  const toggle = (key: string) => setExpanded((s) => ({ ...s, [key]: !s[key] }))

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onMobileClose}
          className="fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-[var(--shell-sidebar-width)] flex-col
          border-r border-border bg-card shadow-elevated
          transition-transform duration-300 ease-out
          md:sticky md:top-0 md:z-30 md:h-screen md:shadow-none
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo band — navy */}
        <div className="flex h-[var(--shell-topbar-height)] items-center justify-between gap-3 bg-primary px-5 text-primary-foreground">
          <OptimileLogo className="text-white" style={{ height: 28, width: 'auto', display: 'block' }} />
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-lg p-1.5 text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tenant band */}
        <div className="border-b border-border bg-primary-50/40 px-5 py-2.5">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            {tenant?.name ?? 'Optimile Demo'}
          </p>
        </div>

        {/* Nav */}
        <nav className="shell-scroll flex-1 space-y-0.5 overflow-y-auto py-3">
          {MODULE_MANIFESTS.map((manifest) => (
            <ModuleSection
              expanded={!!expanded[manifest.key]}
              key={manifest.key}
              manifest={manifest}
              onToggle={() => toggle(manifest.key)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border bg-muted/40 px-5 py-3 text-[11px] leading-tight text-muted-foreground">
          © {new Date().getFullYear()} Optimile ERP
          <span className="block text-[10px] font-medium text-muted-foreground/80">v2.0.0</span>
        </div>
      </aside>
    </>
  )
}

function ModuleSection({
  expanded,
  manifest,
  onToggle,
}: {
  expanded: boolean
  manifest: ModuleManifest
  onToggle: () => void
}) {
  const location = useLocation()
  const isActiveModule = location.pathname.startsWith(manifest.basePath)
  const ModuleIcon = manifest.icon

  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        className={`
          group flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors
          ${isActiveModule
            ? 'bg-primary-50/60 text-primary'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}
        `}
      >
        <ModuleIcon
          className={`h-[15px] w-[15px] shrink-0 ${
            isActiveModule ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
          }`}
        />
        <span className="flex-1 truncate text-[11px] font-bold uppercase tracking-[0.14em]">
          {manifest.label}
        </span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>

      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-px py-0.5">
            {manifest.sidebar.map((tab) => (
              <SidebarTabLink basePath={manifest.basePath} key={tab.path} tab={tab} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function SidebarTabLink({ basePath, tab }: { basePath: string; tab: { label: string; path: string; icon?: React.ComponentType<{ className?: string }> } }) {
  const Icon = tab.icon ?? Circle
  return (
    <NavLink
      end={tab.path === basePath}
      to={tab.path}
      className={({ isActive }) =>
        `relative flex items-center gap-3 py-2 pl-8 pr-5 text-[13px] transition-colors ${
          isActive
            ? 'bg-primary-50 font-semibold text-primary'
            : 'text-foreground/75 hover:bg-muted/60 hover:text-foreground'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-primary" />}
          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="truncate">{tab.label}</span>
        </>
      )}
    </NavLink>
  )
}
