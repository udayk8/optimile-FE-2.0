import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
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
    <aside className="sticky top-0 z-40 flex h-screen w-[268px] flex-col border-r border-gray-200 bg-white shadow-[1px_0_0_0_rgba(15,23,42,0.04)]">
      {/* Brand band */}
      <div className="flex h-[64px] shrink-0 items-center justify-center bg-primary px-6">
        {logo ?? <span className="text-2xl font-bold tracking-tight text-white">Optimile</span>}
      </div>

      {/* Tenant */}
      {tenantName && (
        <div className="px-5 py-4">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-primary">
            {tenantName}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pt-2 pb-4">
        {modules.map((mod) => {
          const isOpen = expanded.has(mod.key)
          const isActiveModule = activeKey === mod.key
          return (
            <div key={mod.key} className="mb-1">
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

              {isOpen && (
                <div className="pb-1">
                  {mod.sidebar.map((item) => {
                    const ItemIcon = item.icon
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === mod.basePath}
                        className={({ isActive }) =>
                          `relative flex items-center gap-3 px-6 py-2.5 text-[14px] font-medium transition-colors ${
                            isActive
                              ? 'bg-primary/[0.06] font-semibold text-primary'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-primary" />
                            )}
                            {ItemIcon ? (
                              <ItemIcon
                                className={`h-[18px] w-[18px] shrink-0 ${
                                  isActive ? 'text-primary' : 'text-gray-500'
                                }`}
                              />
                            ) : (
                              <span className="h-[18px] w-[18px]" />
                            )}
                            <span className="truncate">{item.label}</span>
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
      <div className="border-t border-gray-100 px-6 py-4">
        {footer ?? (
          <>
            <p className="text-[12px] font-medium text-gray-500">© 2025 Optimile ERP</p>
            <p className="text-[11px] text-gray-400">v1.0.0</p>
          </>
        )}
      </div>
    </aside>
  )
}
