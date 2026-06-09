import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { ModuleManifest } from './types'

interface SidebarProps {
  modules: ModuleManifest[]
  logo?: ReactNode
  tenantName?: string
  footer?: ReactNode
}

function findModuleForPath(modules: ModuleManifest[], pathname: string): string | undefined {
  return modules.find((m) => pathname === m.basePath || pathname.startsWith(m.basePath + '/'))?.key
}

export function ShellSidebar({ modules, logo, tenantName, footer }: SidebarProps) {
  const location = useLocation()
  const activeKey = findModuleForPath(modules, location.pathname)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(activeKey ? [activeKey] : []))
  // Collapsed = icon-only rail. Toggled ONLY by the button below — never on hover.
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (activeKey) {
      setExpanded((prev) => {
        if (prev.has(activeKey)) return prev
        const next = new Set(prev)
        next.add(activeKey)
        return next
      })
    }
  }, [activeKey])

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <aside
      className={`sticky top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white shadow-[1px_0_0_0_rgba(15,23,42,0.04)] transition-[width] duration-200 ${
        collapsed ? 'w-[76px]' : 'w-[268px]'
      }`}
    >
      {/* Brand band */}
      <div className="flex h-[64px] shrink-0 items-center justify-center bg-primary px-4">
        {collapsed ? (
          <span className="text-2xl font-bold tracking-tight text-white">O</span>
        ) : (
          logo ?? <span className="text-2xl font-bold tracking-tight text-white">Optimile</span>
        )}
      </div>

      {/* Collapse / expand toggle — click only */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expand menu' : 'Collapse menu'}
        aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
        className={`flex items-center gap-2 border-b border-gray-100 py-2.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-primary ${
          collapsed ? 'justify-center px-0' : 'justify-end px-4'
        }`}
      >
        {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      {/* Tenant */}
      {tenantName && !collapsed && (
        <div className="px-5 py-4">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-primary">
            {tenantName}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pt-2 pb-4">
        {modules.map((mod) => {
          // Single-module apps (e.g. the vendor portal) keep the section always
          // expanded with a static heading — no collapse toggle that could hide
          // the whole nav. When the rail is collapsed, headings are hidden.
          const isSingleModule = modules.length === 1
          const isOpen = collapsed || isSingleModule || expanded.has(mod.key)
          const isActiveModule = activeKey === mod.key
          return (
            <div key={mod.key} className="mb-1">
              {collapsed ? null : isSingleModule ? (
                <div className="px-6 py-3 text-[12px] font-extrabold uppercase tracking-[0.14em] text-gray-500">
                  {mod.label}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(mod.key)}
                  className={`flex w-full items-center gap-2 px-6 py-3 text-[12px] font-extrabold uppercase tracking-[0.14em] transition-colors ${
                    isActiveModule || isOpen
                      ? 'text-gray-800'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="flex-1 text-left">{mod.label}</span>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" strokeWidth={2.5} />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" strokeWidth={2.5} />
                  )}
                </button>
              )}

              {isOpen && (
                <div className="pb-1">
                  {mod.sidebar.map((item) => {
                    const ItemIcon = item.icon
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === mod.basePath}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          `relative mx-3 flex items-center rounded-xl text-[14px] font-medium transition-all ${
                            collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                          } ${
                            isActive
                              ? 'bg-primary font-semibold text-white shadow-sm'
                              : 'text-gray-700 hover:bg-primary/[0.06] hover:text-primary'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {ItemIcon ? (
                              <ItemIcon
                                className={`h-[18px] w-[18px] shrink-0 ${
                                  isActive ? 'text-white' : 'text-gray-500'
                                }`}
                              />
                            ) : (
                              <span className="h-[18px] w-[18px]" />
                            )}
                            {!collapsed && <span className="truncate">{item.label}</span>}
                          </>
                        )}
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-gray-100 px-6 py-4">
          {footer ?? (
            <>
              <p className="text-[12px] font-medium text-gray-500">© 2025 Optimile ERP</p>
              <p className="text-[11px] text-gray-400">v1.0.0</p>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
