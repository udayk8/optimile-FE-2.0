import { describe, expect, it } from 'vitest'
import { getLaneCodeError, isValidLaneCode, normalizeLaneCode } from './lane'
import { getRateTypeLabel, isValidRateType, RATE_TYPE_OPTIONS } from './rate-type'
import {
  parseVendorContractCsv,
  validateVendorContractCsvHeaders,
  VENDOR_CONTRACT_CSV_HEADERS,
} from './vendor-contracts'

describe('lane validation', () => {
  it('accepts AAA-BBB lane codes', () => {
    expect(isValidLaneCode('MUM-BLR')).toBe(true)
    expect(getLaneCodeError('MUM-BLR')).toBeNull()
  })

  it('normalizes case and whitespace', () => {
    expect(normalizeLaneCode(' mum - blr ')).toBe('MUM-BLR')
    expect(isValidLaneCode('mum-blr')).toBe(true)
  })

  it('rejects malformed lanes', () => {
    expect(isValidLaneCode('MUMBAI-BLR')).toBe(false)
    expect(isValidLaneCode('MU-BLR')).toBe(false)
    expect(isValidLaneCode('MUM_BLR')).toBe(false)
    expect(isValidLaneCode('MUM-BLR-DEL')).toBe(false)
    expect(getLaneCodeError('')).toBe('Lane is required.')
    expect(getLaneCodeError('Mumbai to Delhi')).toContain('AAA-BBB')
  })
})

describe('rateType validation', () => {
  it('accepts the three supported rate types', () => {
    expect(isValidRateType('PER_TRIP')).toBe(true)
    expect(isValidRateType('PER_MT')).toBe(true)
    expect(isValidRateType('PER_KM')).toBe(true)
  })

  it('rejects unknown rate types', () => {
    expect(isValidRateType('PER_TON')).toBe(false)
    expect(isValidRateType('')).toBe(false)
  })

  it('maps values to labels', () => {
    expect(getRateTypeLabel('PER_TRIP')).toBe('Per Trip')
    expect(getRateTypeLabel('PER_MT')).toBe('Per MT')
    expect(getRateTypeLabel('PER_KM')).toBe('Per KM')
    expect(RATE_TYPE_OPTIONS).toHaveLength(3)
  })
})

describe('CSV header validation', () => {
  it('accepts the exact expected headers', () => {
    expect(validateVendorContractCsvHeaders([...VENDOR_CONTRACT_CSV_HEADERS])).toEqual([])
  })

  it('rejects customer columns', () => {
    const errors = validateVendorContractCsvHeaders([...VENDOR_CONTRACT_CSV_HEADERS, 'customerName'])
    expect(errors.join(' ')).toContain('Customer columns are not allowed')
    expect(validateVendorContractCsvHeaders(['customer', ...VENDOR_CONTRACT_CSV_HEADERS])).not.toEqual([])
    expect(validateVendorContractCsvHeaders(['customerId', ...VENDOR_CONTRACT_CSV_HEADERS])).not.toEqual([])
    expect(validateVendorContractCsvHeaders(['customerCode', ...VENDOR_CONTRACT_CSV_HEADERS])).not.toEqual([])
  })

  it('reports missing and unknown columns', () => {
    expect(validateVendorContractCsvHeaders(['lane', 'rate']).join(' ')).toContain('Missing column: vehicleType.')
    expect(
      validateVendorContractCsvHeaders([...VENDOR_CONTRACT_CSV_HEADERS, 'remarks']).join(' '),
    ).toContain('Unknown column: remarks.')
  })
})

describe('CSV row parsing', () => {
  const header = VENDOR_CONTRACT_CSV_HEADERS.join(',')

  it('parses valid rows', () => {
    const result = parseVendorContractCsv(`${header}\nMumbai,Bengaluru,32FT,45000,PER_TRIP,2026-06-01,2026-12-31`)
    expect(result.headerErrors).toEqual([])
    expect(result.invalidRows).toEqual([])
    expect(result.validRows).toEqual([
      {
        originCity: 'Mumbai',
        destinationCity: 'Bengaluru',
        vehicleType: '32FT',
        rate: 45000,
        rateType: 'PER_TRIP',
        startDate: '2026-06-01',
        endDate: '2026-12-31',
      },
    ])
  })

  it('flags missing cities, rateType, rate, and dates per row', () => {
    const result = parseVendorContractCsv(
      `${header}\nMumbai,,32FT,-5,PER_TON,01-06-2026,2026-12-31`,
    )
    expect(result.validRows).toEqual([])
    expect(result.invalidRows).toHaveLength(1)
    const errors = result.invalidRows[0].errors.join(' ')
    expect(errors).toContain('Destination city is required.')
    expect(errors).toContain('Rate must be a number greater than zero.')
    expect(errors).toContain('Rate type must be PER_TRIP, PER_MT, or PER_KM.')
    expect(errors).toContain('Start date must be YYYY-MM-DD.')
  })

  it('rejects a file whose headers contain a customer column', () => {
    const result = parseVendorContractCsv(`customer,${header}\nAcme,Mumbai,Bengaluru,32FT,45000,PER_TRIP,2026-06-01,2026-12-31`)
    expect(result.headerErrors.join(' ')).toContain('Customer columns are not allowed')
    expect(result.validRows).toEqual([])
  })
})
