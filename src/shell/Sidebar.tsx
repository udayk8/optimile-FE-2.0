import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, X } from 'lucide-react'
import { OptimileLogo } from '@shared-auth'
import { MODULE_MANIFESTS } from './registry'
import type { ModuleManifest } from './manifest'

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation()

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
          border-r border-border bg-sidebar shadow-elevated
          transition-transform duration-300 ease-out
          md:sticky md:top-0 md:z-30 md:h-screen md:shadow-none
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex h-[var(--shell-topbar-height)] items-center gap-3 border-b border-border px-5">
          <OptimileLogo className="text-primary" style={{ height: 26, width: 'auto', display: 'block' }} />
          <button
            type="button"
            onClick={onMobileClose}
            className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="shell-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {MODULE_MANIFESTS.map((manifest) => (
            <ModuleSection
              expanded={!!expanded[manifest.key]}
              key={manifest.key}
              manifest={manifest}
              onToggle={() => toggle(manifest.key)}
            />
          ))}
        </nav>

        <div className="border-t border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Optimile ERP · v2.0
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
  const Icon = manifest.icon
  const isActiveModule = location.pathname.startsWith(manifest.basePath)

  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        className={`
          group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm transition-colors
          ${isActiveModule
            ? 'bg-primary/[0.08] text-primary'
            : 'text-foreground/80 hover:bg-muted hover:text-foreground'}
        `}
      >
        <span
          className={`
            flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors
            ${isActiveModule
              ? 'bg-primary text-primary-foreground shadow-soft'
              : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}
          `}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1 text-left font-semibold leading-tight">
          <span className="block truncate">{manifest.label}</span>
          <span className="block text-[11px] font-medium text-muted-foreground">
            {manifest.sidebar.length} screen{manifest.sidebar.length === 1 ? '' : 's'}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            expanded ? '' : '-rotate-90'
          }`}
        />
      </button>

      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="ml-5 mt-1 space-y-0.5 border-l border-border pl-3">
            {manifest.sidebar.map((tab) => (
              <NavLink
                end={tab.path === manifest.basePath}
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
