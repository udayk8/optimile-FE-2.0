import { useCallback, useEffect, useMemo, useState } from 'react'
import { isValidLaneCode, normalizeLaneCode, splitLaneCode } from '@shared-utils'
import type {
  Auction,
  AuctionBid,
  AuctionLane,
  AuctionState,
  Contract,
  ContractStatus,
  Location,
  Notification,
} from '@vendor/types'
import { useAppStore } from '@vendor/stores/app.store'

/**
 * Cross-module integration with auction-web.
 *
 * auction-web (the ops/procurement app) authors auctions and contracts into a
 * shared localStorage key. Both apps run inside the one shell (same origin), so
 * the Vendor Portal reads that SAME key to:
 *   - surface live auctions to the logged-in vendor,
 *   - place bids back into each lane's ranking (auction-web reads them on its
 *     ranking/award screens),
 *   - read the contract records produced once an auction is awarded.
 *
 * Mirrors the finance↔vendor bridge (`vendorInvoiceFlow`). This file translates
 * the auction-web data shapes into the Vendor Portal's own `Auction`/`Contract`
 * types so existing pages render unchanged. When the key is absent (standalone
 * vendor build, or auction-web never opened), the hooks return empty and pages
 * fall back to their local demo store.
 */
const AUCTION_STORE_KEY = 'optimile.auction-store'
const SESSION_CONTEXT_KEY = 'optimile.session.context'

// ── auction-web data shapes (read-only mirror; kept local to preserve the
// one-way module boundary — vendor-web never imports from @auction/*). ──
interface SourceLaneBid {
  rank: number
  vendorId: string
  vendorName: string
  amount: number
  timestamp: string
  tenantId?: string
}
interface SourceLane {
  id: string
  lane: string
  region?: string
  vehicleType: string
  capacityMt: number
  rateUnit: 'PER_TRIP' | 'PER_MT' | 'PER_KM'
  ceilingRate: number
  estimatedTrips?: number
  eligibleVendorIds: string[]
  timerEndsAt: string
  extensionCount?: number
  bidCount: number
  ranking: SourceLaneBid[]
  awardDecision?: { vendorId: string; vendorName: string; allocationRank: string; awardedAmount: number }[]
  rejectionReason?: string
}
interface SourceAuction {
  id: string
  title: string
  type: 'SPOT' | 'BULK' | 'LOT'
  status: 'DRAFT' | 'LIVE' | 'COMPLETED' | 'AWARDED' | 'NO_BIDS' | 'CANCELLED'
  tenantId?: string
  createdAt: string
  startAt?: string
  completedAt?: string
  minBidDecrement: number
  biddingWindowMinutes: number
  extensionTriggerMinutes?: number
  extensionDurationMinutes?: number
  maxExtensions?: number
  region?: string
  invitedVendorIds: string[]
  awardDeadline: string
  lanes: SourceLane[]
}
interface SourceContract {
  id: string
  sourceAuctionId: string
  contractType?: 'BULK' | 'LOT' | 'SPOT'
  vendorId: string
  vendorName: string
  lane: string
  region?: string
  vehicleType: string
  contractedRate: number
  rateUnit: 'PER_TRIP' | 'PER_MT' | 'PER_KM'
  volumeAllocationPercent: number
  awardedAt?: string
  oneTime?: boolean
  consumedByBookingId?: string
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'TERMINATED' | 'USED'
}
interface SourceStore {
  auctions: SourceAuction[]
  contracts: SourceContract[]
}

// A live auction whose end time has passed is ended (awaiting award) — show
// it as Ended with a Details-only action instead of an expired live row.
// Applied by pages on top of either source (shared bridge or local demo
// store) so the rule holds even for local-store fallback data.
export function withEffectiveState(auction: Auction): Auction {
  if (auction.state === 'LIVE' && auction.endTime && new Date(auction.endTime).getTime() <= Date.now()) {
    return { ...auction, state: 'PENDING_AWARD' }
  }
  return auction
}

