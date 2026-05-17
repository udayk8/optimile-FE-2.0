import apiClient from '@vendor/lib/api-client'

export const ProfileService = {
  get: async () => (await apiClient.get('/profile')).data,
  updateCompany: async (data: any) => (await apiClient.put('/profile/company', data)).data,
  updateContact: async (data: any) => (await apiClient.put('/profile/contact', data)).data,
  getBank: async () => (await apiClient.get('/profile/bank')).data,
  updateBank: async (data: any) => (await apiClient.put('/profile/bank', data)).data,
  listDocuments: async () => (await apiClient.get('/profile/documents')).data,
  uploadDocument: async (data: any) => (await apiClient.post('/profile/documents', data)).data,
  dashboard: async () => (await apiClient.get('/dashboard')).data,
}
