import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHero } from '@shared-ui/page-hero'
import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import { DetailTabs } from '@shared-ui/detail-tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@shared-ui/dialog'
import { InfoGrid, InfoItem } from '@shared-ui/info-grid'
import { Field, Select } from '@shared-ui/form-field'
import { Input } from '@shared-ui/input'
import { StatusBadge } from '@admin/components/shared/StatusBadge'
import { CurrencyDisplay } from '@admin/components/shared/CurrencyDisplay'
import { SLACountdown } from '@admin/components/shared/SLACountdown'
import { formatDateTime } from '@admin/utils/date-utils'
import { useAppStore } from '@admin/stores/app.store'
import { useAuthStore } from '@admin/stores/auth.store'

const TABS = ['overview', 'lanes', 'ranking', 'award'] as const
const DETAIL_TABS = TABS.map((tab) => ({ id: tab, label: tab.charAt(0).toUpperCase() + tab.slice(1) }))

type AwardModalState =
  | { scope: 'SPOT'; laneId: string }
  | { scope: 'LANE'; laneId: string }

export default function AuctionDetailPage() {
  const { id } = useParams()
  const { auctions, contracts, launchAuction, cancelAuction, awardSpotAuction, finalizeLaneAward } = useAppStore()
  const { user } = useAuthStore()
  const auction = auctions.find((item) => item.id === id)
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('overview')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('Configuration issue found after internal review.')
  const [awardSelection, setAwardSelection] = useState<Record<string, { R1?: 'R1' | 'R2' | 'R3'; R2?: 'R1' | 'R2' | 'R3'; R3?: 'R1' | 'R2' | 'R3' }>>({})
  const [awardModal, setAwardModal] = useState<AwardModalState | null>(null)
  const [awardModalBidRank, setAwardModalBidRank] = useState<'R1' | 'R2' | 'R3'>('R1')
  const [awardModalReason, setAwardModalReason] = useState('')

  const linkedContracts = useMemo(
    () => contracts.filter((item) => item.sourceAuctionId === auction?.id),
    [auction?.id, contracts]
  )

  if (!auction) {
    return <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600 shadow-sm">Auction not found.</div>
  }

  const actor = user?.name ?? 'Demo User'
  const spotLane = auction.lanes[0]
  const rankOrder = { R1: 0, R2: 1, R3: 2 } as const

  const getDefaultSelection = (laneId: string, rank: 'R1' | 'R2' | 'R3') => {
    const selected = awardSelection[laneId]?.[rank]
    if (selected) return selected
    return rank
  }

  const getLaneSelectionRows = (laneId: string) => {
    const lane = auction.lanes.find((item) => item.id === laneId)
    if (!lane) return []

    return [
      { rank: 'R1' as const, allocation: lane.allocationMode === 'SINGLE' ? 100 : lane.allocation.r1 },
      { rank: 'R2' as const, allocation: lane.allocation.r2 },
      { rank: 'R3' as const, allocation: lane.allocation.r3 },
    ]
      .filter((entry) => entry.allocation > 0)
      .map((entry) => {
        const bidRank = getDefaultSelection(laneId, entry.rank)
        const bid = lane.ranking[rankOrder[bidRank]]
        return {
          allocationRank: entry.rank,
          bidRank,
          allocationPercent: entry.allocation,
          vendorName: bid?.vendorName ?? 'Unassigned',
          isOverride: bidRank !== entry.rank,
        }
      })
  }

  const openAwardModal = (target: AwardModalState, defaultBidRank: 'R1' | 'R2' | 'R3') => {
    setAwardModal(target)
    setAwardModalBidRank(defaultBidRank)
    setAwardModalReason('')
  }

  const confirmAward = () => {
    if (!awardModal) return

    if (awardModal.scope === 'SPOT') {
      if (!spotLane) return
      if (awardModalBidRank !== 'R1' && !awardModalReason.trim()) {
        toast.error('A reason is required when awarding away from R1.')
        return
      }
      awardSpotAuction(auction.id, actor, awardModalBidRank)
      toast.success(`Spot awarded to ${awardModalBidRank}.`)
      setAwardModal(null)
      return
    }

    const laneSelections = getLaneSelectionRows(awardModal.laneId)
    if (laneSelections.some((entry) => entry.isOverride) && !awardModalReason.trim()) {
      toast.error('A reason is required when awarding away from the selected rank.')
      return
    }

    finalizeLaneAward(
      auction.id,
      awardModal.laneId,
      laneSelections.map((entry) => ({ allocationRank: entry.allocationRank, bidRank: entry.bidRank })),
      actor,
      laneSelections.some((entry) => entry.isOverride) ? awardModalReason.trim() || undefined : undefined
    )
    toast.success(`Lane ${awardModal.laneId} awarded.`)
    setAwardModal(null)
  }

  const handleCancel = () => {
    cancelAuction(auction.id, actor, cancelReason)
    toast.success('Auction cancelled in mock state.')
    setCancelOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Auction Operations"
        title={auction.title}
        subtitle={`${auction.id} · ${auction.type} · ${auction.lanes.length} lane${auction.lanes.length > 1 ? 's' : ''}`}
        action={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={auction.status} />
            {auction.status === 'DRAFT' && <Button onClick={() => { launchAuction(auction.id, actor); toast.success('Draft launched.'); }}>Launch</Button>}
            {(auction.status === 'DRAFT' || auction.status === 'LIVE' || auction.status === 'COMPLETED') && (
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>Cancel</Button>
            )}
          </div>
        }
      />

      <Card>
        <DetailTabs tabs={DETAIL_TABS} activeTab={activeTab} onChange={setActiveTab} />
      </Card>

      {activeTab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoGrid className="md:grid-cols-2">
                <InfoItem label="Created">{formatDateTime(auction.createdAt)}</InfoItem>
                <InfoItem label="Award deadline">{(auction.status === 'LIVE' || auction.status === 'COMPLETED') ? <SLACountdown deadline={auction.awardDeadline} /> : <span className="text-sm text-gray-600">Not active</span>}</InfoItem>
              {auction.type !== 'SPOT' && (
                <InfoItem label="Contract Window">
                  {auction.contractStartDate ?? 'Not set'}
                  <span className="mt-1 block text-xs font-normal text-gray-500">{auction.contractEndDate ?? 'Not set'}</span>
                </InfoItem>
              )}
              </InfoGrid>
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-warning">Pending Award</p>
                <p className="mt-2 text-sm text-warning">
                  {auction.type === 'SPOT'
                    ? 'Spot: confirm the selected winning rank in the award modal. R1 is the current top bidder.'
                    : auction.type === 'BULK'
                      ? 'Bulk: select the allocation mappings for each lane first, then click Final Award to confirm the lane.'
                      : 'Lot: select the allocation mappings for each lane first, then click Final Award to confirm the lane.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contract Output</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {linkedContracts.length === 0 && (
                <p className="text-sm text-gray-600">
                  {auction.type === 'SPOT'
                    ? 'Spot awards do not create contracts.'
                    : 'No contracts linked yet. Award the auction to generate contract records.'}
                </p>
              )}
              {linkedContracts.map((contract) => (
                <Link key={contract.id} to={`/auction/contracts/${contract.id}`} className="block rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold">{contract.id}</span>
                    <StatusBadge status={contract.status} />
                  </div>
                  <p className="mt-2 text-sm font-bold text-text">{contract.vendorName}</p>
                  <p className="mt-1 text-xs text-gray-500">{contract.lane} · {contract.allocationRank}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'lanes' && (
        <div className="space-y-4">
          {auction.lanes.map((lane) => (
            <Card key={lane.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>{lane.lane}</CardTitle>
                <StatusBadge status={auction.status} />
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Vehicle Type</p>
                  <p className="mt-1 text-sm text-text">{lane.vehicleType}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Ceiling</p>
                  <p className="mt-1 text-sm text-text"><CurrencyDisplay amount={lane.ceilingRate} /></p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Rate Unit</p>
                  <p className="mt-1 text-sm text-text">{lane.rateUnit.replace('PER_', 'Per ')}</p>
                </div>
                {auction.type === 'LOT' && lane.estimatedTrips != null && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Estimated Trips</p>
                    <p className="mt-1 text-sm text-text">{lane.estimatedTrips}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Lane Timer</p>
                  <div className="mt-1"><SLACountdown deadline={lane.timerEndsAt} showLabel={false} /></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'ranking' && (
        <div className="space-y-4">
          {auction.lanes.map((lane) => (
            <Card key={lane.id}>
              <CardHeader>
                <CardTitle>{lane.lane} Ranking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lane.ranking.length === 0 && <p className="text-sm text-gray-600">No valid bids recorded on this lane.</p>}
                {lane.ranking.map((bid) => (
                  <div key={`${lane.id}-${bid.vendorId}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div>
                      <p className="text-sm font-bold text-text">R{bid.rank} · {bid.vendorName}</p>
                      <p className="mt-1 text-xs text-gray-600">{formatDateTime(bid.timestamp)}</p>
                    </div>
                    <CurrencyDisplay amount={bid.amount} className="text-base" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'award' && (
        <div className="space-y-4">
          {auction.type === 'SPOT' && (
            <Card>
              <CardHeader>
                <CardTitle>Spot Award</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">Spot awards stay inside Auctions. Procurement can confirm any ranked bidder, and the selected winner will be shown in the award record. No contract is created.</p>
                <Button
                  disabled={auction.status !== 'COMPLETED' || spotLane?.ranking.length === 0}
                  onClick={() => {
                    if (!spotLane) return
                    openAwardModal({ scope: 'SPOT', laneId: spotLane.id }, 'R1')
                  }}
                >
                  Award Spot
                </Button>
              </CardContent>
            </Card>
          )}

          {auction.type !== 'SPOT' && auction.lanes.map((lane) => (
            <Card key={lane.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>{lane.lane}</CardTitle>
                {lane.awardDecision ? <StatusBadge status="AWARDED" /> : <StatusBadge status={auction.status} />}
              </CardHeader>
              <CardContent className="space-y-4">
                {lane.ranking.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
                    No valid bids. Procurement can keep this lane unawarded.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {lane.ranking.map((bid) => (
                        <div key={`${lane.id}-${bid.vendorId}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div>
                            <p className="text-sm font-bold text-text">R{bid.rank} · {bid.vendorName}</p>
                            <p className="mt-1 text-xs text-gray-600">{formatDateTime(bid.timestamp)}</p>
                          </div>
                          <CurrencyDisplay amount={bid.amount} className="text-base" />
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-sm font-bold text-text">Award Selection</p>
                      <p className="mt-1 text-xs text-gray-600">R1, R2, and R3 are the auction ranks used across auctions, awards, and contracts.</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        {([
                          { rank: 'R1' as const, allocation: lane.allocationMode === 'SINGLE' ? 100 : lane.allocation.r1 },
                          { rank: 'R2' as const, allocation: lane.allocation.r2 },
                          { rank: 'R3' as const, allocation: lane.allocation.r3 },
                        ]
                          .filter((entry) => entry.allocation > 0)
                          .map((entry) => (
                            <div key={`${lane.id}-${entry.rank}`} className="rounded-xl border border-gray-200 bg-white p-4">
                              <p className="text-sm font-bold text-text">{entry.rank}</p>
                              <p className="mt-1 text-xs text-gray-600">{entry.allocation}% allocation</p>
                              <Select
                                value={getDefaultSelection(lane.id, entry.rank)}
                                onChange={(event) => {
                                  const value = event.target.value as 'R1' | 'R2' | 'R3'
                                  setAwardSelection((current) => ({
                                    ...current,
                                    [lane.id]: {
                                      ...current[lane.id],
                                      [entry.rank]: value,
                                    },
                                  }))
                                }}
                                className="mt-3"
                              >
                                {lane.ranking.map((bid) => (
                                  <option key={`${lane.id}-${entry.rank}-${bid.rank}`} value={`R${bid.rank}`}>
                                    {`R${bid.rank}`} - {bid.vendorName}
                                  </option>
                                ))}
                              </Select>
                            </div>
                          )))
                        }
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-gray-600">Pick the bidder for each allocation rank, then finalize the lane award.</p>
                        <Button
                          disabled={auction.status !== 'COMPLETED' || lane.awardDecision !== undefined || lane.ranking.length === 0}
                          onClick={() => openAwardModal({ scope: 'LANE', laneId: lane.id }, 'R1')}
                        >
                          Final Award
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {lane.awardDecision && (
                  <div className="rounded-xl border border-success/30 bg-success/10 p-4">
                    <p className="text-sm font-semibold text-success">Award decision saved</p>
                    <div className="mt-3 space-y-2">
                      {lane.awardDecision.map((decision) => (
                        <div key={`${lane.id}-${decision.vendorId}`} className="flex items-center justify-between text-sm text-success">
                          <span>{decision.allocationRank} · {decision.vendorName} · from {decision.awardedBidRank} · {decision.allocationPercent}%</span>
                          <CurrencyDisplay amount={decision.awardedAmount} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Auction</DialogTitle>
            <DialogDescription>This action keeps the auction as a terminal record. Vendors would already have seen it if it was live.</DialogDescription>
          </DialogHeader>
          <Input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Back</Button>
            <Button variant="destructive" onClick={handleCancel}>Confirm Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(awardModal)} onOpenChange={(open) => !open && setAwardModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{awardModal?.scope === 'SPOT' ? 'Award Spot Auction' : 'Final Award Lane'}</DialogTitle>
            <DialogDescription>
              {awardModal?.scope === 'SPOT'
                ? 'Select the winning bidder for the spot auction. The selected rank is shown in the award record.'
                : 'Review the selected allocation mapping and confirm the final award for this lane.'}
            </DialogDescription>
          </DialogHeader>
          {awardModal && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-bold text-text">
                  {awardModal.scope === 'SPOT' ? spotLane?.lane : auction.lanes.find((lane) => lane.id === awardModal.laneId)?.lane}
                </p>
                {awardModal.scope === 'SPOT' && spotLane && (
                  <p className="mt-1 text-xs text-gray-600">Spot ranks are shown in bid order. R1 is the current top bidder.</p>
                )}
                {awardModal.scope === 'LANE' && (
                  <p className="mt-1 text-xs text-gray-600">R1, R2, and R3 are the auction ranks used across auctions, awards, and contracts.</p>
                )}
              </div>

              {awardModal.scope === 'SPOT' ? (
                <Field label="Award To">
                  <Select
                    value={awardModalBidRank}
                    onChange={(event) => setAwardModalBidRank(event.target.value as 'R1' | 'R2' | 'R3')}
                  >
                    {(spotLane?.ranking ?? []).map((bid) => (
                      <option key={`${awardModal.laneId}-${bid.rank}`} value={`R${bid.rank}`}>
                        {`R${bid.rank}`} - {bid.vendorName}
                      </option>
                    ))}
                  </Select>
                  {awardModalBidRank !== 'R1' && (
                    <div className="mt-4">
                      <Field label="Reason">
                      <Input
                        value={awardModalReason}
                        onChange={(event) => setAwardModalReason(event.target.value)}
                        placeholder="Required when awarding away from R1"
                      />
                      </Field>
                    </div>
                  )}
                </Field>
              ) : (
                <div className="space-y-3">
                  {getLaneSelectionRows(awardModal.laneId).map((entry) => (
                    <div key={`${awardModal.laneId}-${entry.allocationRank}`} className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-sm font-bold text-text">
                        {entry.allocationRank} · {entry.vendorName}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">{entry.allocationPercent}% allocation</p>
                    </div>
                  ))}
                  {getLaneSelectionRows(awardModal.laneId).some((entry) => entry.isOverride) && (
                    <Field label="Reason">
                      <Input
                        value={awardModalReason}
                        onChange={(event) => setAwardModalReason(event.target.value)}
                        placeholder="Required when awarding away from the default rank"
                      />
                    </Field>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAwardModal(null)}>Cancel</Button>
            <Button onClick={confirmAward}>Confirm Award</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
