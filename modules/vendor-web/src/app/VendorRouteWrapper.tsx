import { useEffect, type ReactNode } from 'react'
import { useVendorAuth } from '@vendor/hooks/useVendorAuth'
import { useAppStore } from '@vendor/stores/app.store'
import { useAuctionNotificationsSync } from '@vendor/integration/auctionBridge'
import { useVendorLedgerSync, useVendorNotificationsSync } from '@vendor/integration/vendorNotificationsSync'

export function VendorRouteWrapper({ children }: { children: ReactNode }) {
  const { vendor } = useVendorAuth()
  const applyVendorDataset = useAppStore((state) => state.applyVendorDataset)

  // Push auction events (live invites, outbid, ended, won/lost) into the
  // vendor notification feed.
  useAuctionNotificationsSync()
  // P0 operational events: new/expiring indents, POD due, invoice
  // rejection/resubmission, payments received, compliance expiry, account status.
  useVendorNotificationsSync(vendor?.status)
  // Finance-approved invoices (cross-module) open their receivable in the
  // ledger automatically; recorded payments post against it.
  useVendorLedgerSync()

  // Scope the portal data to the logged-in vendor. Blank-listed vendors (e.g.
  // Mahesh Transport) get an empty portal; everyone else keeps the demo data.
  useEffect(() => {
    applyVendorDataset(vendor?.tradingName)
  }, [vendor?.tradingName, applyVendorDataset])

  return (
    <>
      {vendor?.status === 'SUSPENDED' && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          ⚠️ Your account is <strong>suspended</strong>. You cannot accept indents or participate in sourcing events.
        </div>
      )}
      {vendor?.status === 'UNDER_REVIEW' && (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-700">
          Your vendor profile is under review.
        </div>
      )}
      {vendor?.status === 'REJECTED' && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          Your vendor profile was rejected. Update the profile and resubmit for review.
        </div>
      )}
      {vendor?.status === 'BLACKLISTED' && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          🚫 Your account is <strong>blacklisted</strong>. Access is restricted to viewing existing records only.
        </div>
      )}
      {children}
    </>
  )
}