export interface VendorIdentity {
  vendorId: string
  vendorName: string
  tenantId?: string
}

export function readIdentity(): VendorIdentity {
  const fallback: VendorIdentity = { vendorId: 'v-001', vendorName: 'My Transport Co' }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(SESSION_CONTEXT_KEY)
    if (!raw) return fallback
    const session = JSON.parse(raw) as {
      loginType?: string
      vendorId?: string
      vendorName?: string
      tenantId?: string
    }
    if (session?.loginType !== 'VENDOR') return fallback
    return {
      vendorId: session.vendorId ?? fallback.vendorId,
      vendorName: session.vendorName ?? fallback.vendorName,
      tenantId: session.tenantId,
    }
  } catch {
    return fallback
  }
}

function readStore(): SourceStore {
  if (typeof window === 'undefined') return { auctions: [], contracts: [] }
  const raw = window.localStorage.getItem(AUCTION_STORE_KEY)
  if (!raw) return { auctions: [], contracts: [] }
  try {
    const parsed = JSON.parse(raw) as Partial<SourceStore>
    return { auctions: parsed.auctions ?? [], contracts: parsed.contracts ?? [] }
  } catch {
    return { auctions: [], contracts: [] }
  }
}

function writeStore(store: SourceStore) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUCTION_STORE_KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent('optimile-auction-store'))
}

// "Mumbai → Delhi" / "Mumbai -> Delhi" → ["Mumbai", "Delhi"];
// lane codes ("MUM-BLR") split into their two location codes.
function splitLane(lane: string): [string, string] {
  const codeParts = splitLaneCode(lane)
  if (codeParts) return codeParts
  const parts = lane.split(/→|->/).map((p) => p.trim())
  return [parts[0] ?? lane, parts[1] ?? '']
}

function toLocation(city: string): Location {
  return { name: city, city, state: '' }
}

function mapState(source: SourceAuction, won: boolean): AuctionState {
  switch (source.status) {
    case 'LIVE': {
      if (source.startAt && new Date(source.startAt).getTime() > Date.now()) return 'UPCOMING'
      // A live auction whose timers have all run out is ended (awaiting
      // award) — never show it as still-live/expired or allow further
      // bidding. Mirrors auction-web's auto-complete sweep (last lane timer).
      // There is no award-deadline SLA: only the lane bid timers matter.
      const laneEnds = source.lanes
        .map((lane) => new Date(lane.timerEndsAt).getTime())
        .filter((time) => !Number.isNaN(time))
      return laneEnds.length && Math.max(...laneEnds) <= Date.now() ? 'PENDING_AWARD' : 'LIVE'
    }
    case 'COMPLETED':
      return 'PENDING_AWARD'
    case 'AWARDED':
      return won ? 'AWARDED' : 'NOT_AWARDED'
    case 'NO_BIDS':
      return 'NOT_AWARDED'
    case 'CANCELLED':
      return 'CANCELLED'
    default:
      return 'UPCOMING'
  }
}

function mapLane(lane: SourceLane, identity: VendorIdentity): AuctionLane {
  const [origin, destination] = splitLane(lane.lane)
  const best = lane.ranking.length
    ? Math.min(...lane.ranking.map((b) => b.amount))
    : undefined
  const myName = identity.vendorName.toLowerCase()
  const myBid = lane.ranking.find(
    (b) => b.vendorId === identity.vendorId || b.vendorName.toLowerCase() === myName,
  )
  return {
    id: lane.id,
    laneDetails: { origin: toLocation(origin), destination: toLocation(destination) },
    volumeRequirement: lane.capacityMt
      ? { estimatedVolume: lane.capacityMt, unit: 'MT', frequency: 'MONTHLY' }
      : undefined,
    basePrice: lane.ceilingRate || undefined,
    currentBestBid: best,
    bidCount: lane.ranking.length,
    myRank: myBid?.rank,
    // Anonymized live leaderboard — top three bid amounts (L1/L2/L3).
    topBids: [...lane.ranking]
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3)
      .map((b) => b.amount),
  }
}

