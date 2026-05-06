import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@vendor/components/ui/card'
import { Button } from '@vendor/components/ui/button'
import { StatusBadge } from '@vendor/components/shared/StatusBadge'
import { CurrencyDisplay } from '@vendor/components/shared/CurrencyDisplay'
import { EmptyState } from '@vendor/components/shared/EmptyState'
import { SLACountdown } from '@vendor/components/shared/SLACountdown'
import { formatDate, formatDateTime } from '@vendor/lib/date-utils'
import { useAppStore } from '@vendor/stores/app.store'
import { AssignVehicleModal } from '@vendor/components/shared/AssignVehicleModal'
import { AddExpenseModal } from '@vendor/components/shared/AddExpenseModal'
import { ConfirmDialog } from '@vendor/components/shared/ConfirmDialog'
import { PageHero } from '@shared-ui/page-hero'
import { ArrowLeft, Download, FileText, MapPin, Package, Route, Truck, Clock3, CalendarRange, ReceiptText } from 'lucide-react'

type BookingMode = 'new' | 'accepted' | 'active' | 'pending-pod' | 'completed' | 'cancelled' | 'disrupted'
type DetailTab = 'freight' | 'track' | 'recent' | 'documents' | 'expenses'

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
  const [expenseFilter, setExpenseFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')

  const { indents, trips, declineIndent } = useAppStore()
  const [selectedIndentId, setSelectedIndentId] = useState<string | null>(null)
  const [selectedTripForExpense, setSelectedTripForExpense] = useState<string | null>(null)
  const [declineConfirmId, setDeclineConfirmId] = useState<string | null>(null)

  const trip = useMemo(() => trips.find((item) => item.id === id), [id, trips])
  const indent = useMemo(() => indents.find((item) => item.id === id || item.id === trip?.indentId), [id, indents, trip])
  const allExpenses = useAppStore((state) => state.expenses)
  const expenses = useMemo(() => allExpenses.filter((expense) => expense.tripId === id), [allExpenses, id])
  const mode = getBookingMode(location.pathname)
  const booking = indent ?? trip
  const resolvedMode: BookingMode =
    indent
      ? (mode === 'accepted' || mode === 'cancelled' ? mode : indent.status === 'DECLINED' ? 'cancelled' : 'new')
      : (trip?.status === 'DELIVERED'
        ? (trip.podStatus === 'CONFIRMED' ? 'completed' : 'pending-pod')
        : trip?.status === 'DISPATCHED' || trip?.status === 'IN_TRANSIT' || trip?.status === 'AT_DELIVERY'
          ? 'active'
          : trip?.status === 'EXCEPTION' || trip?.status === 'DISRUPTED'
            ? 'disrupted'
            : mode)
  const docs = booking && 'documents' in booking ? trip?.documents ?? [] : []
  const timeline = trip && 'timeline' in trip ? trip.timeline ?? [] : []

  if (!indent && !trip) {
    return <EmptyState title="Booking not found" description="The selected booking no longer exists in mock data." />
  }

  const bookingId = booking?.id ?? ''

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <PageHero
        eyebrow="Booking Detail"
        title="Booking details"
        subtitle={
          resolvedMode === 'new'
            ? 'Review the request, assign fleet, or cancel the booking.'
            : 'Review freight details, tracking, recent activity, and booking documents.'
        }
        icon={<Route className="h-5 w-5 text-primary" />}
        action={
          <div className="flex flex-wrap gap-2">
            <span className="font-mono text-sm font-semibold text-text">{bookingId}</span>
            <StatusBadge status={booking?.status ?? 'PENDING'} />
            {trip?.podStatus === 'CONFIRMED' && <StatusBadge status="CONFIRMED" label="POD confirmed" />}
            {trip?.status === 'DELIVERED' && trip?.podStatus === 'PENDING' && <StatusBadge status="PENDING" label="Pending POD" />}
            {trip?.isInvoiced && <StatusBadge status="INVOICED" />}
            {(resolvedMode === 'new' || resolvedMode === 'accepted') && (
              <>
                <Button onClick={() => setSelectedIndentId(indent!.id)}>
                  <Truck className="mr-2 h-4 w-4" /> Accept & Assign
                </Button>
                <Button variant="outline" onClick={() => setDeclineConfirmId(indent!.id)}>
                  Decline
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(['freight', 'track', 'recent', 'documents', 'expenses'] as DetailTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setDetailTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              detailTab === tab ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:text-primary'
            }`}
          >
            {tab === 'freight' && 'Freight details'}
            {tab === 'track' && 'Track'}
            {tab === 'recent' && 'Recent action'}
            {tab === 'documents' && 'Documents'}
            {tab === 'expenses' && 'Expenses'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          {detailTab === 'freight' && (
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

          {detailTab === 'track' && trip && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" /> Track
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  Vehicle {trip.assignedVehicle.registrationNumber} is moving under {trip.status} state.
                </div>
                {timeline.length === 0 ? (
                  <EmptyState title="No tracking events" />
                ) : (
                  timeline.map((event) => (
                    <div key={event.id} className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-text">{event.title}</span>
                          {event.status && <StatusBadge status={event.status} />}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{event.description}</p>
                        <p className="mt-2 text-xs text-gray-500">{formatDateTime(event.timestamp)}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {detailTab === 'recent' && trip && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-primary" /> Recent action
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-gray-500">Status: </span><StatusBadge status={trip.status} /></div>
                <div><span className="text-gray-500">Vehicle: </span>{trip.assignedVehicle.registrationNumber}</div>
                <div><span className="text-gray-500">Driver: </span>{trip.assignedDriver.name}</div>
                <div><span className="text-gray-500">Freight: </span><CurrencyDisplay amount={trip.freightRate} /></div>
                <div><span className="text-gray-500">Expenses approved: </span><CurrencyDisplay amount={trip.expenseSummary.approved} /></div>
                <div><span className="text-gray-500">Invoiced: </span>{trip.isInvoiced ? 'Yes' : 'No'}</div>
              </CardContent>
            </Card>
          )}

          {detailTab === 'documents' && (
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

          {detailTab === 'expenses' && trip && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <ReceiptText className="h-5 w-5 text-primary" /> Expenses
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                      {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setExpenseFilter(f)}
                          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                            expenseFilter === f ? 'bg-white text-text shadow-sm' : 'text-gray-600 hover:text-primary'
                          }`}
                        >
                          {f.charAt(0) + f.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                    {trip?.status === 'DELIVERED' && !trip.isInvoiced && (
                      <Button size="sm" onClick={() => setSelectedTripForExpense(trip.id)}>
                        Add Expense
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total claimed</div>
                    <div className="mt-1 text-sm font-bold text-text"><CurrencyDisplay amount={trip.expenseSummary.total} /></div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Approved</div>
                    <div className="mt-1 text-sm font-bold text-success"><CurrencyDisplay amount={trip.expenseSummary.approved} /></div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pending</div>
                    <div className="mt-1 text-sm font-bold text-warning"><CurrencyDisplay amount={trip.expenseSummary.pending} /></div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rejected</div>
                    <div className="mt-1 text-sm font-bold text-danger"><CurrencyDisplay amount={allExpenses.filter((expense) => expense.tripId === id && expense.status === 'REJECTED').reduce((sum, expense) => sum + expense.amount, 0)} /></div>
                  </div>
                </div>

                {expenses.length === 0 ? (
                  <EmptyState title="No expense claims" description="Expense claims for this booking will appear here." />
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                          <tr>
                            <th className="px-5 py-3 font-bold">Expense</th>
                            <th className="px-5 py-3 font-bold">Status</th>
                            <th className="px-5 py-3 font-bold">Submitted</th>
                            <th className="px-5 py-3 font-bold">Line Items</th>
                            <th className="px-5 py-3 font-bold text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {expenses.filter(e => expenseFilter === 'ALL' || e.status === expenseFilter).map((expense) => (
                            <tr key={expense.id} className="hover:bg-gray-50">
                              <td className="px-5 py-4">
                                <div className="font-mono text-sm font-semibold text-text">{expense.id}</div>
                                {expense.rejectionReason && <div className="mt-1 text-xs text-danger">{expense.rejectionReason}</div>}
                              </td>
                              <td className="px-5 py-4"><StatusBadge status={expense.status} /></td>
                              <td className="px-5 py-4 text-sm text-text">{formatDateTime(expense.submittedAt)}</td>
                              <td className="px-5 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {expense.lineItems.map((line) => (
                                    <span key={line.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                      {line.expenseType}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <CurrencyDisplay amount={expense.amount} className="text-sm font-semibold text-text" />
                              </td>
                            </tr>
                          ))}
                          {expenses.filter(e => expenseFilter === 'ALL' || e.status === expenseFilter).length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-sm text-gray-500">
                                No expenses match this filter.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
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
                <div><span className="text-gray-500">Approved expenses: </span><CurrencyDisplay amount={trip.expenseSummary.approved} /></div>
                <div><span className="text-gray-500">Invoice status: </span>{trip.isInvoiced ? 'Invoiced' : 'Pending'}</div>
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

      {indent && (mode === 'new' || mode === 'accepted') && (
        <AssignVehicleModal isOpen={!!selectedIndentId} onClose={() => setSelectedIndentId(null)} indentId={indent.id} />
      )}

      {selectedTripForExpense && trip && (
        <AddExpenseModal
          isOpen={true}
          onClose={() => setSelectedTripForExpense(null)}
          initialTripId={trip.id}
        />
      )}

      <ConfirmDialog
        isOpen={!!declineConfirmId}
        onClose={() => setDeclineConfirmId(null)}
        onConfirm={() => {
          if (declineConfirmId) declineIndent(declineConfirmId)
          setDeclineConfirmId(null)
          navigate('/vendor/bookings?tab=cancelled')
        }}
        title="Decline booking?"
        description="This will mark the booking as cancelled in the mock data."
        confirmLabel="Decline Booking"
        variant="destructive"
      />
    </div>
  )
}
