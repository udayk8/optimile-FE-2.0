import type { ReactNode } from 'react'
import { useAuctionAuth } from '@auction/hooks/useAuctionAuth'

export function AuctionRouteWrapper({ children }: { children: ReactNode }) {
  const { auctionUser } = useAuctionAuth()

  return (
    <>
      {auctionUser?.status === 'SUSPENDED' && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          This demo user is suspended. Read-only access is recommended.
        </div>
      )}
      {children}
    </>
  )
}