function mapAuction(source: SourceAuction, identity: VendorIdentity, contracts: SourceContract[] = []): Auction {
  const myId = identity.vendorId
  const myName = identity.vendorName.toLowerCase()
  const won = source.lanes.some((l) =>
    (l.awardDecision ?? []).some((d) => d.vendorId === myId || d.vendorName.toLowerCase() === myName),
  )
  // Contract produced for this vendor by this auction (BULK/LOT awards) so
  // the sourcing list can deep-link straight to the won contract.
  const myContract = contracts.find(
    (c) =>
      c.sourceAuctionId === source.id &&
      (c.vendorId === myId || c.vendorName.toLowerCase() === myName),
  )
  const vendorBids: AuctionBid[] = source.lanes.flatMap((lane) =>
    lane.ranking
      .filter((b) => b.vendorId === myId || b.vendorName.toLowerCase() === myName)
      .map((b) => ({
        id: `${lane.id}-${b.vendorId}`,
        laneId: lane.id,
        amount: b.amount,
        placedAt: b.timestamp,
        status: 'ACTIVE' as const,
      })),
  )
  const firstLane = source.lanes[0]
  return {
    id: source.id,
    type: source.type,
    customerName: source.title,
    vehicleTypeRequired: firstLane?.vehicleType ?? '—',
    startTime: source.startAt ?? source.createdAt,
    endTime: firstLane?.timerEndsAt ?? source.awardDeadline,
    state: mapState(source, won),
    lanes: source.lanes.map((lane) => ({
      ...mapLane(lane, identity),
      minBidDecrement: source.minBidDecrement,
    })),
    vendorBids,
    pricingUnit: firstLane?.rateUnit,
    awardDate: source.completedAt,
    contractReference: myContract?.id,
    createdAt: source.createdAt,
  }
}

// Visibility is tenant-scoped, NOT invite-scoped: once an auction is created it
// is visible to every vendor onboarded under the same tenant. Drafts are hidden.
// Auctions with no tenant stamp (legacy/seed data) stay visible to all so the
// demo dataset still shows up.
function isVisibleToVendor(source: SourceAuction, identity: VendorIdentity): boolean {
  if (source.status === 'DRAFT') return false
  if (!source.tenantId || !identity.tenantId) return true
  return source.tenantId === identity.tenantId
}

function mapContractStatus(status: SourceContract['status']): ContractStatus {
  if (status === 'TERMINATED') return 'TERMINATED'
  if (status === 'EXPIRED') return 'EXPIRED'
  if (status === 'USED') return 'USED'
  return 'ACTIVE'
}

function mapContract(source: SourceContract): Contract {
  const [origin, destination] = splitLane(source.lane)
  return {
    id: source.id,
    laneCode: isValidLaneCode(source.lane) ? normalizeLaneCode(source.lane) : undefined,
    laneDetails: { origin: toLocation(origin), destination: toLocation(destination) },
    source: 'AUCTION_WIN',
    rateCard: [
      {
        vehicleType: source.vehicleType,
        rateType: source.rateUnit,
        rate: source.contractedRate,
        surcharges: [],
      },
    ],
    volumeAllocation: { volume: source.volumeAllocationPercent, unit: '%', frequency: 'MONTHLY' },
    paymentTerms: { creditPeriodDays: 30, billingCycle: 'MONTHLY' },
    slaClauses: [],
    penaltyClauses: [],
    validityFrom: source.startDate,
    validityTo: source.endDate,
    renewalTerms: 'Auto-generated from auction award.',
    status: mapContractStatus(source.status),
    amendments: [],
    awardedOn: source.awardedAt,
    contractKind: source.contractType,
    oneTime: source.oneTime,
    consumedByBookingId: source.consumedByBookingId,
    pdfUrl: `/contracts/${source.id}.pdf`,
    createdAt: source.startDate,
  }
}

