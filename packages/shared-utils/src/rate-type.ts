/* ============================================================
   Rate type helpers — single source of truth for the contract /
   auction pricing unit across all modules.
   ============================================================ */

export type RateType = 'PER_TRIP' | 'PER_MT' | 'PER_KM'

export const RATE_TYPE_OPTIONS: { value: RateType; label: string }[] = [
  { value: 'PER_TRIP', label: 'Per Trip' },
  { value: 'PER_MT', label: 'Per MT' },
  { value: 'PER_KM', label: 'Per KM' },
]

export function isValidRateType(value: string): value is RateType {
  return RATE_TYPE_OPTIONS.some((option) => option.value === value)
}

/** "PER_TRIP" → "Per Trip"; unknown values echo back unchanged. */
export function getRateTypeLabel(value: string): string {
  return RATE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value
}
