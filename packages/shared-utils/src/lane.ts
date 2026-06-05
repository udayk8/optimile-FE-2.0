/* ============================================================
   Lane code helpers — shared by vendor-web, auction-web, and the
   tenant-admin vendor contract screens so every module validates
   lanes identically. A lane code is two 3-letter location codes
   joined by a hyphen, e.g. "MUM-BLR".
   ============================================================ */

export const LANE_CODE_REGEX = /^[A-Z]{3}-[A-Z]{3}$/

/** Uppercases and strips whitespace so "mum - blr" → "MUM-BLR". */
export function normalizeLaneCode(value: string): string {
  return (value ?? '').trim().toUpperCase().replace(/\s+/g, '')
}

export function isValidLaneCode(value: string): boolean {
  return LANE_CODE_REGEX.test(normalizeLaneCode(value))
}

/** Returns a user-facing error for an invalid lane code, or null when valid. */
export function getLaneCodeError(value: string): string | null {
  const normalized = normalizeLaneCode(value)
  if (!normalized) return 'Lane is required.'
  if (!LANE_CODE_REGEX.test(normalized)) {
    return 'Lane must be in AAA-BBB format (e.g. MUM-BLR).'
  }
  return null
}

/** "MUM-BLR" → ["MUM", "BLR"]; returns null when not a valid lane code. */
export function splitLaneCode(value: string): [string, string] | null {
  const normalized = normalizeLaneCode(value)
  if (!LANE_CODE_REGEX.test(normalized)) return null
  const [origin, destination] = normalized.split('-')
  return [origin, destination]
}

const LOCATION_CODE_REGEX = /^[A-Z]{3}$/

/** ("MUM","BLR") → "MUM-BLR"; legacy city names fall back to "Mumbai → Delhi". */
export function formatLaneDisplay(origin: string, destination: string): string {
  if (LOCATION_CODE_REGEX.test(origin) && LOCATION_CODE_REGEX.test(destination)) {
    return `${origin}-${destination}`
  }
  return `${origin} → ${destination}`
}

/* ============================================================
   City ↔ lane-code mapping. Bookings carry city names (from
   tenant addresses) while auction/spot contracts carry AAA-BBB
   lane codes — this map bridges the two so a spot booking can
   find the spot contract for its lane.
   ============================================================ */

const CITY_CODE_MAP: Record<string, string> = {
  mumbai: 'MUM',
  'navi mumbai': 'MUM',
  bhiwandi: 'MUM',
  delhi: 'DEL',
  'new delhi': 'DEL',
  bengaluru: 'BLR',
  bangalore: 'BLR',
  chennai: 'MAA',
  pune: 'PNQ',
  jaipur: 'JAI',
  ahmedabad: 'AMD',
  surat: 'SRT',
  lucknow: 'LKO',
  nagpur: 'NAG',
  hyderabad: 'HYD',
  kolkata: 'CCU',
  coimbatore: 'CJB',
  mangaluru: 'IXE',
  mangalore: 'IXE',
  vadodara: 'BRC',
  nashik: 'NSK',
  mysuru: 'MYS',
  mysore: 'MYS',
  goa: 'GOX',
  indore: 'IDR',
  bhopal: 'BHO',
  chandigarh: 'IXC',
  ludhiana: 'LUH',
  kanpur: 'KNU',
  patna: 'PAT',
  guwahati: 'GAU',
  visakhapatnam: 'VTZ',
  vijayawada: 'VGA',
  kochi: 'COK',
  cochin: 'COK',
  thiruvananthapuram: 'TRV',
  hubballi: 'HBX',
  hubli: 'HBX',
  raipur: 'RPR',
  ranchi: 'IXR',
  bhubaneswar: 'BBI',
  jamshedpur: 'IXW',
  haldia: 'HLD',
  moga: 'MOG',
  munger: 'MGR',
}

/**
 * City name → 3-letter location code. Known cities use their standard code;
 * unknown ones fall back to the first three letters uppercased so matching
 * stays deterministic either side of the bridge.
 */
