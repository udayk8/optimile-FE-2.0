import apiClient from '@vendor/lib/api-client'

export const InvoiceService = {
  list: async (status?: string) => (await apiClient.get('/invoices', { params: status ? { status } : undefined })).data,
  get: async (id: string) => (await apiClient.get(`/invoices/${id}`)).data,
  create: async (data: any) => (await apiClient.post('/invoices', data)).data,
  submit: async (id: string) => (await apiClient.post(`/invoices/${id}/submit`)).data,
  cancel: async (id: string) => (await apiClient.post(`/invoices/${id}/cancel`)).data,
  dispute: async (id: string, reason: string) => (await apiClient.post(`/invoices/${id}/dispute`, { reason })).data,
}

export const ExpenseService = {
  list: async (params?: { bookingId?: string; status?: string }) =>
    (await apiClient.get('/expenses', { params })).data,
  get: async (id: string) => (await apiClient.get(`/expenses/${id}`)).data,
  create: async (data: any) => (await apiClient.post('/expenses', data)).data,
  submit: async (id: string) => (await apiClient.post(`/expenses/${id}/submit`)).data,
  remove: async (id: string) => (await apiClient.delete(`/expenses/${id}`)).data,
}

export const LedgerService = {
  list: async (params?: { from?: string; to?: string }) => (await apiClient.get('/ledger', { params })).data,
  payments: async (status?: string) => (await apiClient.get('/payments', { params: status ? { status } : undefined })).data,
}

export const DisputeService = {
  list: async (status?: string) => (await apiClient.get('/disputes', { params: status ? { status } : undefined })).data,
  get: async (id: string) => (await apiClient.get(`/disputes/${id}`)).data,
  comment: async (id: string, note: string) => (await apiClient.post(`/disputes/${id}/comment`, { note })).data,
  close: async (id: string) => (await apiClient.post(`/disputes/${id}/close`)).data,
}
