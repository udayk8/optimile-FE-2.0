/* ============================================================
   Vendor contracts — shared model, CSV import, and cross-module
   store.

   Tenant admins upload vendor contract CSVs while onboarding /
   editing a vendor; auction awards produce contracts of their own.
   Both kinds surface on the Vendor Portal "My Contracts" page and
   on Tenant Admin → Vendor Detail → Contracts.

   Like the auction bridge, all modules run in the one shell (same
   origin), so manually uploaded contracts live under a shared
   localStorage key. The upload helper builds the same multipart
   request the real backend will accept:
     POST /vendors/me/contracts/upload   (multipart/form-data)
     GET  /vendor/me/contracts
     GET  /admin/vendors/:vendorId/contracts
   ============================================================ */

import { isValidRateType, type RateType } from './rate-type'

// ── Model ──

export type ContractSource = 'MANUAL_UPLOAD' | 'AUCTION_WIN'

export const CONTRACT_SOURCE_OPTIONS: { value: ContractSource; label: string }[] = [
  { value: 'MANUAL_UPLOAD', label: 'Manual Upload' },
  { value: 'AUCTION_WIN', label: 'Auction Won' },
]

export function getContractSourceLabel(value: string): string {
  return CONTRACT_SOURCE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export interface VendorContract {
  contractId: string
  /** Tenant-admin vendor id the contract belongs to. */
  vendorId: string
  /** Vendor display name — vendor-web also matches on this (same as auction bridge). */
  vendorName: string
  tenantId?: string
  /** Lane = source/destination cities (address-book vocabulary). */
  originCity: string
  destinationCity: string
  vehicleType: string
  rate: number
  rateType: RateType
  startDate: string
  endDate: string
  createdFrom: ContractSource
  /** Auction flavour for AUCTION_WIN contracts; manual uploads have none. */
  contractKind?: 'BULK' | 'LOT' | 'SPOT'
  /** USED marks a one-time (spot) contract consumed by its booking. */
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'USED'
  /** L1/L2/L3 volume split from auction awards (e.g. 50/30/20 on one lane).
      Manual uploads default to the full lane volume (100%). */
  allocationRank?: 'L1' | 'L2' | 'L3'
  volumeAllocationPercent?: number
}

/** "Mumbai → Delhi" — display label from the source/destination cities. */
export function vendorContractLaneLabel(contract: {
  originCity: string
  destinationCity: string
}): string {
  return `${contract.originCity} → ${contract.destinationCity}`
}

// ── CSV template + validation ──

export const VENDOR_CONTRACT_CSV_HEADERS = [
  'originCity',
  'destinationCity',
  'vehicleType',
  'rate',
  'rateType',
  'startDate',
  'endDate',
] as const

/** Template with sample rows dated from today so downloads always validate. */
export function buildVendorContractCsvTemplate(): string {
  const startDate = new Date().toISOString().slice(0, 10)
  const endDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return [
    VENDOR_CONTRACT_CSV_HEADERS.join(','),
    `Mumbai,Bengaluru,32FT,45000,PER_TRIP,${startDate},${endDate}`,
    `Delhi,Lucknow,20FT,1800,PER_MT,${startDate},${endDate}`,
    `Pune,Jaipur,32FT,52,PER_KM,${startDate},${endDate}`,
  ].join('\n')
}

export const VENDOR_CONTRACT_CSV_TEMPLATE = buildVendorContractCsvTemplate()

const CUSTOMER_HEADER_REGEX = /^customer(name|id|code)?$/i

/** Header errors for an uploaded CSV; empty array when the header row is valid. */
export function validateVendorContractCsvHeaders(headers: string[]): string[] {
  const errors: string[] = []
  const normalized = headers.map((header) => header.trim())
  const customerColumns = normalized.filter((header) => CUSTOMER_HEADER_REGEX.test(header))
  if (customerColumns.length > 0) {
    errors.push(`Customer columns are not allowed: ${customerColumns.join(', ')}.`)
  }
  VENDOR_CONTRACT_CSV_HEADERS.forEach((expected) => {
    if (!normalized.includes(expected)) errors.push(`Missing column: ${expected}.`)
  })
  normalized.forEach((header) => {
    if (
      header &&
      !CUSTOMER_HEADER_REGEX.test(header) &&
      !VENDOR_CONTRACT_CSV_HEADERS.includes(header as (typeof VENDOR_CONTRACT_CSV_HEADERS)[number])
    ) {
      errors.push(`Unknown column: ${header}.`)
    }
  })
  return errors
}

export interface VendorContractCsvRow {
  originCity: string
  destinationCity: string
  vehicleType: string
  rate: number
  rateType: RateType
  startDate: string
  endDate: string
}

export interface VendorContractCsvResult {
  headerErrors: string[]
  validRows: VendorContractCsvRow[]
  invalidRows: { rowNumber: number; errors: string[] }[]
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** Parses + validates the whole CSV text (headers, lane, rateType, rate, dates). */
export function parseVendorContractCsv(text: string): VendorContractCsvResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length === 0) {
    return { headerErrors: ['The file is empty.'], validRows: [], invalidRows: [] }
  }

  const headers = lines[0].split(',').map((header) => header.trim())
  const headerErrors = validateVendorContractCsvHeaders(headers)
  if (headerErrors.length > 0) return { headerErrors, validRows: [], invalidRows: [] }

  const index = (name: (typeof VENDOR_CONTRACT_CSV_HEADERS)[number]) => headers.indexOf(name)
  const validRows: VendorContractCsvRow[] = []
  const invalidRows: { rowNumber: number; errors: string[] }[] = []

  lines.slice(1).forEach((line, lineIndex) => {
    const rowNumber = lineIndex + 2 // 1-based, counting the header row
    const values = line.split(',').map((value) => value.trim())
    const errors: string[] = []

    const originCity = (values[index('originCity')] ?? '').trim()
    const destinationCity = (values[index('destinationCity')] ?? '').trim()
    if (!originCity) errors.push('Origin city is required.')
    if (!destinationCity) errors.push('Destination city is required.')

    const vehicleType = values[index('vehicleType')] ?? ''
    if (!vehicleType) errors.push('Vehicle type is required.')

    const rate = Number(values[index('rate')] ?? '')
    if (!Number.isFinite(rate) || rate <= 0) errors.push('Rate must be a number greater than zero.')

    const rateType = (values[index('rateType')] ?? '').toUpperCase()
    if (!isValidRateType(rateType)) errors.push('Rate type must be PER_TRIP, PER_MT, or PER_KM.')

    const startDate = values[index('startDate')] ?? ''
    const endDate = values[index('endDate')] ?? ''
    if (!ISO_DATE_REGEX.test(startDate)) errors.push('Start date must be YYYY-MM-DD.')
    if (!ISO_DATE_REGEX.test(endDate)) errors.push('End date must be YYYY-MM-DD.')
    if (ISO_DATE_REGEX.test(startDate) && ISO_DATE_REGEX.test(endDate) && endDate < startDate) {
      errors.push('End date must not be before start date.')
    }

    if (errors.length > 0) {
      invalidRows.push({ rowNumber, errors })
      return
    }
    validRows.push({ originCity, destinationCity, vehicleType, rate, rateType: rateType as RateType, startDate, endDate })
  })

  return { headerErrors: [], validRows, invalidRows }
}

