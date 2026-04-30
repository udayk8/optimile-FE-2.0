import { create } from 'zustand'
import { MOCK_AUCTIONS, MOCK_BOOKINGS, MOCK_CONTRACTS, MOCK_VENDORS } from '@admin/utils/mock-data'
import type {
  Auction,
  AuctionEvent,
  AuctionLane,
  AuctionType,
  BookingReference,
  Contract,
  VendorOption,
} from '@admin/types'

interface CreateAuctionInput {
  type: AuctionType
  title: string
  bookingId?: string
  region?: string
  minBidDecrement: number
  extensionTriggerMinutes: number
  extensionDurationMinutes: number
  maxExtensions: number
  biddingWindowMinutes: number
  contractStartDate?: string
  contractEndDate?: string
  lanes: Omit<AuctionLane, 'id' | 'timerEndsAt' | 'extensionCount' | 'bidCount' | 'ranking' | 'awardDecision' | 'rejectionReason'>[]
  invitedVendorIds: string[]
  createdBy: string
  createdByRole: Auction['createdByRole']
  launchNow?: boolean
}

interface AppState {
  auctions: Auction[]
  contracts: Contract[]
  bookings: BookingReference[]
  vendors: VendorOption[]
  createAuction: (input: CreateAuctionInput) => string
  launchAuction: (auctionId: string, actor: string) => void
  cancelAuction: (auctionId: string, actor: string, reason: string) => void
  awardSpotAuction: (auctionId: string, actor: string, bidRank?: 'R1' | 'R2' | 'R3') => void
  awardLaneToAllocationRank: (
    auctionId: string,
    laneId: string,
    allocationRank: 'R1' | 'R2' | 'R3',
    bidRank: 'R1' | 'R2' | 'R3',
    actor: string,
    reason?: string
  ) => void
  finalizeLaneAward: (
    auctionId: string,
    laneId: string,
    selections: { allocationRank: 'R1' | 'R2' | 'R3'; bidRank: 'R1' | 'R2' | 'R3' }[],
    actor: string,
    reason?: string
  ) => void
  rejectLane: (auctionId: string, laneId: string, actor: string, reason: string) => void
  resetStore: () => void
}

function makeEvent(id: string, type: AuctionEvent['type'], message: string, actor: string): AuctionEvent {
  return {
    id,
    type,
    message,
    actor,
    timestamp: new Date().toISOString(),
  }
}

function toRankIndex(rank: 'R1' | 'R2' | 'R3') {
  if (rank === 'R1') return 0
  if (rank === 'R2') return 1
  return 2
}

