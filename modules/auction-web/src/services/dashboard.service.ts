import apiClient from '@auction/lib/api-client'

export interface KpiData {
  value: number
  insight: string
}

export interface PriorityAuction {
  id: string
  title: string
  type: string
  status: string
  updatedAt: string
  awardDeadline: string
}

export interface ExpiringContract {
  id: string
  vendorName: string
  lane: string
  endDate: string
  status: string
}

export interface DashboardResponse {
  liveAuctions: KpiData
  pendingAwards: KpiData
  expiringContracts: KpiData
  priorityAuctions: PriorityAuction[]
  expiringContractsList: ExpiringContract[]
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await apiClient.get('/dashboard')
  return res.data
}
