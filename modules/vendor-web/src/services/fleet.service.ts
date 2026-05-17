import apiClient from '@vendor/lib/api-client'

export const VehicleService = {
  list: async (params?: { status?: string; vehicleType?: string }) =>
    (await apiClient.get('/fleet/vehicles', { params })).data,
  get: async (id: string) => (await apiClient.get(`/fleet/vehicles/${id}`)).data,
  create: async (data: any) => (await apiClient.post('/fleet/vehicles', data)).data,
  update: async (id: string, data: any) => (await apiClient.put(`/fleet/vehicles/${id}`, data)).data,
  remove: async (id: string) => (await apiClient.delete(`/fleet/vehicles/${id}`)).data,
  patchStatus: async (id: string, status: string) =>
    (await apiClient.patch(`/fleet/vehicles/${id}/status`, { status })).data,
  uploadCompliance: async (id: string, data: any) =>
    (await apiClient.post(`/fleet/vehicles/${id}/compliance-documents`, data)).data,
  addBlackout: async (id: string, fromDate: string, toDate: string) =>
    (await apiClient.post(`/fleet/vehicles/${id}/blackout`, { fromDate, toDate })).data,
}

export const DriverService = {
  list: async (params?: { status?: string }) => (await apiClient.get('/fleet/drivers', { params })).data,
  get: async (id: string) => (await apiClient.get(`/fleet/drivers/${id}`)).data,
  create: async (data: any) => (await apiClient.post('/fleet/drivers', data)).data,
  update: async (id: string, data: any) => (await apiClient.put(`/fleet/drivers/${id}`, data)).data,
  remove: async (id: string) => (await apiClient.delete(`/fleet/drivers/${id}`)).data,
  patchStatus: async (id: string, status: string) =>
    (await apiClient.patch(`/fleet/drivers/${id}/status`, { status })).data,
  uploadCompliance: async (id: string, data: any) =>
    (await apiClient.post(`/fleet/drivers/${id}/compliance-documents`, data)).data,
}

export const CapacityService = {
  list: async () => (await apiClient.get('/fleet/capacity')).data,
  create: async (data: any) => (await apiClient.post('/fleet/capacity', data)).data,
}
