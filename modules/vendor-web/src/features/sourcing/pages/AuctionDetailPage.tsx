import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { PageHeader } from '@vendor/components/layout/PageHeader'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { useAppStore } from '@vendor/stores/app.store'
import { ArrowLeft, Gavel, MapPin, Clock, Truck, ShieldAlert } from 'lucide-react'

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { auctions, submitBid } = useAppStore()

  const auction = auctions.find(a => a.id === id)

  // Local state for bidding
  const [bids, setBids] = useState<Record<string, number>>({})

  // If auction not found
  if (!auction) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">Auction not found</h2>
        <Button onClick={() => navigate('/vendor/sourcing?tab=auctions')}><ArrowLeft className="h-4 w-4 mr-2"/> Back to Sourcing</Button>
      </div>
    )
  }

  // Validation
  const bidErrors = useMemo(() => {
    const errors: Record<string, string> = {}
    auction.lanes.forEach(lane => {
      const amount = bids[lane.id] || 0
      if (amount > 0 && lane.currentBestBid) {
        const requiredMax = lane.currentBestBid - (lane.minBidDecrement || 0)
        if (amount > requiredMax) {
          errors[lane.id] = `Must be ≤ ₹${requiredMax.toLocaleString()}`
        }
      }
    })
    return errors
  }, [bids, auction])

  const hasBidAny = Object.values(bids).some(v => v > 0)
  const hasErrors = Object.keys(bidErrors).length > 0

  const isValid = hasBidAny && !hasErrors

  const handleBidChange = (laneId: string, value: string) => {
    const numValue = Number(value)
    if (!isNaN(numValue)) {
      setBids(prev => ({ ...prev, [laneId]: numValue }))
    }
  }

  const handleSubmit = () => {
    Object.entries(bids).forEach(([laneId, amount]) => {
      if (amount > 0) {
        submitBid(auction.id, laneId, amount)
      }
    })
    navigate('/vendor/sourcing?tab=auctions')
  }

  const getPricingUnitLabel = () => {
    switch(auction.pricingUnit) {
      case 'PER_MT': return 'per MT'
      case 'PER_KM': return 'per Km'
      case 'PER_TRIP':
      default: return 'per Trip'
    }
  }

  return (
    <div className="pb-20">
      <PageHeader
        title={`Auction ${auction.id}`}
        description={auction.customerName}
        breadcrumbs={[
          { label: 'Sourcing', path: '/vendor/sourcing' },
          { label: `Auction ${auction.id}` },
        ]}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={auction.state} />
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {auction.type}
            </span>
          </div>
        }
      />

      {/* Auction Info Summary */}
      <Card className="mb-6">
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="mb-1 text-sm text-gray-500">Vehicle Requirement</div>
            <div className="flex items-center gap-2 font-bold text-text">
              <Truck className="h-4 w-4 text-primary" /> {auction.vehicleTypeRequired}
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm text-gray-500">Pricing Model</div>
            <div className="font-bold text-text">{getPricingUnitLabel()}</div>
          </div>
          <div>
            <div className="mb-1 text-sm text-gray-500">Total Lanes</div>
            <div className="font-bold text-text">{auction.lanes.length} Lanes</div>
          </div>
          <div>
            <div className="mb-1 text-sm text-gray-500">Ends In</div>
            <div className="flex items-center gap-2 font-bold text-text">
              <Clock className="h-4 w-4 text-warning" />
              {auction.state === 'LIVE' ? <SLACountdown deadline={auction.endTime} showLabel={false} /> : 'N/A'}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4 text-primary">
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
        <p className="text-sm">
          <strong>Lane bidding:</strong> You may bid on any lane you want. Leave the others blank if you do not want to participate on them.
        </p>
      </div>

      {/* Lanes Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="min-w-[180px] px-4 py-3 text-xs font-bold uppercase tracking-wide">Lane Details</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Volume</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Base Price</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Your Active Bid</th>
                <th className="min-w-[200px] px-4 py-3 text-right text-xs font-bold uppercase tracking-wide">Enter New Bid (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {auction.lanes.map((lane) => {
                // Find existing active bid
                const activeBid = auction.vendorBids.find(b => b.laneId === lane.id && b.status === 'ACTIVE')
                const isL1 = activeBid && lane.currentBestBid ? activeBid.amount <= lane.currentBestBid : false
                const rank = activeBid ? (isL1 ? 1 : 2) : '-'

                return (
                  <tr key={lane.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <div>
                          <div className="font-bold text-text">{lane.laneDetails.origin.city} → {lane.laneDetails.destination.city}</div>
                          <div className="text-xs text-gray-500">{lane.laneDetails.distanceKm} km</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {lane.volumeRequirement ? (
                        <div>
                          <div className="font-bold text-text">{lane.volumeRequirement.estimatedVolume} {lane.volumeRequirement.unit}</div>
                          <div className="text-xs text-gray-500">{lane.volumeRequirement.frequency}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4">
                      {lane.currentBestBid ? (
                        <div>
                          <div className="font-semibold text-text">
                            <CurrencyDisplay amount={lane.currentBestBid} />
                          </div>
                          {lane.minBidDecrement && (
                            <div className="text-xs text-gray-500">Min decrement: ₹{lane.minBidDecrement}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {activeBid ? (
                        <div>
                          <div className="font-bold text-text"><CurrencyDisplay amount={activeBid.amount} /></div>
                          <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${isL1 ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-600'}`}>
                            Rank {rank}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {auction.state === 'LIVE' ? (
                        <div className="flex flex-col items-end gap-1">
                          <input 
                            type="number"
                            className={`h-10 w-full max-w-[150px] rounded-lg border bg-white px-3 text-sm outline-none transition ${bidErrors[lane.id] ? 'border-danger ring-danger/20 focus:border-danger focus:ring-4' : 'border-gray-300 ring-primary/20 focus:border-primary focus:ring-4'}`}
                            placeholder={`Rate ${getPricingUnitLabel()}`}
                            value={bids[lane.id] || ''}
                            onChange={(e) => handleBidChange(lane.id, e.target.value)}
                          />
                          {bidErrors[lane.id] && (
                            <div className="text-xs text-danger">{bidErrors[lane.id]}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs italic text-gray-500">Auction not live</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Bar */}
      {auction.state === 'LIVE' && (
        <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t bg-background p-4 shadow-sm md:left-64">
          <div>
            <div className="font-bold text-text">
              {Object.keys(bids).filter(k => (bids[k] || 0) > 0).length} of {auction.lanes.length} lanes bid
            </div>
            <div className="text-xs text-gray-500">Partial lane bids are allowed.</div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setBids({})}>Clear</Button>
            <Button onClick={handleSubmit} disabled={!isValid}>
              <Gavel className="h-4 w-4 mr-2" /> Submit Bids
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