/** Re-renders the caller whenever the shared auction store changes. */
function useStoreRevision(): number {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const bump = () => setRevision((v) => v + 1)
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUCTION_STORE_KEY) bump()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('optimile-auction-store', bump)
    window.addEventListener('focus', bump)
    // Time-based states (LIVE → PENDING_AWARD when the timer lapses) are
    // computed at read time, so tick periodically to flip them on screen.
    const timer = window.setInterval(bump, 15_000)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('optimile-auction-store', bump)
      window.removeEventListener('focus', bump)
      window.clearInterval(timer)
    }
  }, [])
  return revision
}

export interface SourcingBridge {
  /** Auctions visible to the logged-in vendor, in the Portal's own shape. */
  auctions: Auction[]
  /** True when auction-web has populated the shared store. */
  hasShared: boolean
  /** Place (or revise) this vendor's bid on a lane; writes back to auction-web. */
  placeBid: (auctionId: string, laneId: string, amount: number) => void
}

export function useSourcingBridge(): SourcingBridge {
  const revision = useStoreRevision()
  const identity = useMemo(() => readIdentity(), [])

  const auctions = useMemo(() => {
    const store = readStore()
    return store.auctions
      .filter((a) => isVisibleToVendor(a, identity))
      .map((a) => mapAuction(a, identity, store.contracts))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, identity])

  const hasShared = useMemo(() => readStore().auctions.length > 0, [revision])

  const placeBid = useCallback(
    (auctionId: string, laneId: string, amount: number) => {
      const store = readStore()
      const now = Date.now()
      const timestamp = new Date(now).toISOString()
      const auctions = store.auctions.map((auction) => {
        if (auction.id !== auctionId) return auction
        // Stale-tab guard: reject bids on auctions that are no longer live
        // (manually completed, cancelled, or every lane timer lapsed).
        if (auction.status !== 'LIVE') return auction
        if (auction.startAt && new Date(auction.startAt).getTime() > now) return auction
        return {
          ...auction,
          lanes: auction.lanes.map((lane) => {
            if (lane.id !== laneId) return lane
            // Lane timer already lapsed — bid arrives too late.
            const laneEndsAt = new Date(lane.timerEndsAt).getTime()
            if (!Number.isNaN(laneEndsAt) && laneEndsAt <= now) return lane
            // Ceiling enforcement — bids above the lane ceiling are rejected.
            if (lane.ceilingRate > 0 && amount > lane.ceilingRate) return lane
            const others = lane.ranking.filter((b) => b.vendorId !== identity.vendorId)
            const ranking = [
              ...others,
              {
                rank: 0,
                vendorId: identity.vendorId,
                vendorName: identity.vendorName,
                amount,
                timestamp,
                tenantId: identity.tenantId,
              },
            ]
              .sort((a, b) => a.amount - b.amount)
              .map((b, index) => ({ ...b, rank: index + 1 }))
            // Anti-sniping auto-extension: a bid inside the trigger window
            // pushes the lane timer out, up to maxExtensions times.
            const triggerMs = (auction.extensionTriggerMinutes ?? 0) * 60_000
            const extensionMs = (auction.extensionDurationMinutes ?? 0) * 60_000
            const extensionCount = lane.extensionCount ?? 0
            const shouldExtend =
              triggerMs > 0 &&
              extensionMs > 0 &&
              extensionCount < (auction.maxExtensions ?? 0) &&
              laneEndsAt - now <= triggerMs
            return {
              ...lane,
              ranking,
              bidCount: ranking.length,
              ...(shouldExtend
                ? {
                    timerEndsAt: new Date(laneEndsAt + extensionMs).toISOString(),
                    extensionCount: extensionCount + 1,
                  }
                : {}),
            }
          }),
        }
      })
      writeStore({ ...store, auctions })
    },
    [identity],
  )

  return { auctions, hasShared, placeBid }
}

