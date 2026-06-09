import { cityLaneKey, locationCodeToCity, splitLaneCode } from '@shared-utils'
import type { Auction, Contract } from '@auction/types'

/**
 * Cross-module source of truth for auctions + contracts.
 *
 * auction-web authors auctions here; the Vendor Portal (vendor-web) reads the
 * SAME localStorage key to surface live auctions to invited vendors, places
 * bids back into each lane's ranking, and reads the contracts produced once an
 * auction is awarded. Both apps run inside the one shell (same origin) so they
 * share localStorage. Mirrors the finance↔vendor bridge pattern.
 *
 * The key is seeded from the auction-web mocks on first load. vendor-web never
 * seeds — it only reads/writes an existing store and falls back to its own demo
 * data when the key is absent (standalone vendor build).
 */
// v2: store reset — no seeded mock auctions/contracts (flow-only data).
export const AUCTION_STORE_KEY = 'optimile.auction-store.v2'
const SESSION_CONTEXT_KEY = 'optimile.session.context'

/**
 * Tenant the current internal user belongs to, from the shared session the
 * unified login writes. Stamped onto created auctions so the Vendor Portal can
 * scope visibility to vendors of the same tenant.
 */
export function readSessionPrincipal(): { tenantId?: string; userId?: string } {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(SESSION_CONTEXT_KEY)
    if (!raw) return {}
    const session = JSON.parse(raw) as { tenantId?: string; userId?: string }
    return { tenantId: session.tenantId, userId: session.userId }
  } catch {
    return {}
  }
}

export function readSessionTenantId(): string | undefined {
  return readSessionPrincipal().tenantId
}

export interface AuctionStoreSnapshot {
  auctions: Auction[]
  contracts: Contract[]
}

function notify() {
  if (typeof window === 'undefined') return
  // Same-tab writes don't fire the native `storage` event; emit a custom one so
  // listeners in the current document (and the cross-module bridge) can refresh.
  window.dispatchEvent(new CustomEvent('optimile-auction-store'))
}

/**
 * LIVE auctions whose bidding timer has fully run out flip straight to
 * COMPLETED (shown as "Pending Award") — no manual "Complete" click needed.
 * Runs on every store read so every surface (auction-web, the tenant-admin
 * embed, and the vendor portal bridge) converges on the same status.
 *
 * The write-back deliberately skips notify(): loadStore() runs during React
 * renders, and dispatching the store event synchronously there could trigger
 * setState-in-render warnings. The flip is persisted, so the next read (or
 * the next user-driven store event) picks it up everywhere.
 */
function sweepExpiredAuctions(snapshot: AuctionStoreSnapshot): AuctionStoreSnapshot {
  const now = Date.now()
  let changed = false
  const auctions = snapshot.auctions.map((auction) => {
    if (auction.status !== 'LIVE') return auction
    if (auction.startAt && new Date(auction.startAt).getTime() > now) return auction
    const laneEnds = auction.lanes
      .map((lane) => new Date(lane.timerEndsAt).getTime())
      .filter((time) => !Number.isNaN(time))
    if (!laneEnds.length) return auction
    const lastEnd = Math.max(...laneEnds)
    if (lastEnd > now) return auction
    changed = true
    const closedAt = new Date(lastEnd).toISOString()
    // Zero bids across all lanes → NO_BIDS, not a fake pending award.
    const hasBids = auction.lanes.some((lane) => lane.ranking.length > 0)
    return {
      ...auction,
      status: (hasBids ? 'COMPLETED' : 'NO_BIDS') as 'COMPLETED' | 'NO_BIDS',
      completedAt: auction.completedAt ?? closedAt,
      auditTrail: [
        ...auction.auditTrail,
        {
          id: `e-auto-${lastEnd}`,
          type: 'COMPLETED' as const,
          message: hasBids
            ? 'Bidding window closed automatically (timer ended).'
            : 'Bidding window closed automatically (timer ended) — no bids received.',
          actor: 'system',
          timestamp: closedAt,
        },
      ],
    }
  })
  if (!changed) return snapshot
  const swept = { ...snapshot, auctions }
  window.localStorage.setItem(AUCTION_STORE_KEY, JSON.stringify(swept))
  return swept
}

