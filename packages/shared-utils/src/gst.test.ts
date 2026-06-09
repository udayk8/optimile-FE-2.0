import { describe, expect, it } from 'vitest'
import { computeGst, stateCodeOf } from './gst'

describe('stateCodeOf', () => {
  it('reads the first two digits of a GSTIN', () => {
    expect(stateCodeOf('27AAACS1234F1Z5')).toBe('27')
    expect(stateCodeOf('07AABCM3456D1Z9')).toBe('07')
  })

  it('returns null for missing or too-short input', () => {
    expect(stateCodeOf(undefined)).toBeNull()
    expect(stateCodeOf(null)).toBeNull()
    expect(stateCodeOf('')).toBeNull()
    expect(stateCodeOf('2')).toBeNull()
  })
})

describe('computeGst', () => {
  it('splits CGST+SGST when supplier and place-of-supply share a state', () => {
    const g = computeGst({
      taxableValue: 100000,
      ratePct: 18,
      supplierStateCode: '27',
      placeOfSupplyStateCode: '27',
    })
    expect(g.interState).toBe(false)
    expect(g.igst).toBe(0)
    expect(g.cgst).toBe(9000)
    expect(g.sgst).toBe(9000)
    expect(g.total).toBe(118000)
  })

  it('charges IGST when supplier and place-of-supply differ', () => {
    const g = computeGst({
      taxableValue: 100000,
      ratePct: 18,
      supplierStateCode: '27',
      placeOfSupplyStateCode: '07',
    })
    expect(g.interState).toBe(true)
    expect(g.igst).toBe(18000)
    expect(g.cgst).toBe(0)
    expect(g.sgst).toBe(0)
    expect(g.total).toBe(118000)
  })

  it('falls back to IGST when a state code is unknown', () => {
    const g = computeGst({ taxableValue: 50000, ratePct: 18 })
    expect(g.interState).toBe(true)
    expect(g.igst).toBe(9000)
    expect(g.total).toBe(59000)
  })

  it('respects a configurable rate (e.g. 12%)', () => {
    const inter = computeGst({ taxableValue: 100000, ratePct: 12, supplierStateCode: '27', placeOfSupplyStateCode: '29' })
    expect(inter.igst).toBe(12000)
    const intra = computeGst({ taxableValue: 100000, ratePct: 12, supplierStateCode: '27', placeOfSupplyStateCode: '27' })
    expect(intra.cgst).toBe(6000)
    expect(intra.sgst).toBe(6000)
  })

  it('handles a zero taxable value', () => {
    const g = computeGst({ taxableValue: 0, ratePct: 18, supplierStateCode: '27', placeOfSupplyStateCode: '27' })
    expect(g.total).toBe(0)
    expect(g.cgst).toBe(0)
  })
})
