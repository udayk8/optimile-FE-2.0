import { useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { clearAuthState } from '@shared-auth'
import { useAuthStore } from '@admin/stores/auth.store'

const PAGE_TITLES: Record<string, string> = {
  '/admin/auction/dashboard': 'Dashboard',
  '/admin/auction/auctions': 'Auctions',
  '/admin/auction/contracts': 'Contracts',
}

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path)) return title
  }
  return 'Dashboard'
}

export function TopBar() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#E5E7EB] bg-white px-6">
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-medium text-[#94A3B8]">Auction Web App</span>
        <span className="text-[#E5E7EB]">/</span>
        <h2 className="text-[15px] font-semibold text-[#0F172A]">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="border-l border-[#E5E7EB] pl-4">
          <div className="text-sm font-medium text-[#0F172A]">{user?.name ?? 'Demo User'}</div>
          <div className="text-[11px] text-[#94A3B8]">{user?.role ?? 'OPS'} · {user?.tenantName ?? 'Optimile Demo'}</div>
        </div>
        <button
          onClick={() => {
            clearAuthState()
            logout()
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white transition-colors hover:bg-[#F8FAFC]"
          title="Logout"
        >
          <LogOut className="h-4 w-4 text-[#64748B]" />
        </button>
      </div>
    </header>
  )
}
