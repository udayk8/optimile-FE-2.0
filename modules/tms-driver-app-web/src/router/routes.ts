const BASE = '/driver-app'

export const routes = {
  dashboard: `${BASE}`,
  trips: `${BASE}/trips`,
  tripDetail: (tripId: string) => `${BASE}/trips/${tripId}`,
  deliveryDetail: (tripId: string, deliveryId: string) => `${BASE}/trips/${tripId}/delivery/${deliveryId}`,
  subDelivery: (tripId: string, deliveryId: string) => `${BASE}/trips/${tripId}/delivery/${deliveryId}/sub`,
  uploadPod: (tripId: string, deliveryId: string) => `${BASE}/trips/${tripId}/delivery/${deliveryId}/pod`,
  tripDocuments: (tripId: string) => `${BASE}/trips/${tripId}/documents`,
  documents: `${BASE}/documents`,
  poi: `${BASE}/poi`,
  fuelExpenses: `${BASE}/fuel-expenses`,
  incidents: `${BASE}/incidents`,
  profile: `${BASE}/profile`,
  notifications: `${BASE}/notifications`,
}
