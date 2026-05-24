import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { ShellSidebar } from './Sidebar'
import { ShellTopbar, type ShellUser } from './Topbar'
import type { ModuleManifest } from './types'

interface AppShellProps {
  modules: ModuleManifest[]
  user: ShellUser | null
  onLogout: () => void
  logo?: ReactNode
  tenantName?: string
  footer?: ReactNode
  notificationCount?: number
}

export function AppShell({
  modules,
  user,
  onLogout,
  logo,
  tenantName,
  footer,
  notificationCount,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background text-text">
      <ShellSidebar modules={modules} logo={logo} tenantName={tenantName} footer={footer} />
      <div className="flex min-h-screen flex-1 flex-col min-w-0">
        <ShellTopbar
          modules={modules}
          user={user}
          onLogout={onLogout}
          notificationCount={notificationCount}
        />
        <main className="flex-1 overflow-x-hidden bg-[#F8FAFC]">
          <div className="page-enter mx-auto max-w-[1400px] px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
