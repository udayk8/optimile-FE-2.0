import { useLocation, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@shared-auth'
import { useAuthStore } from '@admin/stores/auth.store'

const PAGE_TITLES: Record<string, string> = {
  '/auction/dashboard': 'Dashboard',
  '/auction/auctions': 'Auctions',
  '/auction/contracts': 'Contracts',
}

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path)) return title
  }
  return 'Dashboard'
}

export function TopBar() {
  const { user, logout: logoutLocal } = useAuthStore()
  const { logout: logoutShared } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const pageTitle = getPageTitle(location.pathname)

  const handleLogout = () => {
    logoutLocal()
    logoutShared()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Auction Web App</span>
        <span className="text-gray-300">/</span>
        <h2 className="text-lg font-bold text-text">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="border-l border-gray-200 pl-4">
          <div className="text-sm font-semibold text-text">{user?.name ?? 'Demo User'}</div>
          <div className="text-xs text-gray-500">{user?.role ?? 'OPS'} · {user?.tenantName ?? 'Optimile Demo'}</div>
        </div>
        <button
          onClick={handleLogout}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white transition-colors hover:bg-gray-50"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut className="h-4 w-4 text-gray-600" />
        </button>
      </div>
    </header>
  )
}
