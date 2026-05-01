import { useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuctionAuth } from '@auction/hooks/useAuctionAuth'

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
  const { auctionUser, logout } = useAuctionAuth()
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
          <div className="text-sm font-medium text-[#0F172A]">{auctionUser?.name ?? 'Demo User'}</div>
          <div className="text-[11px] text-[#94A3B8]">{auctionUser?.role ?? 'OPS'} · {auctionUser?.tenantName ?? 'Optimile Demo'}</div>
        </div>
        <button
          onClick={() => {
            logout()
            window.location.assign('/login')
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
