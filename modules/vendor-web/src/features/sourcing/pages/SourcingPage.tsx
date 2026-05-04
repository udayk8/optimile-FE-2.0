import { useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { HeroCard } from '@vendor/components/cards/HeroCard'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDateTime } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { Gavel, Clock, MapPin, Package, Zap, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { AuctionState } from '@vendor/types'

type SourcingTab = 'ALL' | 'UPCOMING' | 'LIVE' | 'ENDED' | 'CANCELLED'

const SOURCING_TABS: Array<'ALL' | 'UPCOMING' | 'LIVE' | 'ENDED' | 'CANCELLED'> = ['ALL', 'UPCOMING', 'LIVE', 'ENDED', 'CANCELLED']
const ENDING_STATES: AuctionState[] = ['PENDING_AWARD', 'AWARDED', 'NOT_AWARDED', 'NOT_PARTICIPATED']

function getSourcingTab(search: string): SourcingTab {
  const requestedTab = new URLSearchParams(search).get('tab')?.toUpperCase()
  if (requestedTab === 'AUCTIONS') return 'ALL'
  if (requestedTab === 'ENDED') return 'ENDED'
  return SOURCING_TABS.includes(requestedTab as 'ALL' | 'UPCOMING' | 'LIVE' | 'ENDED' | 'CANCELLED') ? (requestedTab as SourcingTab) : 'ALL'
}

export default function SourcingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { auctions } = useAppStore()
  const activeTab = getSourcingTab(location.search)
  const [page, setPage] = useState(1)

  const displayedAuctions = useMemo(
    () =>
      activeTab === 'ALL'
        ? auctions
        : activeTab === 'ENDED'
          ? auctions.filter((auction) => ENDING_STATES.includes(auction.state))
          : auctions.filter((auction) => auction.state === activeTab),
    [activeTab, auctions]
  )
  const pageSize = 5
  const totalPages = Math.max(1, Math.ceil(displayedAuctions.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedAuctions = displayedAuctions.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const tabs: { key: SourcingTab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'ALL', label: 'All', icon: <Gavel className="h-4 w-4" />, count: auctions.length },
    { key: 'UPCOMING', label: 'Upcoming', icon: <Clock className="h-4 w-4" />, count: auctions.filter((a) => a.state === 'UPCOMING').length },
    { key: 'LIVE', label: 'Live', icon: <Zap className="h-4 w-4" />, count: auctions.filter((a) => a.state === 'LIVE').length },
    { key: 'ENDED', label: 'Ended', icon: <Package className="h-4 w-4" />, count: auctions.filter((a) => ENDING_STATES.includes(a.state)).length },
    { key: 'CANCELLED', label: 'Cancelled', icon: <Search className="h-4 w-4" />, count: auctions.filter((a) => a.state === 'CANCELLED').length },
  ]

  return (
    <div>
      <HeroCard 
        eyebrow="SOURCING"
        title="Auctions & Bidding" 
        subtitle="Review upcoming, live, ended, and cancelled auctions"
        icon={<Search className="h-5 w-5 text-primary" />}
      />

      <div className="mb-6 mt-6 flex max-w-full gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setPage(1)
              navigate(`/vendor/sourcing?tab=${tab.key.toLowerCase()}`)
            }}
            className={`flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-text shadow-sm'
                : 'text-gray-600 hover:text-primary'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {displayedAuctions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Gavel className="h-12 w-12" />}
              title={`No ${activeTab === 'ALL' ? '' : activeTab.replace('_', ' ')} Auctions`}
              description={`Published ${activeTab === 'ALL' ? '' : activeTab.toLowerCase().replace('_', ' ')} auctions will appear here.`}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Auction</th>
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold">Route</th>
                  <th className="px-4 py-3 font-bold">State</th>
                  <th className="px-4 py-3 font-bold">Outcome</th>
                  <th className="px-4 py-3 font-bold">Timing</th>
                  <th className="px-4 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedAuctions.map((auction) => {
                  const outcomeLabel = ENDING_STATES.includes(auction.state)
                    ? auction.state === 'PENDING_AWARD'
                      ? 'Pending Award'
                      : auction.state === 'AWARDED'
                        ? 'Awarded'
                        : auction.state === 'NOT_AWARDED'
                          ? 'Not Awarded'
                          : 'Not Participated'
                    : auction.state === 'LIVE'
                      ? 'In Progress'
                      : auction.state === 'UPCOMING'
                        ? 'Scheduled'
                        : 'Cancelled'
                  const outcomeStatus = auction.state === 'CANCELLED'
                    ? 'CANCELLED'
                    : outcomeLabel.toUpperCase().replace(/ /g, '_')
                  const timingLabel = auction.state === 'UPCOMING'
                    ? 'Starts'
                    : auction.state === 'LIVE'
                      ? 'Ends'
                      : auction.state === 'CANCELLED'
                        ? 'Closed'
                        : 'Finished'
                  const timingValue = auction.state === 'UPCOMING' ? auction.startTime : auction.endTime

                  return (
                    <tr key={auction.id} className="align-top transition-colors hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold text-text">{auction.id}</div>
                        <div className="mt-1 text-xs text-gray-500">{auction.type}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-text">{auction.customerName}</div>
                        <div className="mt-1 text-xs text-gray-500">{auction.vehicleTypeRequired}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-text">
                              {auction.lanes.length === 1 && auction.lanes[0]
                                ? `${auction.lanes[0].laneDetails.origin.city} → ${auction.lanes[0].laneDetails.destination.city}`
                                : `${auction.lanes.length} lanes`}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">{auction.lanes.length === 1 ? 'Single lane' : 'Multi-lane auction'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {ENDING_STATES.includes(auction.state)
                          ? <StatusBadge status="CANCELLED" label="Ended" />
                          : <StatusBadge status={auction.state} />}
                      </td>
                      <td className="px-5 py-4">
                        {activeTab === 'ENDED' ? (
                          <StatusBadge status={outcomeStatus} label={outcomeLabel} />
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-text">{timingLabel}</div>
                        <div className="mt-1 text-xs text-gray-500">{formatDateTime(timingValue)}</div>
                        {auction.state === 'LIVE' && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            <SLACountdown deadline={auction.endTime} showLabel={false} />
                          </div>
                        )}
                        {auction.state === 'PENDING_AWARD' && (
                          <div className="mt-2 text-xs text-gray-600">Awaiting award decision</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {auction.state === 'CANCELLED' ? (
                          <span className="text-sm text-gray-500">No Action</span>
                        ) : auction.state === 'LIVE' ? (
                          <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/sourcing/auctions/${auction.id}`)}>
                            <Gavel className="mr-2 h-4 w-4" /> Enter
                          </Button>
                        ) : auction.state === 'UPCOMING' ? (
                          <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/sourcing/auctions/${auction.id}`)}>
                            <Gavel className="mr-2 h-4 w-4" /> View
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/sourcing/auctions/${auction.id}`)}>
                            Details
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {displayedAuctions.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          <span>Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, displayedAuctions.length)} of {displayedAuctions.length}</span>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-text disabled:opacity-50" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="mr-1 inline-block h-4 w-4" />Previous</button>
            <span className="rounded-lg bg-gray-50 px-3 py-1.5 font-semibold text-text">Page {currentPage} of {totalPages}</span>
            <button className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-text disabled:opacity-50" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next <ChevronRight className="ml-1 inline-block h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}
