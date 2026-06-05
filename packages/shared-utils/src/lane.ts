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
const CODE_CITY_MAP: Record<string, string> = {
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
  return CODE_CITY_MAP[normalized] ?? normalized
}

/** "MUM-DEL" → "Mumbai → Delhi" (empty string when not a valid lane code). */
export function laneCodeToCityDisplay(lane: string): string {
  const parts = splitLaneCode(lane)
  if (!parts) return ''
  return `${locationCodeToCity(parts[0])} → ${locationCodeToCity(parts[1])}`
}

/** Known lane-code suggestions for free lane inputs (datalists). */
export function knownLocationCodes(): string[] {
  return Object.keys(CODE_CITY_MAP)
}
