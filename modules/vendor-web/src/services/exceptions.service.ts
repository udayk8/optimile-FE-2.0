import apiClient from '@vendor/lib/api-client'

export const ExceptionService = {
  list: async (params?: { status?: string; severity?: string }) =>
    (await apiClient.get('/exceptions', { params })).data,
  get: async (id: string) => (await apiClient.get(`/exceptions/${id}`)).data,
  create: async (data: any) => (await apiClient.post('/exceptions', data)).data,
  patchStatus: async (id: string, status: string, notes?: string) =>
    (await apiClient.patch(`/exceptions/${id}/status`, { status, notes })).data,
  comment: async (id: string, note: string) => (await apiClient.post(`/exceptions/${id}/comment`, { note })).data,
}