/**
 * Pre-city-pair records carried one combined `lane` string ("Mumbai - Delhi"
 * or "MUM-DEL"). Derive the source/destination cities for anything stored
 * before the refactor so old browsers keep rendering complete rows.
 */
function legacyLaneToCities(lane: unknown): [string, string] {
  if (typeof lane !== 'string' || !lane) return ['', '']
  const codeParts = splitLaneCode(lane)
  if (codeParts) return [locationCodeToCity(codeParts[0]), locationCodeToCity(codeParts[1])]
  const parts = lane.split(/→|->| - /).map((part) => part.trim()).filter(Boolean)
  return [parts[0] ?? '', parts[1] ?? '']
}

function migrateLegacyLanes(snapshot: AuctionStoreSnapshot): { snapshot: AuctionStoreSnapshot; changed: boolean } {
  let changed = false
  const fill = <T extends { originCity?: string; destinationCity?: string }>(record: T): T => {
    if (record.originCity && record.destinationCity) return record
    const [originCity, destinationCity] = legacyLaneToCities((record as { lane?: unknown }).lane)
    if (!originCity && !destinationCity) return record
    changed = true
    return { ...record, originCity, destinationCity }
  }
  const auctions = snapshot.auctions.map((auction) => {
    const lanes = auction.lanes.map(fill)
    return lanes.some((lane, index) => lane !== auction.lanes[index]) ? { ...auction, lanes } : auction
  })
  const contracts = snapshot.contracts.map(fill)
  return { snapshot: changed ? { auctions, contracts } : snapshot, changed }
}

export function loadStore(): AuctionStoreSnapshot {
  // No hardcoded mock auctions/contracts — the board shows only auctions
  // created in-flow (and contracts they produce).
  if (typeof window === 'undefined') {
    return { auctions: [], contracts: [] }
  }
  const raw = window.localStorage.getItem(AUCTION_STORE_KEY)
  if (!raw) {
    const seeded: AuctionStoreSnapshot = { auctions: [], contracts: [] }
    window.localStorage.setItem(AUCTION_STORE_KEY, JSON.stringify(seeded))
    return seeded
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AuctionStoreSnapshot>
    const migration = migrateLegacyLanes({
      auctions: parsed.auctions ?? [],
      contracts: parsed.contracts ?? [],
    })
    const snapshot = migration.snapshot
    if (migration.changed) {
      window.localStorage.setItem(AUCTION_STORE_KEY, JSON.stringify(snapshot))
    }
    return sweepExpiredAuctions(snapshot)
  } catch {
    return { auctions: [], contracts: [] }
  }
}

export function saveStore(snapshot: AuctionStoreSnapshot) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUCTION_STORE_KEY, JSON.stringify(snapshot))
  notify()
}

export function getAuctions(): Auction[] {
  return loadStore().auctions
}

export function getAuction(id: string): Auction | undefined {
  return loadStore().auctions.find((a) => a.id === id)
}

export function getContracts(): Contract[] {
  return loadStore().contracts
}

/** Insert a new auction at the head of the list. */
export function addAuction(auction: Auction) {
  const store = loadStore()
  saveStore({ ...store, auctions: [auction, ...store.auctions] })
}

/** Replace one auction in place (matched by id). */
export function updateAuction(id: string, updater: (auction: Auction) => Auction) {
  const store = loadStore()
  saveStore({
    ...store,
    auctions: store.auctions.map((a) => (a.id === id ? updater(a) : a)),
  })
}

/** Replace one contract in place (matched by id). */
export function updateContract(id: string, updater: (contract: Contract) => Contract) {
  const store = loadStore()
  saveStore({
    ...store,
    contracts: store.contracts.map((c) => (c.id === id ? updater(c) : c)),
  })
}

/**
 * Replace the contracts produced by one auction lane (removing any prior ones
 * for that lane) and append the freshly awarded set. Keeps award idempotent.
 * Lane identity = source/destination city pair.
 */
export function replaceLaneContracts(
  auctionId: string,
  lane: { originCity: string; destinationCity: string },
  contracts: Contract[],
) {
  const laneKey = cityLaneKey(lane.originCity, lane.destinationCity)
  const store = loadStore()
  const kept = store.contracts.filter(
    (c) => !(c.sourceAuctionId === auctionId && cityLaneKey(c.originCity, c.destinationCity) === laneKey),
  )
  saveStore({ ...store, contracts: [...contracts, ...kept] })
}
