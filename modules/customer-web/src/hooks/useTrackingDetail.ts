import { useState } from 'react'
import type { Booking, DetailTab } from '../shared/customer-types'

export function useTrackingDetail(bookings: Booking[]) {
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [detailTab, setDetailTab] = useState<DetailTab>('overview')

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId)

  return { selectedBookingId, setSelectedBookingId, selectedBooking, detailTab, setDetailTab }
}
