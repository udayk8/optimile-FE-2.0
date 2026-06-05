import { useEffect, useMemo, useState } from 'react'
import {
  VENDOR_CONTRACTS_EVENT,
  VENDOR_CONTRACTS_STORE_KEY,
  listVendorContracts,
  splitLaneCode,
  type VendorContract,
} from '@shared-utils'
import { readIdentity } from './auctionBridge'
import type { Contract, Location } from '@vendor/types'

/**
 * Cross-module integration with tenant-admin.
 *
 * Tenant admins upload vendor contract CSVs while onboarding / editing a
 * vendor; the rows land in the shared `optimile.vendor-contracts` key. This
 * hook is the Vendor Portal's read side (GET /vendor/me/contracts for the
 * MANUAL_UPLOAD slice), mapping rows into the Portal's own `Contract` shape
 * the same way `useAuctionContractsBridge` does for auction awards.
 */

function toLocation(code: string): Location {
  return { name: code, city: code, state: '' }
}

function mapManualContract(source: VendorContract): Contract {
  const [origin, destination] = splitLaneCode(source.laneCode) ?? [source.laneCode, '']
  return {
    id: source.contractId,
    laneCode: source.laneCode,
    laneDetails: { origin: toLocation(origin), destination: toLocation(destination) },
    source: 'MANUAL_UPLOAD',
    rateCard: [
      {
        vehicleType: source.vehicleType,
        rateType: source.rateType,
        rate: source.rate,
        surcharges: [],
      },
    ],
    volumeAllocation: { volume: 100, unit: '%', frequency: 'MONTHLY' },
    paymentTerms: { creditPeriodDays: 30, billingCycle: 'MONTHLY' },
    slaClauses: [],
    penaltyClauses: [],
    validityFrom: source.startDate,
    validityTo: source.endDate,
    renewalTerms: 'Uploaded by tenant admin.',
    status: source.status,
    amendments: [],
    pdfUrl: `/contracts/${source.contractId}.pdf`,
    createdAt: source.startDate,
  }
}

/** Re-renders the caller whenever the shared vendor-contracts store changes. */
function useStoreRevision(): number {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const bump = () => setRevision((v) => v + 1)
    const onStorage = (e: StorageEvent) => {
      if (e.key === VENDOR_CONTRACTS_STORE_KEY) bump()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(VENDOR_CONTRACTS_EVENT, bump)
    window.addEventListener('focus', bump)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(VENDOR_CONTRACTS_EVENT, bump)
      window.removeEventListener('focus', bump)
    }
  }, [])
  return revision
}

/** Contracts uploaded for the logged-in vendor by tenant admin, Portal-shaped. */
export function useManualContractsBridge(): Contract[] {
  const revision = useStoreRevision()
  const identity = useMemo(() => readIdentity(), [])
  return useMemo(() => {
    return listVendorContracts(identity).map(mapManualContract)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, identity])
}
