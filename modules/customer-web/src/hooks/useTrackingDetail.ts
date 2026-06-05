import { useState } from 'react'
import type { Booking, DetailTab } from '../shared/customer-types'

export function useTrackingDetail(bookings: Booking[]) {
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [detailTab, setDetailTab] = useState<DetailTab>('freight')

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId) ?? bookings[0]

  return { selectedBookingId, setSelectedBookingId, selectedBooking, detailTab, setDetailTab }
}
