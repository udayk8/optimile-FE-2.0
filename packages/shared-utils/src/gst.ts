/* ============================================================
   GST tax engine — single source of truth for Indian GST on every
   invoice surface (customer AR + vendor AP) across all modules.

   The split between IGST and CGST+SGST is NOT a per-screen choice:
   it is decided by *place of supply*. Compare the supplier's state
   (first 2 digits of its GSTIN) with the place-of-supply state:
     - different state  -> inter-state -> IGST only
     - same state       -> intra-state -> CGST + SGST (rate split in half)
   Every builder must round identically, so they all call computeGst.
   ============================================================ */

export interface GstBreakup {
  taxableValue: number
  igst: number
  cgst: number
  sgst: number
  igstPct: number
  cgstPct: number
  sgstPct: number
  /** taxableValue + igst + cgst + sgst */
  total: number
  interState: boolean
}

export interface ComputeGstInput {
  taxableValue: number
  /** Total GST rate as a percentage, e.g. 18 for 18%. */
  ratePct: number
  /** Supplier (seller) GST state code — first 2 digits of supplier GSTIN. */
  supplierStateCode?: string | null
  /** Place-of-supply state code — first 2 digits of recipient / destination GSTIN. */
  placeOfSupplyStateCode?: string | null
}

/** First two characters of a GSTIN are the state code (e.g. "27" = Maharashtra).
 *  Returns null when the GSTIN is missing or too short to read a state code. */
export function stateCodeOf(gstin?: string | null): string | null {
  if (!gstin) return null
  const trimmed = gstin.trim()
  if (trimmed.length < 2) return null
  return trimmed.slice(0, 2)
}

/** Decide inter- vs intra-state and return the rounded tax breakup.
 *  When either state code is unknown we fall back to inter-state (IGST),
 *  the safer default for a pan-India 3PL where most movement is inter-state. */
export function computeGst(input: ComputeGstInput): GstBreakup {
  const taxableValue = input.taxableValue || 0
  const ratePct = input.ratePct || 0

  const supplier = input.supplierStateCode ?? null
  const pos = input.placeOfSupplyStateCode ?? null
  // Only treat as intra-state when we positively know both codes and they match.
  const interState = !(supplier && pos && supplier === pos)

  if (interState) {
    const igst = Math.round(taxableValue * (ratePct / 100))
    return {
      taxableValue,
      igst,
      cgst: 0,
      sgst: 0,
      igstPct: ratePct,
      cgstPct: 0,
      sgstPct: 0,
      total: taxableValue + igst,
      interState: true,
    }
  }

  const halfPct = ratePct / 2
  const cgst = Math.round(taxableValue * (halfPct / 100))
  const sgst = Math.round(taxableValue * (halfPct / 100))
  return {
    taxableValue,
    igst: 0,
    cgst,
    sgst,
    igstPct: 0,
    cgstPct: halfPct,
    sgstPct: halfPct,
    total: taxableValue + cgst + sgst,
    interState: false,
  }
}
