import type { BookingRecord } from '@/modules/tms/booking/types'
import type { CustomerBookingView, CustomerBookingStatus } from '@customer/integration/customer-data-bridge'

// Internal statuses that have no direct customer-facing meaning are collapsed
// to the nearest customer-visible state below.
function mapToCustomerStatus(status: BookingRecord['status']): CustomerBookingStatus {
  switch (status) {
    case 'DRAFT':
      return 'DRAFT'
    case 'PENDING_RATE_APPROVAL':
      return 'PENDING_RATE_APPROVAL'
    case 'PENDING_AUCTION':
    case 'PENDING_ASSIGNMENT':
      return 'PENDING_ASSIGNMENT'
    case 'CONFIRMED':
      return 'READY_FOR_DISPATCH'
    case 'DISPATCHED':
      return 'DISPATCHED'
    case 'IN_TRANSIT':
      return 'IN_TRANSIT'
    case 'BREAKDOWN':
    case 'IN_TRANSIT_EXCEPTION':
      return 'IN_TRANSIT_EXCEPTION'
    case 'IN_TRANSIT_DELAYED':
      return 'IN_TRANSIT_DELAYED'
    case 'POD_PENDING':
    case 'DELIVERED':
      return 'DELIVERED'
    case 'CANCELLED':
      return 'CANCELLED'
    default:
      // INVOICED and any other terminal states → DELIVERED from customer POV
      return 'DELIVERED'
  }
}

function deriveProgress(status: BookingRecord['status']): number {
  const progressMap: Partial<Record<BookingRecord['status'], number>> = {
    DRAFT: 0,
    PENDING_RATE_APPROVAL: 10,
    PENDING_AUCTION: 15,
    PENDING_ASSIGNMENT: 20,
    CONFIRMED: 30,
    DISPATCHED: 45,
    IN_TRANSIT: 60,
    IN_TRANSIT_DELAYED: 60,
    IN_TRANSIT_EXCEPTION: 55,
    BREAKDOWN: 55,
    POD_PENDING: 85,
    DELIVERED: 100,
    INVOICED: 100,
    CANCELLED: 0,
  }
  return progressMap[status] ?? 0
}

export function mapBookingToCustomerView(
  booking: BookingRecord,
  resolvers: {
    getCustomerName: (customerId: string) => string
    getVehicleReg: (vehicleId: string | null | undefined) => string
    getDriverName: (driverId: string | null | undefined) => string
    getDriverPhone: (driverId: string | null | undefined) => string
    getAddressLabel: (addressId: string) => string
    getMaterialLabel: (materialId: string) => string
  },
): CustomerBookingView {
  const assignment = booking.assignment ?? null
  const firstDelivery = booking.deliveries?.[0]

  const origin = resolvers.getAddressLabel(booking.sourceAddressId)
  const destination = resolvers.getAddressLabel(booking.destinationAddressId)
  const consignee = resolvers.getAddressLabel(booking.consigneeAddressId)
  const material = booking.materialIds.map(resolvers.getMaterialLabel).filter(Boolean).join(', ') || '-'

  const vehicle = assignment?.vehicleId
    ? resolvers.getVehicleReg(assignment.vehicleId)
    : '-'
  const driver = assignment?.driverId
    ? resolvers.getDriverName(assignment.driverId)
    : '-'
  const driverPhone = assignment?.driverId
    ? resolvers.getDriverPhone(assignment.driverId)
    : '-'

  const lrNumber =
    booking.lrIds && booking.lrIds.length > 0
      ? booking.lrIds[0]
      : '-'

  const completedStatuses = new Set([
    'DELIVERED', 'POD_PENDING', 'INVOICED', 'CANCELLED',
  ])
  const lastEvent = booking.statusTimeline[booking.statusTimeline.length - 1]

  // Customer-visible timeline derived from statusTimeline
  const timeline: CustomerBookingView['timeline'] = (booking.statusTimeline ?? []).map((event, idx, arr) => {
    const isLast = idx === arr.length - 1
    const state: CustomerBookingView['timeline'][number]['state'] =
      completedStatuses.has(event.status)
        ? 'done'
        : isLast
          ? 'current'
          : 'done'
    return {
      label: event.eventLabel ?? event.status,
      time: event.timestamp,
      state,
    }
  })
  void lastEvent // suppress unused warning

  // Load stops from deliveries
  const loadStops: CustomerBookingView['loadStops'] = (booking.deliveries ?? []).map((delivery) => ({
    destination: resolvers.getAddressLabel(delivery.destinationAddressId ?? booking.destinationAddressId),
    material: (delivery.materialId ? resolvers.getMaterialLabel(delivery.materialId) : material),
    quantity: String(delivery.quantity ?? booking.quantity ?? ''),
    weight: delivery.weight ?? booking.weight ?? 0,
    tat: delivery.tat ?? booking.tat ?? '-',
    pod:
      delivery.pod?.podUploaded
        ? 'Captured'
        : delivery.destinationAddressId
          ? 'Pending'
          : 'Not applicable',
  }))

  // ePOD from first delivery or booking-level pod
  const pod = booking.pod ?? firstDelivery?.pod ?? null
  const epod: CustomerBookingView['epod'] = pod
    ? {
        status: pod.podUploaded ? 'Captured' : 'Pending',
        method: 'Photo + OTP',
        timestamp: pod.podUploadedAt ?? undefined,
        feedback: pod.podRemark ?? undefined,
      }
    : undefined

  return {
    id: booking.id,
    salesOrder: booking.poNumber ?? '-',
    status: mapToCustomerStatus(booking.status),
    origin,
    destination,
    consignee,
    vehicle,
    driver,
    driverPhone,
    weight: booking.weight ?? 0,
    material,
    quantity: String(booking.quantity ?? ''),
    eta: booking.tat ?? '-',
    bookingDate: booking.createdAt.slice(0, 10),
    createdBy: 'Ops',
    freight: booking.pricing?.calculatedFreight ?? 0,
    lrNumber,
    progress: deriveProgress(booking.status),
    lastUpdate: booking.updatedAt,
    avgSpeed: 0,
    distanceKm: 0,
    delayedHours: undefined,
    exceptionNote:
      booking.status === 'IN_TRANSIT_EXCEPTION' || booking.status === 'BREAKDOWN'
        ? (booking.breakdownEvents?.[booking.breakdownEvents.length - 1]?.description ?? undefined)
        : undefined,
    epod,
    consigneeLink: 'Not sent',
    loadStops,
    timeline,
    documents: (booking.shipmentDocuments?.deliveries ?? []).flatMap((d) =>
      (d.invoices ?? []).map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate ?? null,
        ewayBillNumber: d.ewayBill?.ewayBillNumber ?? null,
        ewayBillExpiry: d.ewayBill?.validToDate ?? null,
        uploadedAt: inv.uploadedAt,
      }))
    ),
    destinationChangeRequests: (booking.destinationChangeRequests ?? []).map((r) => ({
      id: r.id,
      reason: r.reason,
      status: (r.status === 'APPROVED' || r.status === 'IMPLEMENTED' ? 'APPROVED' : r.status === 'REJECTED' ? 'REJECTED' : 'PENDING') as 'PENDING' | 'APPROVED' | 'REJECTED',
      raisedAt: r.raisedAt,
    })),
  }
}
