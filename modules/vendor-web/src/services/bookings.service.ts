import apiClient from '@vendor/lib/api-client'

export async function fetchBookings(status?: string) {
  const res = await apiClient.get('/bookings', { params: status ? { status } : undefined })
  return res.data
}

export async function fetchBooking(id: string) {
  const res = await apiClient.get(`/bookings/${id}`)
  return res.data
}

export async function acceptBooking(id: string, vehicleId: string, driverId: string) {
  const res = await apiClient.post(`/bookings/${id}/accept`, { vehicleId, driverId })
  return res.data
}

export async function declineBooking(id: string, reason?: string) {
  const res = await apiClient.post(`/bookings/${id}/decline`, { reason })
  return res.data
}

export async function dispatchBooking(id: string) {
  const res = await apiClient.post(`/bookings/${id}/dispatch`)
  return res.data
}

export async function deliverBooking(id: string) {
  const res = await apiClient.post(`/bookings/${id}/deliver`)
  return res.data
}

export async function uploadPod(id: string, podReference: string, fileUrl?: string) {
  const res = await apiClient.post(`/bookings/${id}/pod`, { podReference, fileUrl })
  return res.data
}

export async function assignBooking(id: string, vehicleId: string, driverId: string) {
  const res = await apiClient.post(`/bookings/${id}/assign`, { vehicleId, driverId })
  return res.data
}
