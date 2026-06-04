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