export function cityToLocationCode(city: string): string {
  const normalized = (city ?? '').trim().toLowerCase()
  if (!normalized) return ''
  const mapped = CITY_CODE_MAP[normalized]
  if (mapped) return mapped
  if (LOCATION_CODE_REGEX.test(normalized.toUpperCase())) return normalized.toUpperCase()
  return normalized.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase()
}

/** ("Mumbai", "Delhi") → "MUM-DEL"; empty string when either side is missing. */
export function laneCodeFromCities(originCity: string, destinationCity: string): string {
  const origin = cityToLocationCode(originCity)
  const destination = cityToLocationCode(destinationCity)
  if (!origin || !destination) return ''
  return `${origin}-${destination}`
}

/** Display names for known location codes (reverse of CITY_CODE_MAP, curated). */
const CODE_CITY_LOOKUP: Record<string, string> = {
  MUM: 'Mumbai',
  DEL: 'Delhi',
  BLR: 'Bengaluru',
  MAA: 'Chennai',
  PNQ: 'Pune',
  JAI: 'Jaipur',
  AMD: 'Ahmedabad',
  SRT: 'Surat',
  LKO: 'Lucknow',
  NAG: 'Nagpur',
  HYD: 'Hyderabad',
  CCU: 'Kolkata',
  CJB: 'Coimbatore',
  IXE: 'Mangaluru',
  BRC: 'Vadodara',
  NSK: 'Nashik',
  MYS: 'Mysuru',
  GOX: 'Goa',
  IDR: 'Indore',
  BHO: 'Bhopal',
  IXC: 'Chandigarh',
  LUH: 'Ludhiana',
  KNU: 'Kanpur',
  PAT: 'Patna',
  GAU: 'Guwahati',
  VTZ: 'Visakhapatnam',
  VGA: 'Vijayawada',
  COK: 'Kochi',
  TRV: 'Thiruvananthapuram',
  HBX: 'Hubballi',
  RPR: 'Raipur',
  IXR: 'Ranchi',
  BBI: 'Bhubaneswar',
  IXW: 'Jamshedpur',
  HLD: 'Haldia',
  MOG: 'Moga',
  MGR: 'Munger',
}

/** "MUM" → "Mumbai"; unknown codes echo back unchanged. */
export function locationCodeToCity(code: string): string {
  const normalized = (code ?? '').trim().toUpperCase()
  return CODE_CITY_LOOKUP[normalized] ?? normalized
}

/** "MUM-DEL" → "Mumbai → Delhi" (empty string when not a valid lane code). */
export function laneCodeToCityDisplay(lane: string): string {
  const parts = splitLaneCode(lane)
  if (!parts) return ''
  return `${locationCodeToCity(parts[0])} → ${locationCodeToCity(parts[1])}`
}

/** Known lane-code suggestions for free lane inputs (datalists). */
export function knownLocationCodes(): string[] {
  return Object.keys(CODE_CITY_LOOKUP)
}

/* ============================================================
   City-pair lane identity. Lanes are a pair of cities sourced
   from the tenant address book — the booking side already
   speaks cities, so both ends share one vocabulary and the
   match needs no translation. 3-letter codes remain as display
   shorthand only.
   ============================================================ */

const CITY_ALIASES: Record<string, string> = {
  bombay: 'mumbai',
  'navi mumbai': 'mumbai',
  bangalore: 'bengaluru',
  madras: 'chennai',
  calcutta: 'kolkata',
  mangalore: 'mangaluru',
  mysore: 'mysuru',
  hubli: 'hubballi',
  cochin: 'kochi',
  baroda: 'vadodara',
  poona: 'pune',
}

