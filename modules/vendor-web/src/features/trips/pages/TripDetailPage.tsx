import { useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@vendor/hooks/useModuleRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { formatDate, formatDateTime } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { useVendorBookings } from '@vendor/integration/useVendorBookings'
import type { VendorBookingDetail } from '@vendor/integration/tenant-data-bridge'
import { MOCK_BOOKING_PARTIES } from '@vendor/lib/mock-data'
import { AssignVehicleModal } from '@vendor/components/shared/AssignVehicleModal'
import { ConfirmDialog } from '@vendor/components/shared/ConfirmDialog'
import { PageHero } from '@shared-ui/page-hero'
import { ArrowLeft, CheckCircle, Download, ExternalLink, FileText, MapPin, Package, Route, Truck, Clock3, CalendarRange } from 'lucide-react'
import type { Trip, TripDocument } from '@vendor/types'

type BookingMode = 'new' | 'accepted' | 'active' | 'pending-pod' | 'completed' | 'cancelled' | 'rejected' | 'exception'
type DetailTab = 'freight' | 'documents'

function getBookingMode(pathname: string) {
  const rawMode = pathname.split('/')[3]
  return rawMode === 'indents' ? 'new' : (rawMode as BookingMode)
}

export default function TripDetailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id ?? ''
  const [detailTab, setDetailTab] = useState<DetailTab>('freight')

  // Source bookings from the cross-module bridge when embedded (trips are
  // synthesized from shared bookings, not in the local app.store), else fall
  // back to app.store standalone.
  const { indents, trips, acceptIndent, declineIndent, getBookingDetail } = useVendorBookings()
  const [assignTripId, setAssignTripId] = useState<string | null>(null)
  const [declineConfirmId, setDeclineConfirmId] = useState<string | null>(null)

  const trip = useMemo(() => trips.find((item) => item.id === id), [id, trips])
  const indent = useMemo(() => indents.find((item) => item.id === id || item.id === trip?.indentId), [id, indents, trip])
  const contracts = useAppStore((state) => state.contracts)
  const mode = getBookingMode(location.pathname)
  const booking = indent ?? trip
  // Embedded: rich shared-booking detail (consignor/consignee, docs, LR). Null
  // for mock/demo bookings and standalone — synthesized below so both sources
  // render the exact same detail UI.
  const bridgeDetail = getBookingDetail(id)
  const ASSIGNMENT_STATES: Trip['status'][] = ['ACCEPTED', 'ASSIGNED', 'OUT_FOR_PICKUP', 'PICKUP_REACHED', 'LOADING_STARTED', 'LOADING_COMPLETED']
  const IN_TRANSIT_STATES: Trip['status'][] = ['IN_TRANSIT', 'DESTINATION_REACHED']
  const resolvedMode: BookingMode =
    indent
      ? (mode === 'accepted' || mode === 'cancelled' || mode === 'rejected' ? mode : indent.status === 'DECLINED' ? 'rejected' : 'new')
      : trip?.status === 'COMPLETED'
        ? 'completed'
        : trip?.status === 'POD_PENDING'
          ? 'pending-pod'
          : trip?.status === 'CANCELLED'
            ? 'cancelled'
            : trip && (ASSIGNMENT_STATES.includes(trip.status) || IN_TRANSIT_STATES.includes(trip.status))
              ? (trip.exceptionFlag ? 'exception' : 'active')
              : mode
  const backTab =
    resolvedMode === 'completed' ? 'completed'
    : resolvedMode === 'pending-pod' ? 'pending-pod'
    : resolvedMode === 'cancelled' ? 'cancelled'
    : resolvedMode === 'rejected' ? 'rejected'
    : resolvedMode === 'exception' ? 'exception'
    : resolvedMode === 'active' ? 'in-transit'
    : (resolvedMode === 'new' || resolvedMode === 'accepted') ? 'pending-allocation'
    : 'assignment'
  const POST_ACCEPT_STATUSES: Trip['status'][] = ['ASSIGNED', 'OUT_FOR_PICKUP', 'PICKUP_REACHED', 'LOADING_STARTED', 'LOADING_COMPLETED', 'IN_TRANSIT', 'DESTINATION_REACHED']
  const tripDocs = booking && 'documents' in booking ? trip?.documents ?? [] : []
  const docs = (() => {
    if (!trip || !POST_ACCEPT_STATUSES.includes(trip.status)) return tripDocs
    const haveType = new Set(tripDocs.map((d) => d.type))
    const defaults: TripDocument[] = []
    if (!haveType.has('LR_COPY')) defaults.push({ id: `${trip.id}-lr`, type: 'LR_COPY', title: 'LR copy', fileName: `lr-${trip.id.toLowerCase()}.pdf`, fileUrl: `/docs/lr-${trip.id.toLowerCase()}.pdf`, createdAt: trip.createdAt })
    if (!haveType.has('EWAY_BILL')) defaults.push({ id: `${trip.id}-eway`, type: 'EWAY_BILL', title: 'E-way bill copy', fileName: `ewaybill-${trip.id.toLowerCase()}.pdf`, fileUrl: `/docs/ewaybill-${trip.id.toLowerCase()}.pdf`, createdAt: trip.createdAt })
    if (!haveType.has('INVOICE_COPY')) defaults.push({ id: `${trip.id}-inv`, type: 'INVOICE_COPY', title: 'Invoice copy', fileName: `invoice-${trip.id.toLowerCase()}.pdf`, fileUrl: `/docs/invoice-${trip.id.toLowerCase()}.pdf`, createdAt: trip.createdAt })
    return [...defaults, ...tripDocs]
  })()
  const visibleTabs: DetailTab[] = ['freight', 'documents']
  const effectiveDetailTab: DetailTab = visibleTabs.includes(detailTab) ? detailTab : 'freight'

  // Mock/demo bookings have no shared-booking record, so build the same
  // VendorBookingDetail shape from local data — identical format and UI for
  // cross-module and mock bookings.
  const detail: VendorBookingDetail | null = bridgeDetail ?? (() => {
    if (!booking) return null
    const lane = booking.laneDetails
    const customerName = indent?.contractReference.split('/').pop()?.trim() ?? 'Customer'
    // Same party shape the bridge resolves from shared customer addresses.
    const party = (point: typeof lane.origin) =>
      MOCK_BOOKING_PARTIES[point.city] ?? {
        name: customerName,
        address: [point.name, point.city, point.state].filter(Boolean).join(', '),
      }
    const postAccept = trip ? POST_ACCEPT_STATUSES.includes(trip.status) : false
    return {
      bookingRef: booking.id,
      customerName,
      origin: lane.origin.city || lane.origin.name,
      destination: lane.destination.city || lane.destination.name,
      consignor: party(lane.origin),
      consignee: party(lane.destination),
      qty: indent ? `${indent.loadDetails.volumeCbm} CBM` : '—',
      weight: indent ? `${indent.loadDetails.weightKg / 1000} MT` : '—',
      pickup: formatDate(indent?.reportingDateTime ?? trip?.createdAt ?? ''),
      vehicle: trip?.assignedVehicle.registrationNumber ?? '—',
      driver: trip?.assignedDriver.name ?? '—',
      status: booking.status,
      freight: trip?.freightRate ?? 0,
      lrNumbers: postAccept ? [`LR-${booking.id}`] : [],
      documents: docs.map((doc) => ({ id: doc.id, title: doc.title, fileName: doc.fileName, url: doc.fileUrl ?? `/docs/${doc.fileName}` })),
    }
  })()

  if (!indent && !trip) {
    return <EmptyState title="Booking not found" description="The selected booking no longer exists in mock data." />
  }

  const bookingId = booking?.id ?? ''

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(`/vendor/bookings?tab=${backTab}`)}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to bookings
      </button>

      <PageHero
        eyebrow="Booking Detail"
        title="Booking details"
        subtitle={
          resolvedMode === 'new'
            ? 'Review the request, assign fleet, or cancel the booking.'
            : 'Review freight details and booking documents.'
        }
        icon={<Route className="h-5 w-5 text-primary" />}
        action={
          <div className="flex flex-wrap gap-2">
            <span className="font-mono text-sm font-semibold text-text">{bookingId}</span>
            <StatusBadge status={booking?.status ?? 'PENDING'} />
            {trip?.slaFlag && <StatusBadge status={trip.slaFlag} />}
            {trip?.exceptionFlag && <StatusBadge status="EXCEPTION" />}
            {indent && (resolvedMode === 'new' || resolvedMode === 'accepted') && (
              <>
                <Button onClick={() => { acceptIndent(indent.id); navigate('/vendor/bookings?tab=assignment') }}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Accept
                </Button>
                <Button variant="outline" onClick={() => setDeclineConfirmId(indent.id)}>
                  Decline
                </Button>
              </>
            )}
            {trip?.status === 'ACCEPTED' && (
              <Button onClick={() => setAssignTripId(trip.id)}>
                <Truck className="mr-2 h-4 w-4" /> Assign Vehicle & Driver
              </Button>
            )}
          </div>
        }
      />

      {detail && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500">
              <MapPin className="h-4 w-4" /> Consignor (Pickup)
            </h3>
            {detail.consignor ? (
              <div className="mt-2 space-y-0.5 text-sm">
                <p className="font-semibold text-text">{detail.consignor.name}</p>
                <p className="text-gray-600">{detail.consignor.address}</p>
                {detail.consignor.contact && <p className="text-gray-500">Contact: {detail.consignor.contact}</p>}
                {detail.consignor.phone && <p className="text-gray-500">Phone: {detail.consignor.phone}</p>}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">Origin: {detail.origin}</p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500">
              <MapPin className="h-4 w-4" /> Consignee (Drop)
            </h3>
            {detail.consignee ? (
              <div className="mt-2 space-y-0.5 text-sm">
                <p className="font-semibold text-text">{detail.consignee.name}</p>
                <p className="text-gray-600">{detail.consignee.address}</p>
                {detail.consignee.contact && <p className="text-gray-500">Contact: {detail.consignee.contact}</p>}
                {detail.consignee.phone && <p className="text-gray-500">Phone: {detail.consignee.phone}</p>}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">Destination: {detail.destination}</p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Shipment</h3>
            <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="text-gray-500">Customer</p><p className="font-semibold text-text">{detail.customerName}</p></div>
              <div><p className="text-gray-500">Route</p><p className="font-semibold text-text">{detail.origin} → {detail.destination}</p></div>
              <div><p className="text-gray-500">Qty / Weight</p><p className="font-semibold text-text">{detail.qty} · {detail.weight}</p></div>
              <div><p className="text-gray-500">Pickup</p><p className="font-semibold text-text">{detail.pickup || '—'}</p></div>
              <div><p className="text-gray-500">Vehicle</p><p className="font-semibold text-text">{detail.vehicle}</p></div>
              <div><p className="text-gray-500">Driver</p><p className="font-semibold text-text">{detail.driver}</p></div>
              <div><p className="text-gray-500">LR</p><p className="font-semibold text-text">{detail.lrNumbers.join(', ') || '—'}</p></div>
              <div><p className="text-gray-500">Freight</p><p className="font-semibold text-text">₹{detail.freight.toLocaleString()}</p></div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Documents</h3>
            {detail.documents.length ? (
              <div className="mt-2 divide-y divide-gray-100">
                {detail.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="font-medium text-text">{doc.title}</span>
                      <span className="truncate text-gray-400">{doc.fileName}</span>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">No documents uploaded yet.</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setDetailTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              effectiveDetailTab === tab ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:text-primary'
            }`}
          >
            {tab === 'freight' && 'Freight details'}
            {tab === 'documents' && 'Documents'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          {effectiveDetailTab === 'freight' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5 text-primary" /> Freight details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500"><MapPin className="h-4 w-4" /> Lane</div>
                  <div className="mt-2 font-bold text-text">{booking?.laneDetails.origin.city} → {booking?.laneDetails.destination.city}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500"><Package className="h-4 w-4" /> Load / Vehicle</div>
                  <div className="mt-2 font-bold text-text">
                    {indent
                      ? `${indent.loadDetails.commodity}, ${indent.loadDetails.weightKg / 1000}T`
                      : `${trip?.assignedVehicle.type} / ${trip?.assignedDriver.name}`}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500"><CalendarRange className="h-4 w-4" /> Reporting / Delivery</div>
                  <div className="mt-2 font-bold text-text">
                    {indent ? formatDateTime(indent.reportingDateTime) : formatDate(trip?.deliveredDate || trip?.createdAt || '')}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500"><Clock3 className="h-4 w-4" /> SLA / POD</div>
                  <div className="mt-2 font-bold text-text">
                    {indent ? <SLACountdown deadline={indent.slaDeadline} /> : trip?.podStatus === 'CONFIRMED' ? 'POD confirmed' : 'Pending POD'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {effectiveDetailTab === 'documents' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {docs.length === 0 ? (
                  <EmptyState title="No documents attached" />
                ) : (
                  docs.map((doc) => (
                    <div key={doc.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-text">{doc.title}</div>
                          <div className="text-sm text-gray-600">{doc.fileName}</div>
                          {doc.note && <div className="mt-1 text-xs text-gray-500">{doc.note}</div>}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => window.alert(`Mock download for ${doc.fileName}`)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

        </div>

        <div className="space-y-6">
          {trip && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" /> Booking summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-gray-500">Vehicle: </span>{trip.assignedVehicle?.registrationNumber ?? '—'}</div>
                <div><span className="text-gray-500">Driver: </span>{trip.assignedDriver?.name ?? '—'}</div>
                <div><span className="text-gray-500">Freight: </span><CurrencyDisplay amount={trip.freightRate} /></div>
              </CardContent>
            </Card>
          )}
          {indent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> Booking request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-gray-500">Contract: </span>{indent.contractReference}</div>
                <div><span className="text-gray-500">Vehicle type: </span>{indent.vehicleTypeRequired}</div>
                <div><span className="text-gray-500">SLA: </span><SLACountdown deadline={indent.slaDeadline} /></div>
                <div><span className="text-gray-500">Reporting: </span>{formatDateTime(indent.reportingDateTime)}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {assignTripId && (
        <AssignVehicleModal isOpen={!!assignTripId} onClose={() => setAssignTripId(null)} tripId={assignTripId} />
      )}

      <ConfirmDialog
        isOpen={!!declineConfirmId}
        onClose={() => setDeclineConfirmId(null)}
        onConfirm={() => {
          if (declineConfirmId) declineIndent(declineConfirmId)
          setDeclineConfirmId(null)
          navigate('/vendor/bookings?tab=rejected')
        }}
        title="Decline booking?"
        description="This will mark the booking as cancelled in the mock data."
        confirmLabel="Decline Booking"
        variant="destructive"
      />
    </div>
  )
}
