import apiClient from '@auction/lib/api-client'
import type { RfqResponse } from '@auction/types'

export async function fetchAllRfqResponses(params?: {
  search?: string
  from?: string
  to?: string
}): Promise<RfqResponse[]> {
  const res = await apiClient.get('/rfq-responses', { params })
  return res.data.map(mapResponse)
}

export async function uploadRfqResponse(
  rfqId: string,
  data: {
    fileName: string
    vendorName?: string
    rows: { originCity: string; destinationCity: string; vehicleType: string; price: number }[]
  }
): Promise<RfqResponse> {
  const res = await apiClient.post(`/rfqs/${rfqId}/responses`, data)
  return mapResponse(res.data)
}

export async function fetchRfqResponses(rfqId: string): Promise<RfqResponse[]> {
  const res = await apiClient.get(`/rfqs/${rfqId}/responses`)
  return res.data.map(mapResponse)
}

function mapResponse(d: any): RfqResponse {
  return {
    id: d.id,
    fileName: d.fileName,
    vendorName: d.vendorName,
    rfqId: d.rfqId,
    uploadedAt: d.uploadedAt,
    uploadedBy: d.uploadedBy ?? '',
    rows: (d.rows ?? []).map((r: any) => ({ originCity: r.originCity ?? '', destinationCity: r.destinationCity ?? '', vehicleType: r.vehicleType, price: r.price })),
  }
}
