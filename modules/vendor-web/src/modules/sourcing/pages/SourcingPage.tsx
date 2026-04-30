import { useLocation, useNavigate } from 'react-router-dom'
import { PageHero } from '@shared-ui/page-hero'
import { Card, CardContent } from '@shared-ui/card'
import { Button } from '@shared-ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { formatDateTime } from '@vendor/utils/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { Gavel, Clock, MapPin, Package, Layers, Zap, Search } from 'lucide-react'
import type { AuctionType } from '@vendor/types'

type SourcingTab = AuctionType | 'ALL'

const SOURCING_TABS: SourcingTab[] = ['ALL', 'SPOT', 'BULK', 'LOT']

function getSourcingTab(search: string): SourcingTab {
  const requestedTab = new URLSearchParams(search).get('tab')?.toUpperCase()
  if (requestedTab === 'AUCTIONS') return 'ALL'
  return SOURCING_TABS.includes(requestedTab as SourcingTab) ? (requestedTab as SourcingTab) : 'ALL'
}

export default function SourcingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { auctions } = useAppStore()
  const activeTab = getSourcingTab(location.search)

  const spotAuctions = auctions.filter(a => a.type === 'SPOT')
  const bulkAuctions = auctions.filter(a => a.type === 'BULK')
  const lotAuctions = auctions.filter(a => a.type === 'LOT')

  const displayedAuctions = activeTab === 'ALL' ? auctions :
    activeTab === 'SPOT' ? spotAuctions : 
    activeTab === 'BULK' ? bulkAuctions : lotAuctions

  const tabs: { key: SourcingTab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'ALL', label: 'All', icon: <Gavel className="h-4 w-4" />, count: auctions.length },
    { key: 'SPOT', label: 'Spot', icon: <Zap className="h-4 w-4" />, count: spotAuctions.length },
    { key: 'BULK', label: 'Bulk', icon: <Package className="h-4 w-4" />, count: bulkAuctions.length },
    { key: 'LOT', label: 'Lot', icon: <Layers className="h-4 w-4" />, count: lotAuctions.length },
  ]

  return (
    <div className="space-y-6">
      <PageHero 
        eyebrow="SOURCING"
        title="Auctions & Bidding" 
        subtitle="Participate in live sourcing events and manage your awarded contracts"
        icon={<Search className="h-5 w-5 text-primary" />}
      />

      {/* Sub-tabs for Auction Types */}
      <div className="flex w-fit gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(`/vendor/sourcing?tab=${tab.key.toLowerCase()}`)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {displayedAuctions.length === 0 ? (
          <EmptyState icon={<Gavel className="h-12 w-12" />} title={`No ${activeTab === 'ALL' ? '' : activeTab} Auctions`} description={`Published ${activeTab === 'ALL' ? '' : activeTab.toLowerCase()} auctions will appear here.`} />
        ) : (
          displayedAuctions.map((auction) => (
            <Card key={auction.id} className="border-l-4 border-l-primary hover:border-primary/50 transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold">{auction.id}</span>
                      <StatusBadge status={auction.state} />
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                        {auction.type}
                      </span>
                    </div>
                    <p className="text-base font-medium">{auction.customerName}</p>
                  </div>
                  {['LIVE', 'UPCOMING'].includes(auction.state) && (
                    <Button size="sm" onClick={() => navigate(`/vendor/sourcing/auctions/${auction.id}`)}>
                      <Gavel className="h-4 w-4 mr-2" /> {auction.state === 'LIVE' ? 'Enter Auction' : 'View Details'}
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-500" />
                    <span>
                      {auction.lanes.length === 1 && auction.lanes[0]
                        ? `${auction.lanes[0].laneDetails.origin.city} → ${auction.lanes[0].laneDetails.destination.city}`
                        : `${auction.lanes.length} Lanes (Multi-Lane)`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Vehicle: </span>{auction.vehicleTypeRequired}
                  </div>
                  <div>
                    <span className="text-gray-500">
                      {auction.state === 'UPCOMING' ? 'Starts: ' : 'Ends: '}
                    </span>
                    {formatDateTime(auction.state === 'UPCOMING' ? auction.startTime : auction.endTime)}
                  </div>
                  {auction.state === 'LIVE' && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-gray-500" />
                      <SLACountdown deadline={auction.endTime} showLabel={false} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
