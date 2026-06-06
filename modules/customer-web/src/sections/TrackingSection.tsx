import { useState } from 'react'
import { Badge } from '@shared-ui/badge'
import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import { AlertTriangle, MapPin, Plus, Route } from 'lucide-react'
import type { CustomerDataBridge } from '../integration/customer-data-bridge'
import { STATUS_META, currency } from '../shared/customer-types'
import type { Booking, DetailTab } from '../shared/customer-types'

type Props = {
  bookings: Booking[]
  selectedBooking: Booking | undefined
  selectedBookingId: string
  setSelectedBookingId: (id: string) => void
  detailTab: DetailTab
  setDetailTab: (tab: DetailTab) => void
  bridge: CustomerDataBridge | null
  onCreateBooking: () => void
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text">{value}</p>
    </div>
  )
}

function DestinationChangePanel({ booking, bridge }: { booking: Booking; bridge: NonNullable<CustomerDataBridge> }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const pendingRequest = booking.destinationChangeRequests?.find((r) => r.status === 'PENDING')

  if (submitted || pendingRequest) {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
        <p className="text-sm font-bold text-warning">Destination change request submitted</p>
        <p className="mt-1 text-xs text-gray-500">
          {pendingRequest ? `Reason: ${pendingRequest.reason}` : 'Your request is under review by operations.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      {!open ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-700">Need to change the delivery destination?</p>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Request Change</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-bold text-text">Destination Change Request</p>
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Reason</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer warehouse shifted, new consignee address"
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => { setOpen(false); setReason('') }}>Cancel</Button>
            <Button size="sm" onClick={() => {
              if (!reason.trim()) return
              bridge.requestDestinationChange(booking.id, reason.trim())
              setSubmitted(true)
              setOpen(false)
            }}>Submit Request</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function TrackingSection({ bookings, selectedBooking, selectedBookingId, setSelectedBookingId, detailTab, setDetailTab, bridge, onCreateBooking }: Props) {
  if (!selectedBooking) {
    return (
      <section className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
        <Route className="mx-auto h-10 w-10 text-gray-400" />
        <p className="mt-3 font-extrabold text-text">No shipments to track yet</p>
        <p className="text-sm text-gray-500">Create a booking to see live tracking and ePOD here.</p>
        <Button className="mt-4" onClick={onCreateBooking}><Plus className="h-4 w-4" /> Create Booking</Button>
      </section>
    )
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Booking Detail Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <select
            value={selectedBookingId}
            onChange={(event) => setSelectedBookingId(event.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
          >
            {bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.id} - {booking.consignee}</option>)}
          </select>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-extrabold text-text">{selectedBooking.id}</p>
                <p className="text-sm text-gray-500">{selectedBooking.origin} to {selectedBooking.destination}</p>
              </div>
              <Badge variant={STATUS_META[selectedBooking.status].badge}>{STATUS_META[selectedBooking.status].label}</Badge>
            </div>
            <p className="mt-3 text-sm text-gray-600">{STATUS_META[selectedBooking.status].description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="LR Number" value={selectedBooking.lrNumber} />
            <Info label="Freight" value={currency(selectedBooking.freight)} />
            <Info label="Vehicle" value={selectedBooking.vehicle} />
            <Info label="Driver" value={selectedBooking.driver} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>{selectedBooking.id} Details</CardTitle>
            <div className="flex flex-wrap gap-2">
              {[
                ['freight', 'Freight Details'],
                ['track', 'Track'],
                ['timeline', 'Activity Timeline'],
                ['load', 'Load Details'],
                ['documents', 'Documents'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDetailTab(key as DetailTab)}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                    detailTab === key ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {detailTab === 'freight' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Info label="Sales Order" value={selectedBooking.salesOrder} />
                <Info label="Created By" value={selectedBooking.createdBy} />
                <Info label="Booking Date" value={selectedBooking.bookingDate} />
                <Info label="Material" value={selectedBooking.material} />
                <Info label="Quantity" value={selectedBooking.quantity} />
                <Info label="Weight" value={`${selectedBooking.weight} MTS`} />
                <Info label="Driver Contact" value={`${selectedBooking.driver} / ${selectedBooking.driverPhone}`} />
                <Info label="Customer Action" value={STATUS_META[selectedBooking.status].action} />
              </div>
              {(selectedBooking.status === 'IN_TRANSIT' || selectedBooking.status === 'IN_TRANSIT_DELAYED') && bridge && (
                <DestinationChangePanel booking={selectedBooking} bridge={bridge} />
              )}
            </div>
          )}

          {detailTab === 'track' && (
            <div className="space-y-5">
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <div className="text-center">
                  <MapPin className="mx-auto h-10 w-10 text-primary" />
                  <p className="mt-3 font-extrabold text-text">Live GPS Map</p>
                  <p className="text-sm text-gray-500">Updated every 5-10 minutes through tracking integration.</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Info label="ETA" value={selectedBooking.eta} />
                <Info label="Average Speed" value={`${selectedBooking.avgSpeed} km/h`} />
                <Info label="Total Distance" value={`${selectedBooking.distanceKm} km`} />
                <Info label="Consignee Link" value={selectedBooking.consigneeLink} />
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm font-semibold text-gray-600">
                  <span>Trip Progress</span>
                  <span>{selectedBooking.progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full bg-primary" style={{ width: `${selectedBooking.progress}%` }} />
                </div>
              </div>
            </div>
          )}

          {detailTab === 'timeline' && (
            <div className="space-y-3">
              {selectedBooking.exceptionNote && (
                <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <div>
                    <p className="text-sm font-bold text-danger">Active Exception</p>
                    <p className="mt-1 text-sm text-gray-600">{selectedBooking.exceptionNote}</p>
                  </div>
                </div>
              )}
              {selectedBooking.timeline.map((event) => (
                <div key={`${event.label}-${event.time}`} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3">
                  <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                    event.state === 'done' ? 'bg-success' : event.state === 'issue' ? 'bg-danger' : event.state === 'current' ? 'bg-warning' : 'bg-gray-300'
                  }`} />
                  <div>
                    <p className="font-bold text-text">{event.label}</p>
                    <p className="text-sm text-gray-500">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {detailTab === 'load' && (
            <div className="space-y-4">
              {selectedBooking.loadStops.map((stop) => (
                <div key={stop.destination} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-text">{stop.destination}</p>
                      <p className="text-sm text-gray-500">{stop.material} - {stop.quantity}</p>
                    </div>
                    <Badge variant={stop.pod === 'Captured' ? 'success' : 'warning'}>{stop.pod}</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <Info label="Weight" value={`${stop.weight} MTS`} />
                    <Info label="TAT" value={stop.tat} />
                    <Info label="ePOD" value={stop.pod} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {detailTab === 'documents' && (
            <div className="space-y-3">
              {!selectedBooking.documents?.length ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No shipment documents uploaded yet.
                </div>
              ) : selectedBooking.documents.map((doc, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Info label="Invoice Number" value={doc.invoiceNumber} />
                    <Info label="Invoice Date" value={doc.invoiceDate ?? '-'} />
                    <Info label="eWay Bill Number" value={doc.ewayBillNumber ?? '-'} />
                    <Info label="eWay Bill Expiry" value={doc.ewayBillExpiry ?? '-'} />
                  </div>
                  <p className="text-xs text-gray-400">Uploaded at {doc.uploadedAt}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
