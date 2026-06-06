import { useMemo, useState } from 'react'
import type { Booking, BookingStatus } from '../shared/customer-types'
import { statusCount } from '../shared/customer-types'

export function useCustomerBookings(bookings: Booking[]) {
  const [query, setQuery] = useState('')
  const [statusTab, setStatusTab] = useState('all')

  const activeExceptions = bookings.filter(
    (b) => b.status === 'IN_TRANSIT_DELAYED' || b.status === 'IN_TRANSIT_EXCEPTION',
  )
  const activeBookings = bookings.filter((b) =>
    (['DISPATCHED', 'IN_TRANSIT', 'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION'] as BookingStatus[]).includes(b.status),
  )

  const filteredBookings = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bookings.filter((b) => {
      const matchesSearch =
        !q ||
        `${b.id} ${b.salesOrder} ${b.consignee} ${b.vehicle} ${b.origin} ${b.destination}`
          .toLowerCase()
          .includes(q)
      if (!matchesSearch) return false
      if (statusTab === 'all') return true
      if (statusTab === 'active') return (['DISPATCHED', 'IN_TRANSIT', 'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION'] as BookingStatus[]).includes(b.status)
      if (statusTab === 'pending') return (['DRAFT', 'PENDING_RATE_APPROVAL', 'PENDING_AUCTION', 'PENDING_ASSIGNMENT', 'READY_FOR_DISPATCH'] as BookingStatus[]).includes(b.status)
      if (statusTab === 'completed') return b.status === 'DELIVERED'
      if (statusTab === 'exceptions') return (['IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION'] as BookingStatus[]).includes(b.status)
      if (statusTab === 'cancelled') return b.status === 'CANCELLED'
      return true
    })
  }, [bookings, query, statusTab])

  const kpiCounts = {
    total: bookings.length,
    active: statusCount(bookings, ['DISPATCHED', 'IN_TRANSIT', 'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION']),
    pendingPod: statusCount(bookings, ['IN_TRANSIT', 'IN_TRANSIT_DELAYED', 'IN_TRANSIT_EXCEPTION']),
    completed: statusCount(bookings, ['DELIVERED']),
    delayed: statusCount(bookings, ['IN_TRANSIT_DELAYED']),
    cancelled: statusCount(bookings, ['CANCELLED']),
    exceptions: activeExceptions.length,
  }

  return {
    query, setQuery,
    statusTab, setStatusTab,
    filteredBookings,
    activeExceptions,
    activeBookings,
    kpiCounts,
  }
}
