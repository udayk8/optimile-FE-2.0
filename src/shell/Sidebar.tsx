import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { OptimileLogo } from '@shared-auth'
import { MODULE_MANIFESTS } from './registry'
import type { ModuleManifest } from './manifest'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
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
    <aside
      className={`sticky top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-[260px]'
      }`}
    >
      <div className={`flex h-[68px] items-center gap-3 border-b border-gray-200 ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
        {collapsed ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-white">O</div>
        ) : (
          <OptimileLogo className="text-primary" style={{ height: 26, width: 'auto', display: 'block' }} />
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {MODULE_MANIFESTS.map((manifest) => (
          <ModuleSection
            collapsed={collapsed}
            expanded={!!expanded[manifest.key]}
            key={manifest.key}
            manifest={manifest}
            onToggle={() => toggle(manifest.key)}
          />
        ))}
      </nav>

      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex h-12 items-center justify-center border-t border-gray-200 text-gray-500 transition-colors hover:text-gray-700"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  )
}

function ModuleSection({
  collapsed,
  expanded,
  manifest,
  onToggle,
}: {
  collapsed: boolean
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
        title={collapsed ? manifest.label : undefined}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          isActiveModule ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'
        } ${collapsed ? 'justify-center px-0' : ''}`}
      >
        <Icon className={`h-5 w-5 shrink-0 ${isActiveModule ? 'text-primary' : 'text-gray-400'}`} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left font-semibold">{manifest.label}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? '' : '-rotate-90'}`}
            />
          </>
        )}
      </button>

      {!collapsed && expanded && (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-gray-200 pl-2">
          {manifest.sidebar.map((tab) => (
            <NavLink
              end={tab.path === manifest.basePath}
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-text'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      )}
    </section>
  )
}
