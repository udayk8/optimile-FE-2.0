import { useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuctionAuth } from '@auction/hooks/useAuctionAuth'

const PAGE_TITLES: Record<string, string> = {
  '/auction/dashboard': 'Dashboard',
  '/auction/auctions': 'Auctions',
  '/auction/contracts': 'Contracts',
  '/auction/sourcing': 'Sourcing',
  '/auction/rfq-responses': 'RFQ Responses',
  '/auction/bookings': 'Bookings',
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

  const initials = auctionUser?.name?.charAt(0)?.toUpperCase() ?? 'A'

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left — Module label + Page name */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-medium text-gray-500">Auction Web</span>
        <span className="text-gray-300">/</span>
        <h2 className="text-[15px] font-semibold text-[#0F172A]">{pageTitle}</h2>
      </div>

      {/* Right — User + Logout */}
      <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
          {initials}
        </div>
        <div className="hidden sm:block">
          <div className="text-sm font-medium leading-tight text-[#0F172A]">{auctionUser?.name ?? 'Demo User'}</div>
          <div className="text-[11px] leading-tight text-gray-500">{auctionUser?.role ?? 'OPS'} · {auctionUser?.tenantName ?? 'Optimile Demo'}</div>
        </div>
        <button
          onClick={() => {
            logout()
            window.location.assign('/login')
          }}
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
          title="Logout"
        >
          <LogOut className="h-4 w-4 text-gray-500" />
        </button>
      </div>
    </header>
  )
}