/** Contracts awarded to the logged-in vendor via auction-web, Portal-shaped. */
export function useAuctionContractsBridge(): Contract[] {
  const revision = useStoreRevision()
  const identity = useMemo(() => readIdentity(), [])
  return useMemo(() => {
    const store = readStore()
    const myName = identity.vendorName.toLowerCase()
    return store.contracts
      .filter((c) => c.vendorId === identity.vendorId || c.vendorName.toLowerCase() === myName)
      .map(mapContract)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, identity])
}

/**
 * Derives sourcing notifications from the shared auction store and pushes
 * them into the vendor notification feed. Stable per-event ids keep the push
 * idempotent — an event already in the feed is never duplicated. Mounted once
 * in the route wrapper so every page keeps the bell in sync.
 */
export function useAuctionNotificationsSync(): void {
  const revision = useStoreRevision()
  const identity = useMemo(() => readIdentity(), [])
  const addNotification = useAppStore((state) => state.addNotification)

  useEffect(() => {
    const store = readStore()
    const existing = new Set(useAppStore.getState().notifications.map((n) => n.id))
    const push = (notification: Notification) => {
      if (existing.has(notification.id)) return
      existing.add(notification.id)
      addNotification(notification)
    }
    const base = (id: string, title: string, message: string, deepLink: string): Notification => ({
      id,
      type: 'SOURCING',
      title,
      message,
      deepLink,
      isRead: false,
      createdAt: new Date().toISOString(),
    })

    store.auctions
      .filter((a) => isVisibleToVendor(a, identity))
      .forEach((source) => {
        const myId = identity.vendorId
        const myName = identity.vendorName.toLowerCase()
        const won = source.lanes.some((l) =>
          (l.awardDecision ?? []).some((d) => d.vendorId === myId || d.vendorName.toLowerCase() === myName),
        )
        const participated = source.lanes.some((l) =>
          l.ranking.some((b) => b.vendorId === myId || b.vendorName.toLowerCase() === myName),
        )
        const state = mapState(source, won)
        const detailLink = `/vendor/sourcing/auctions/${source.id}`

        if (state === 'LIVE') {
          if (!participated) {
            push(base(
              `ntf-auc-live-${source.id}`,
              'New auction live',
              `${source.title} (${source.id}) is open for bidding. Place your bid before the lane timer ends.`,
              detailLink,
            ))
          }
          source.lanes.forEach((lane) => {
            const myBid = lane.ranking.find(
              (b) => b.vendorId === myId || b.vendorName.toLowerCase() === myName,
            )
            if (myBid && myBid.rank > 1) {
              const best = Math.min(...lane.ranking.map((b) => b.amount))
              push(base(
                `ntf-auc-outbid-${source.id}-${lane.id}`,
                `Outbid on ${lane.lane}`,
                `Your bid on ${lane.lane} in ${source.id} is now L${myBid.rank}. Best bid is ₹${best.toLocaleString('en-IN')}.`,
                detailLink,
              ))
            }
          })
        }

        if (state === 'PENDING_AWARD' && participated) {
          push(base(
            `ntf-auc-ended-${source.id}`,
            'Auction ended — pending award',
            `Bidding on ${source.title} (${source.id}) has closed. The award decision is pending.`,
            detailLink,
          ))
        }

        if (state === 'AWARDED' && won) {
          const myContract = store.contracts.find(
            (c) => c.sourceAuctionId === source.id && (c.vendorId === myId || c.vendorName.toLowerCase() === myName),
          )
          push(base(
            `ntf-auc-won-${source.id}`,
            'Auction won 🎉',
            `You won ${source.title} (${source.id}).${myContract ? ` Contract ${myContract.id} has been generated.` : ''}`,
            myContract ? `/vendor/contracts/${myContract.id}` : detailLink,
          ))
        }

        if (state === 'NOT_AWARDED' && participated && !won) {
          push(base(
            `ntf-auc-lost-${source.id}`,
            'Auction not awarded',
            `${source.title} (${source.id}) was awarded to another vendor. Better luck on the next lane.`,
            detailLink,
          ))
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, identity, addNotification])
}
