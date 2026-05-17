import apiClient from '@vendor/lib/api-client'

export const NotificationService = {
  list: async (params?: { isRead?: boolean; category?: string }) =>
    (await apiClient.get('/notifications', { params })).data,
  markRead: async (id: string) => (await apiClient.patch(`/notifications/${id}/read`)).data,
  markAllRead: async () => (await apiClient.patch('/notifications/read-all')).data,
}