// ── Shared store (mock persistence behind the API shapes) ──

export const VENDOR_CONTRACTS_STORE_KEY = 'optimile.vendor-contracts'
export const VENDOR_CONTRACTS_EVENT = 'optimile-vendor-contracts'

export function readVendorContracts(): VendorContract[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(VENDOR_CONTRACTS_STORE_KEY)
    return raw ? (JSON.parse(raw) as VendorContract[]) : []
  } catch {
    return []
  }
}

export function saveVendorContracts(contracts: VendorContract[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(VENDOR_CONTRACTS_STORE_KEY, JSON.stringify(contracts))
  window.dispatchEvent(new CustomEvent(VENDOR_CONTRACTS_EVENT))
}

export function appendVendorContracts(contracts: VendorContract[]): void {
  saveVendorContracts([...readVendorContracts(), ...contracts])
}

/** GET /admin/vendors/:vendorId/contracts — manual uploads for one vendor. */
export function listVendorContracts(vendor: { vendorId: string; vendorName?: string }): VendorContract[] {
  const name = vendor.vendorName?.toLowerCase()
  return readVendorContracts().filter(
    (contract) =>
      contract.vendorId === vendor.vendorId ||
      (name != null && contract.vendorName.toLowerCase() === name),
  )
}

let contractSequence = 100

/** Persists validated rows for a vendor as MANUAL_UPLOAD contracts. */
export function createVendorContracts(
  vendor: { vendorId: string; vendorName: string; tenantId?: string },
  rows: VendorContractCsvRow[],
): VendorContract[] {
  const today = new Date().toISOString().slice(0, 10)
  const created: VendorContract[] = rows.map((row) => ({
    contractId: `VC${contractSequence++}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    vendorId: vendor.vendorId,
    vendorName: vendor.vendorName,
    tenantId: vendor.tenantId,
    originCity: row.originCity,
    destinationCity: row.destinationCity,
    vehicleType: row.vehicleType,
    rate: row.rate,
    rateType: row.rateType,
    startDate: row.startDate,
    endDate: row.endDate,
    createdFrom: 'MANUAL_UPLOAD',
    status: row.endDate < today ? 'EXPIRED' : 'ACTIVE',
  }))
  appendVendorContracts(created)
  return created
}

/**
 * POST /vendors/me/contracts/upload — validates the CSV, builds the multipart
 * form-data payload the backend expects, and persists the rows to the shared
 * mock store. Throws with a readable message when the file is rejected.
 */
export async function uploadVendorContractsCsv(
  vendor: { vendorId: string; vendorName: string; tenantId?: string },
  file: File,
): Promise<VendorContract[]> {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Only .csv files are accepted.')
  }
  const text = await file.text()
  const result = parseVendorContractCsv(text)
  if (result.headerErrors.length > 0) {
    throw new Error(result.headerErrors.join(' '))
  }
  if (result.validRows.length === 0) {
    throw new Error('No valid rows found in the file.')
  }

  // The real backend consumes this exact request; the mock store stands in
  // for it until the contracts API is wired up.
  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('vendorId', vendor.vendorId)
  void formData // POST /vendors/me/contracts/upload

  return createVendorContracts(vendor, result.validRows)
}