export const useAppStore = create<AppState>((set) => ({
  auctions: [...MOCK_AUCTIONS],
  contracts: [...MOCK_CONTRACTS],
  bookings: [...MOCK_BOOKINGS],
  vendors: [...MOCK_VENDORS],

  createAuction: (input) => {
    const auctionId = `AUC-${input.type}-${Math.floor(100 + Math.random() * 900)}`
    const now = new Date()
    const endTime = new Date(now.getTime() + input.biddingWindowMinutes * 60 * 1000).toISOString()
    const createdAuction: Auction = {
      id: auctionId,
      title: input.title,
      type: input.type,
      status: input.launchNow ? 'LIVE' : 'DRAFT',
      createdBy: input.createdBy,
      createdByRole: input.createdByRole,
      createdAt: now.toISOString(),
      startAt: input.launchNow ? now.toISOString() : undefined,
      contractStartDate: input.contractStartDate,
      contractEndDate: input.contractEndDate,
      minBidDecrement: input.minBidDecrement,
      extensionTriggerMinutes: input.extensionTriggerMinutes,
      extensionDurationMinutes: input.extensionDurationMinutes,
      maxExtensions: input.maxExtensions,
      biddingWindowMinutes: input.biddingWindowMinutes,
      bookingId: input.bookingId,
      region: input.region,
      invitedVendorIds: input.invitedVendorIds,
      awardDeadline:
        input.type === 'SPOT'
          ? new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
          : new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      lanes: input.lanes.map((lane, index) => ({
        ...lane,
        id: `${auctionId}-L${index + 1}`,
        timerEndsAt: endTime,
        extensionCount: 0,
        bidCount: 0,
        ranking: [],
      })),
      auditTrail: [
        makeEvent(`${auctionId}-evt-1`, 'CREATED', `${input.type} auction draft created.`, input.createdBy),
        ...(input.launchNow ? [makeEvent(`${auctionId}-evt-2`, 'LAUNCHED', 'Auction launched immediately after creation.', input.createdBy)] : []),
      ],
    }

    set((state) => ({ auctions: [createdAuction, ...state.auctions] }))
    return auctionId
  },

  launchAuction: (auctionId, actor) =>
    set((state) => ({
      auctions: state.auctions.map((auction) =>
        auction.id !== auctionId || auction.status !== 'DRAFT'
          ? auction
          : {
              ...auction,
              status: 'LIVE',
              startAt: new Date().toISOString(),
              auditTrail: [
                ...auction.auditTrail,
                makeEvent(`${auction.id}-evt-launch-${auction.auditTrail.length + 1}`, 'LAUNCHED', 'Auction launched and configuration locked.', actor),
              ],
            }
      ),
    })),

  cancelAuction: (auctionId, actor, reason) =>
    set((state) => ({
      auctions: state.auctions.map((auction) =>
        auction.id !== auctionId || auction.status === 'AWARDED' || auction.status === 'CANCELLED'
          ? auction
          : {
              ...auction,
              status: 'CANCELLED',
              auditTrail: [
                ...auction.auditTrail,
                makeEvent(`${auction.id}-evt-cancel-${auction.auditTrail.length + 1}`, 'CANCELLED', `Auction cancelled. Reason: ${reason}`, actor),
              ],
            }
      ),
    })),

  awardSpotAuction: (auctionId, actor, bidRank = 'R1') =>
    set((state) => ({
      auctions: state.auctions.map((auction) => {
        if (auction.id !== auctionId || auction.type !== 'SPOT') return auction
        const winningBid = auction.lanes[0]?.ranking[toRankIndex(bidRank)]
        if (!winningBid) return auction
        return {
          ...auction,
          status: 'AWARDED',
          completedAt: auction.completedAt ?? new Date().toISOString(),
          lanes: auction.lanes.map((lane) => ({
            ...lane,
            awardDecision: winningBid
              ? [
                  {
                    vendorId: winningBid.vendorId,
                    vendorName: winningBid.vendorName,
                    allocationRank: 'R1',
                    awardedBidRank: bidRank,
                    awardedAmount: winningBid.amount,
                    allocationPercent: 100,
                  },
                ]
              : undefined,
          })),
          auditTrail: [
            ...auction.auditTrail,
            makeEvent(`${auction.id}-evt-award-${auction.auditTrail.length + 1}`, 'AWARDED', `Spot auction awarded to ${bidRank} vendor.`, actor),
          ],
        }
      }),
    })),

  awardLaneToAllocationRank: (auctionId, laneId, allocationRank, bidRank, actor, reason) =>
    set((state) => {
      const auction = state.auctions.find((item) => item.id === auctionId)
      if (!auction) return state

      const lane = auction.lanes.find((item) => item.id === laneId)
      if (!lane) return state

      const selectedBid = lane.ranking[toRankIndex(bidRank)]
      if (!selectedBid) return state

      const defaultSlots =
        lane.allocationMode === 'SINGLE'
          ? [{ allocationRank: 'R1' as const, allocationPercent: 100, awardedBidRank: 'R1' as const }]
          : [
              { allocationRank: 'R1' as const, allocationPercent: lane.allocation.r1, awardedBidRank: 'R1' as const },
              { allocationRank: 'R2' as const, allocationPercent: lane.allocation.r2, awardedBidRank: 'R2' as const },
              { allocationRank: 'R3' as const, allocationPercent: lane.allocation.r3, awardedBidRank: 'R3' as const },
            ].filter((entry) => entry.allocationPercent > 0)

      const currentAwardDecision = lane.awardDecision ? [...lane.awardDecision] : defaultSlots
        .map((entry) => {
          const bid = lane.ranking[toRankIndex(entry.awardedBidRank)]
          if (!bid) return null
          return {
            vendorId: bid.vendorId,
            vendorName: bid.vendorName,
            allocationRank: entry.allocationRank,
            awardedBidRank: entry.awardedBidRank,
            awardedAmount: bid.amount,
            allocationPercent: entry.allocationPercent,
            overrideReason: undefined,
          }
        })
        .filter(Boolean)

      const allocationIndex = currentAwardDecision.findIndex((entry) => entry!.allocationRank === allocationRank)
      if (allocationIndex === -1) return state

      currentAwardDecision[allocationIndex] = {
        vendorId: selectedBid.vendorId,
        vendorName: selectedBid.vendorName,
        allocationRank,
        awardedBidRank: bidRank,
        awardedAmount: selectedBid.amount,
        allocationPercent: currentAwardDecision[allocationIndex]!.allocationPercent,
        overrideReason: bidRank !== allocationRank ? reason : undefined,
      }

      const awardDecision = currentAwardDecision as NonNullable<typeof lane.awardDecision>

      const newContracts: Contract[] =
        auction.type === 'SPOT'
          ? []
          : awardDecision.map((decision) => ({
              id: `CNT-${Math.floor(1000 + Math.random() * 9000)}`,
              sourceAuctionId: auction.id,
              contractType: auction.type as 'BULK' | 'LOT',
              vendorId: decision.vendorId,
              vendorName: decision.vendorName,
              lane: lane.lane,
              region: lane.region,
              vehicleType: lane.vehicleType,
              contractedRate: decision.awardedAmount,
              rateUnit: lane.rateUnit,
              volumeAllocationPercent: decision.allocationPercent,
              allocationRank: decision.allocationRank,
              startDate: auction.contractStartDate ?? new Date().toISOString().slice(0, 10),
              endDate: auction.contractEndDate ?? new Date().toISOString().slice(0, 10),
              estimatedTrips: lane.estimatedTrips ?? 0,
              status: 'ACTIVE' as const,
              r1OverrideReason: decision.overrideReason,
              rateSyncedToTms: true,
              placementFailures: [],
              rateDeviationOpen: false,
            }))

      const contractsWithoutCurrentLane = state.contracts.filter(
        (contract) => !(contract.sourceAuctionId === auction.id && contract.lane === lane.lane)
      )

      return {
        auctions: state.auctions.map((item) => {
          if (item.id !== auctionId) return item

          const updatedLanes = item.lanes.map((itemLane) =>
            itemLane.id !== laneId
              ? itemLane
              : {
                  ...itemLane,
                  awardDecision,
                }
          )

          const allAwarded = updatedLanes.every(
            (itemLane) => itemLane.awardDecision || itemLane.rejectionReason || item.status === 'NO_BIDS'
          )

          return {
            ...item,
            status: allAwarded ? 'AWARDED' : item.status,
            lanes: updatedLanes,
            auditTrail: [
              ...item.auditTrail,
              ...(bidRank !== allocationRank
                ? [makeEvent(`${item.id}-evt-override-${item.auditTrail.length + 1}`, 'OVERRIDE', `${lane.lane} ${allocationRank} assigned to ${bidRank} with reason: ${reason}`, actor)]
                : []),
              makeEvent(`${item.id}-evt-award-${item.auditTrail.length + 2}`, 'AWARDED', `${lane.lane} awarded and contract output prepared.`, actor),
            ],
          }
        }),
        contracts: [...newContracts, ...contractsWithoutCurrentLane],
      }
    }),

  finalizeLaneAward: (auctionId, laneId, selections, actor, reason) =>
    set((state) => {
      const auction = state.auctions.find((item) => item.id === auctionId)
      if (!auction) return state

      const lane = auction.lanes.find((item) => item.id === laneId)
      if (!lane) return state

      const selectedEntries = selections
        .map((selection) => {
          const bid = lane.ranking[toRankIndex(selection.bidRank)]
          if (!bid) return null
          return {
            vendorId: bid.vendorId,
            vendorName: bid.vendorName,
            allocationRank: selection.allocationRank,
            awardedBidRank: selection.bidRank,
            awardedAmount: bid.amount,
            allocationPercent:
              selection.allocationRank === 'R1' && lane.allocationMode === 'SINGLE'
                ? 100
                : lane.allocation[selection.allocationRank.toLowerCase() as 'r1' | 'r2' | 'r3'],
            overrideReason: selection.bidRank !== selection.allocationRank ? reason : undefined,
          }
        })
        .filter(Boolean) as NonNullable<typeof lane.awardDecision>

      if (selectedEntries.length === 0) return state

      const contractsWithoutCurrentLane = state.contracts.filter(
        (contract) => !(contract.sourceAuctionId === auction.id && contract.lane === lane.lane)
      )

      const newContracts: Contract[] =
        auction.type === 'SPOT'
          ? []
          : selectedEntries.map((decision) => ({
              id: `CNT-${Math.floor(1000 + Math.random() * 9000)}`,
              sourceAuctionId: auction.id,
              contractType: auction.type as 'BULK' | 'LOT',
              vendorId: decision.vendorId,
              vendorName: decision.vendorName,
              lane: lane.lane,
              region: lane.region,
              vehicleType: lane.vehicleType,
              contractedRate: decision.awardedAmount,
              rateUnit: lane.rateUnit,
              volumeAllocationPercent: decision.allocationPercent,
              allocationRank: decision.allocationRank,
              startDate: auction.contractStartDate ?? new Date().toISOString().slice(0, 10),
              endDate: auction.contractEndDate ?? new Date().toISOString().slice(0, 10),
              estimatedTrips: lane.estimatedTrips ?? 0,
              status: 'ACTIVE' as const,
              r1OverrideReason: decision.overrideReason,
              rateSyncedToTms: true,
              placementFailures: [],
              rateDeviationOpen: false,
            }))

      return {
        auctions: state.auctions.map((item) => {
          if (item.id !== auctionId) return item

          const updatedLanes = item.lanes.map((itemLane) =>
            itemLane.id !== laneId
              ? itemLane
              : {
                  ...itemLane,
                  awardDecision: selectedEntries,
                }
          )

          const allAwarded = updatedLanes.every(
            (itemLane) => itemLane.awardDecision || itemLane.rejectionReason || item.status === 'NO_BIDS'
          )

          return {
            ...item,
            status: allAwarded ? 'AWARDED' : item.status,
            lanes: updatedLanes,
            completedAt: allAwarded ? new Date().toISOString() : item.completedAt,
            auditTrail: [
              ...item.auditTrail,
              makeEvent(`${item.id}-evt-award-${item.auditTrail.length + 1}`, 'AWARDED', `${lane.lane} awarded and contract output prepared.`, actor),
            ],
          }
        }),
        contracts: [...newContracts, ...contractsWithoutCurrentLane],
      }
    }),

  rejectLane: (auctionId, laneId, actor, reason) =>
    set((state) => ({
      auctions: state.auctions.map((auction) =>
        auction.id !== auctionId
          ? auction
          : {
              ...auction,
              lanes: auction.lanes.map((lane) =>
                lane.id !== laneId
                  ? lane
                  : {
                      ...lane,
                      rejectionReason: reason,
                    }
              ),
              auditTrail: [
                ...auction.auditTrail,
                makeEvent(`${auction.id}-evt-reject-${auction.auditTrail.length + 1}`, 'CANCELLED', `${laneId} rejected during award. Reason: ${reason}`, actor),
              ],
            }
      ),
    })),

  resetStore: () =>
    set(() => ({
      auctions: [...MOCK_AUCTIONS],
      contracts: [...MOCK_CONTRACTS],
      bookings: [...MOCK_BOOKINGS],
      vendors: [...MOCK_VENDORS],
    })),
}))
