import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@vendor/hooks/useModuleRoute'
import { Card, CardContent } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { PageHeader } from '@vendor/components/layout/PageHeader'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { ConfirmDialog } from '@vendor/components/shared/ConfirmDialog'
import { useAppStore } from '@vendor/stores/app.store'
import { useSourcingBridge, withEffectiveState } from '@vendor/integration/auctionBridge'
import { formatLaneDisplay, getRateTypeLabel } from '@shared-utils'
import { ArrowLeft, Gavel, MapPin, Clock, Truck } from 'lucide-react'

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  // Cross-module: shared-store auctions (auction-web) take precedence; the
  // permanent local mock samples stay reachable alongside them. Bids on a
  // shared auction write back through the bridge; bids on a local mock
  // auction stay in the local demo store.
  const { auctions: bridgeAuctions, placeBid: bridgePlaceBid } = useSourcingBridge()
  const { auctions: storeAuctions, submitBid } = useAppStore()
  const bridgeAuction = bridgeAuctions.find(a => a.id === id)
  const submitBidFn = bridgeAuction ? bridgePlaceBid : submitBid

  const found = bridgeAuction ?? storeAuctions.find(a => a.id === id)
  // Ended-by-timer live auctions render as ended (no bidding), even when the
  // local demo store still has them marked LIVE.
  const auction = found ? withEffectiveState(found) : undefined

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
        submitBidFn(auction.id, laneId, amount)
      }
    })
    setSubmitted(true)
  }

  // Every bid carries the auction's rate type (PER_TRIP / PER_MT / PER_KM).
  const rateType = auction.pricingUnit ?? 'PER_TRIP'
  const rateTypeLabel = getRateTypeLabel(rateType)

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

      {submitted && (
        <div className="mb-6 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          Bid submitted successfully
        </div>
      )}

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
            <div className="mb-1 text-sm text-gray-500">Rate Type</div>
            <div className="font-bold text-text">{rateTypeLabel}</div>
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

      {/* Lanes Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="min-w-[180px] px-4 py-3 text-xs font-bold uppercase tracking-wide">Lane Details</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Volume</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Rate Type</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Initial Base Price</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Winning Bid</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Your Active Bid</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Your Rank</th>
                <th className="min-w-[200px] px-4 py-3 text-right text-xs font-bold uppercase tracking-wide">Enter New Bid (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {auction.lanes.map((lane) => {
                const activeBid = auction.vendorBids.find(b => b.laneId === lane.id && b.status === 'ACTIVE')
                const isWinning = activeBid
                  ? lane.myRank != null
                    ? lane.myRank === 1
                    : lane.currentBestBid != null && activeBid.amount <= lane.currentBestBid
                  : false
                // Live rank from the shared store (L1 = lowest bid); falls back to
                // Winning/Outbid when running off the local demo store.
                const rank = activeBid
                  ? lane.myRank != null ? `L${lane.myRank}` : (isWinning ? 'Winning' : 'Outbid')
                  : '-'

                return (
                  <tr key={lane.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <div>
                          <div className="font-mono font-bold text-text">{formatLaneDisplay(lane.laneDetails.origin.city, lane.laneDetails.destination.city)}</div>
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
                      <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{rateTypeLabel}</span>
                    </td>
                    <td className="px-4 py-4">
                      {lane.basePrice ? (
                        <div className="font-semibold text-text">
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
                          <div className="font-bold text-text"><CurrencyDisplay amount={activeBid.amount} /></div>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {activeBid ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${isWinning ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                            {rank}{isWinning && lane.myRank != null ? ' · Leading' : ''}
                          </span>
                          {lane.bidCount != null && lane.bidCount > 0 && (
                            <span className="text-[11px] text-gray-500">of {lane.bidCount} bid{lane.bidCount > 1 ? 's' : ''}</span>
                          )}
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
                            placeholder={`Rate (${rateTypeLabel})`}
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
