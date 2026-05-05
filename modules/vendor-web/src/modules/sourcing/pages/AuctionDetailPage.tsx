import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@shared-ui/card'
import { Button } from '@shared-ui/button'
import { PageHeader } from '@vendor/components/layout/PageHeader'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { ConfirmDialog } from '@vendor/components/shared/ConfirmDialog'
import { useAppStore } from '@vendor/stores/app.store'
import { ArrowLeft, Gavel, MapPin, Clock, Truck } from 'lucide-react'

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { auctions, submitBid } = useAppStore()

  const auction = auctions.find(a => a.id === id)

  // Local state for bidding
  const [bids, setBids] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)

  // If auction not found
  if (!auction) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">Auction not found</h2>
        <Button onClick={() => navigate('/vendor/sourcing?tab=auctions')}><ArrowLeft className="h-4 w-4 mr-2"/> Back to Sourcing</Button>
      </div>
    )
  }

  const isLot = auction.type === 'LOT'

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
  const hasBidAll = auction.lanes.every(l => (bids[l.id] || 0) > 0)
  const hasErrors = Object.keys(bidErrors).length > 0

  const isValid = (isLot ? hasBidAll : hasBidAny) && !hasErrors

  useEffect(() => {
    if (!submitted) return
    const timer = window.setTimeout(() => setSubmitted(false), 2000)
    return () => window.clearTimeout(timer)
  }, [submitted])

  const handleBidChange = (laneId: string, value: string) => {
    const numValue = Number(value)
    if (!isNaN(numValue)) {
      setBids(prev => ({ ...prev, [laneId]: numValue }))
    }
  }

  const handleSubmit = () => {
    if (!isValid) return
    Object.entries(bids).forEach(([laneId, amount]) => {
      if (amount > 0) {
        submitBid(auction.id, laneId, amount)
      }
    })
    setSubmitted(true)
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
      <button
        type="button"
        onClick={() => setExitConfirmOpen(true)}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <PageHeader
        title={`Auction ${auction.id}`}
        description={auction.customerName}
        breadcrumbs={[
          { label: 'Sourcing', path: '/sourcing' },
          { label: `Auction ${auction.id}` },
        ]}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={auction.state} />
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
              {auction.type}
            </span>
          </div>
        }
      />

      {submitted && (
        <div className="mb-6 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Bid submitted successfully
        </div>
      )}

      {/* Auction Info Summary */}
      <Card className="mb-6">
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">Vehicle Requirement</div>
            <div className="font-medium flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> {auction.vehicleTypeRequired}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Pricing Model</div>
            <div className="font-medium">{getPricingUnitLabel()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Total Lanes</div>
            <div className="font-medium">{auction.lanes.length} Lanes</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Ends In</div>
            <div className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              {auction.state === 'LIVE' ? <SLACountdown deadline={auction.endTime} showLabel={false} /> : 'N/A'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lanes Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Lane Details</th>
                <th className="px-4 py-3 font-medium">Volume</th>
                <th className="px-4 py-3 font-medium">Initial Base Price</th>
                <th className="px-4 py-3 font-medium">Winning Bid</th>
                <th className="px-4 py-3 font-medium">Your Active Bid</th>
                <th className="px-4 py-3 font-medium">Your Rank</th>
                <th className="px-4 py-3 font-medium text-right min-w-[200px]">Enter New Bid (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {auction.lanes.map((lane) => {
                const activeBid = auction.vendorBids.find(b => b.laneId === lane.id && b.status === 'ACTIVE')
                const isWinning = activeBid && lane.currentBestBid ? activeBid.amount <= lane.currentBestBid : false
                const rank = activeBid ? (isWinning ? 'Winning' : 'Outbid') : '-'

                return (
                  <tr key={lane.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium">{lane.laneDetails.origin.city} → {lane.laneDetails.destination.city}</div>
                          <div className="text-xs text-gray-500">{lane.laneDetails.distanceKm} km</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {lane.volumeRequirement ? (
                        <div>
                          <div className="font-medium">{lane.volumeRequirement.estimatedVolume} {lane.volumeRequirement.unit}</div>
                          <div className="text-xs text-gray-500">{lane.volumeRequirement.frequency}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4">
                      {lane.basePrice ? (
                        <div className="font-medium">
                          <CurrencyDisplay amount={lane.basePrice} />
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {lane.currentBestBid ? (
                        <div>
                          <div className="font-semibold text-success">
                            <CurrencyDisplay amount={lane.currentBestBid} />
                          </div>
                          {lane.minBidDecrement && (
                            <div className="text-xs text-gray-500">Dec: ₹{lane.minBidDecrement}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">No bids yet</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {activeBid ? (
                        <div>
                          <div className="font-medium"><CurrencyDisplay amount={activeBid.amount} /></div>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {activeBid ? (
                        <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-semibold ${isWinning ? 'bg-success/20 text-success' : 'bg-gray-100 text-gray-600'}`}>
                          {rank}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {auction.state === 'LIVE' ? (
                        <div className="flex flex-col items-end gap-1">
                          <input 
                            type="number"
                            className={`flex h-9 w-full max-w-[150px] rounded-lg border ${bidErrors[lane.id] ? 'border-danger focus-visible:ring-danger/20' : 'border-gray-300 focus-visible:ring-primary/20'} bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1`}
                            placeholder={`Rate ${getPricingUnitLabel()}`}
                            value={bids[lane.id] || ''}
                            onChange={(e) => handleBidChange(lane.id, e.target.value)}
                          />
                          {bidErrors[lane.id] && (
                            <div className="text-xs text-danger">{bidErrors[lane.id]}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs italic">Auction not live</span>
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
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t p-4 shadow-lg flex items-center justify-between z-10">
          <div>
            <div className="font-medium">
              {Object.keys(bids).filter(k => (bids[k] || 0) > 0).length} of {auction.lanes.length} lanes bid
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={!isValid}>
              <Gavel className="h-4 w-4 mr-2" /> Submit Bids
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={exitConfirmOpen}
        onClose={() => setExitConfirmOpen(false)}
        onConfirm={() => navigate(-1)}
        title="Exit auction?"
        description="Are you sure you want to exit auction?"
        confirmLabel="Exit"
        variant="destructive"
      />
    </div>
  )
}
