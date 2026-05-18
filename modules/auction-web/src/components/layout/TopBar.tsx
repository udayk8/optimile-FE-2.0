import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Search } from 'lucide-react'
import { useAuctionAuth } from '@auction/hooks/useAuctionAuth'
import { searchAuctionService, type SearchResponse, type SearchResultItem } from '@auction/lib/mock-services'

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
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const pageTitle = getPageTitle(location.pathname)
  const initials = auctionUser?.name?.charAt(0)?.toUpperCase() ?? 'A'

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchResults(null)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchResults(null)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    const query = searchQuery.trim()
    if (query.length < 2) {
      setSearchResults(null)
      setSearchLoading(false)
      return
    }

    let cancelled = false
    setSearchLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchAuctionService(query)
        if (!cancelled) setSearchResults(results)
      } catch {
        if (!cancelled) setSearchResults({ auctions: [], contracts: [] })
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [searchQuery])

  const openSearchResult = (type: 'auction' | 'contract', item: SearchResultItem) => {
    setSearchQuery('')
    setSearchResults(null)
    navigate(type === 'auction' ? `/auction/auctions/${item.id}` : `/auction/contracts/${item.id}`)
  }

  const hasSearchResults = Boolean(searchResults?.auctions.length || searchResults?.contracts.length)

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-medium text-gray-500">Auction Web</span>
        <span className="text-gray-300">/</span>
        <h2 className="text-[15px] font-semibold text-[#0F172A]">{pageTitle}</h2>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <div className="relative hidden w-[320px] lg:block" ref={searchRef}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) void searchAuctionService(searchQuery.trim()).then(setSearchResults).catch(() => setSearchResults({ auctions: [], contracts: [] }))
            }}
            placeholder="Search auctions or contracts"
            className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-gray-400 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#DBEAFE]"
          />

          {searchQuery.trim().length >= 2 && (searchResults || searchLoading) && (
            <div className="absolute right-0 mt-3 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="border-b border-gray-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {searchLoading ? 'Searching' : hasSearchResults ? 'Results' : 'No results'}
              </div>
              {searchResults?.auctions.map((auction) => (
                <button
                  key={`auction-${auction.id}`}
                  type="button"
                  onClick={() => openSearchResult('auction', auction)}
                  className="flex w-full items-start justify-between gap-3 border-b border-gray-100 px-3 py-2.5 text-left last:border-0 hover:bg-gray-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[#0F172A]">{auction.title ?? auction.lane ?? auction.id}</span>
                    <span className="mt-0.5 block truncate text-xs text-gray-500">Auction · {auction.status ?? auction.type ?? 'Record'}</span>
                  </span>
                  {auction.type && <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{auction.type}</span>}
                </button>
              ))}
              {searchResults?.contracts.map((contract) => (
                <button
                  key={`contract-${contract.id}`}
                  type="button"
                  onClick={() => openSearchResult('contract', contract)}
                  className="flex w-full items-start justify-between gap-3 border-b border-gray-100 px-3 py-2.5 text-left last:border-0 hover:bg-gray-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[#0F172A]">{contract.vendorName ?? contract.title ?? contract.id}</span>
                    <span className="mt-0.5 block truncate text-xs text-gray-500">Contract · {contract.lane ?? contract.status ?? 'Record'}</span>
                  </span>
                  {contract.status && <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{contract.status}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DBEAFE] text-sm font-semibold text-[#2563EB]">
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
      </div>
    </header>
  )
}