/** Canonical city key: trimmed, lowercased, single-spaced, alias-resolved. */
export function normalizeCity(city: string): string {
  const normalized = (city ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  return CITY_ALIASES[normalized] ?? normalized
}

/** Two cities name the same place? ("Bombay", "mumbai ") → true. */
export function isSameCity(a: string, b: string): boolean {
  return Boolean(normalizeCity(a)) && normalizeCity(a) === normalizeCity(b)
}

/**
 * Canonical lane identity for matching: "mumbai→delhi". The arrow separator
 * never appears in city names, so multi-word cities are safe.
 */
export function cityLaneKey(originCity: string, destinationCity: string): string {
  const origin = normalizeCity(originCity)
  const destination = normalizeCity(destinationCity)
  if (!origin || !destination) return ''
  return `${origin}→${destination}`
}

/**
 * Legacy shim: an AAA-BBB lane code from older contracts/auctions resolves to
 * the same city key via the known code→city map, so pre-city-pair records
 * keep matching bookings. Unknown codes return ''.
 */
export function legacyLaneToCityKey(lane: string): string {
  const parts = splitLaneCode(lane)
  if (!parts) return ''
  const origin = CODE_CITY_LOOKUP[parts[0]]
  const destination = CODE_CITY_LOOKUP[parts[1]]
  if (!origin || !destination) return ''
  return cityLaneKey(origin, destination)
}

/**
 * Lane key for a contract-side record that carries explicit cities (new)
 * or only a lane code (legacy stored records).
 */
export function contractCityLaneKey(record: {
  originCity?: string
  destinationCity?: string
  lane?: string
}): string {
  if (record.originCity && record.destinationCity) {
    return cityLaneKey(record.originCity, record.destinationCity)
  }
  return legacyLaneToCityKey(record.lane ?? '')
}

/** "Mumbai" → "MUM" display shorthand (known cities only); else first-3 slug. */
export function cityToDisplayCode(city: string): string {
  return cityToLocationCode(city)
}

/**
 * ("Mumbai","Delhi") → "Mumbai - Delhi" display lane (never used for
 * matching — matching always goes through cityLaneKey). 3-letter codes are
 * legacy-only; new lanes display the cities themselves.
 */
export function citiesToDisplayLane(originCity: string, destinationCity: string): string {
  const origin = (originCity ?? '').trim()
  const destination = (destinationCity ?? '').trim()
  if (!origin || !destination) return ''
  return `${origin} - ${destination}`
}

/* ============================================================
   Tenant city vocabulary — the distinct cities present in the
   tenant's address book + customer addresses (localStorage,
   single-shell prototype). Auction lane pickers and bulk
   imports validate against this list so every auctioned lane
   is bookable by construction.
   ============================================================ */

const BOOKING_SETUP_KEY = 'optimile.tenant.bookingSetup'
const CUSTOMER_ADDRESSES_KEY = 'optimile.tenant.customerAddresses'

/** Distinct cities (display-cased, sorted) from both tenant address pools. */
export function listTenantCities(tenantId?: string): string[] {
  if (typeof window === 'undefined') return []
  const byKey = new Map<string, string>()
  const add = (city?: string | null) => {
    const display = (city ?? '').trim().replace(/\s+/g, ' ')
    if (!display) return
    const key = normalizeCity(display)
    if (!byKey.has(key)) byKey.set(key, display)
  }
  try {
    const setupRaw = window.localStorage.getItem(BOOKING_SETUP_KEY)
    if (setupRaw) {
      const setup = JSON.parse(setupRaw) as Record<string, { addresses?: { city?: string }[] }>
      Object.entries(setup).forEach(([key, value]) => {
        if (tenantId && key !== tenantId) return
        value?.addresses?.forEach((address) => add(address?.city))
      })
    }
  } catch { /* tolerate malformed storage */ }
  try {
    const addressesRaw = window.localStorage.getItem(CUSTOMER_ADDRESSES_KEY)
    if (addressesRaw) {
      const addresses = JSON.parse(addressesRaw) as { tenantId?: string; city?: string }[]
      addresses.forEach((address) => {
        if (tenantId && address?.tenantId && address.tenantId !== tenantId) return
        add(address?.city)
      })
    }
  } catch { /* tolerate malformed storage */ }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b))
}

/** True when the city (or an alias of it) exists in the tenant vocabulary. */
export function isKnownTenantCity(city: string, cities: string[]): boolean {
  const key = normalizeCity(city)
  return Boolean(key) && cities.some((candidate) => normalizeCity(candidate) === key)
}
