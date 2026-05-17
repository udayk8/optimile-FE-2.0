import apiClient from '@auction/lib/api-client'
import type { Contract } from '@auction/types'

export async function fetchContracts(params?: { status?: string; search?: string; vendorId?: string }): Promise<Contract[]> {
  const res = await apiClient.get('/contracts', { params })
  return res.data.map(mapContract)
}

export async function fetchContract(id: string): Promise<Contract> {
  const res = await apiClient.get(`/contracts/${id}`)
  return mapContract(res.data)
}

export async function terminateContract(id: string): Promise<Contract> {
  const res = await apiClient.post(`/contracts/${id}/terminate`)
  return mapContract(res.data)
}

function mapContract(d: any): Contract {
  return {
    id: d.id,
    sourceAuctionId: d.sourceAuctionId,
    contractType: d.contractType ?? 'BULK',
    vendorId: d.vendorId,
    vendorName: d.vendorName,
    lane: d.lane,
    region: d.region,
    vehicleType: d.vehicleType,
    contractedRate: d.contractedRate,
    rateUnit: d.rateUnit ?? 'PER_TRIP',
    volumeAllocationPercent: d.volumeAllocationPercent ?? 100,
    allocationRank: d.allocationRank ?? 'L1',
    startDate: d.startDate,
    endDate: d.endDate,
    estimatedTrips: d.estimatedTrips ?? 0,
    status: d.status,
    l1OverrideReason: d.l1OverrideReason,
    rateSyncedToTms: d.rateSyncedToTms ?? false,
    placementFailures: d.placementFailures ?? [],
    rateDeviationOpen: d.rateDeviationOpen ?? false,
  }
}
