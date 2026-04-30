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
import { ArrowLeft, Download, FileText, MapPin, Package, Route, Truck, Clock3, CalendarRange } from 'lucide-react'

function getTripMode(pathname: string) {
  return pathname.split('/')[2] as 'indents' | 'active' | 'completed'
}

export default function TripDetailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()
  const mode = getTripMode(location.pathname)
  const id = params.id ?? ''

  const { indents, trips, declineIndent } = useAppStore()
  const [selectedIndentId, setSelectedIndentId] = useState<string | null>(null)
  const [selectedTripForExpense, setSelectedTripForExpense] = useState<string | null>(null)
  const [declineConfirmId, setDeclineConfirmId] = useState<string | null>(null)

  const indent = useMemo(() => indents.find((item) => item.id === id), [id, indents])
  const trip = useMemo(() => trips.find((item) => item.id === id), [id, trips])

  const relatedTrip = trip ?? trips.find((item) => item.indentId === indent?.id)

  if (mode === 'indents' && !indent) {
    return <EmptyState title="Indent not found" description="The selected indent no longer exists in mock data." />
  }

  if ((mode === 'active' || mode === 'completed') && !trip) {
    return <EmptyState title="Trip not found" description="The selected trip no longer exists in mock data." />
  }

  const docs = relatedTrip?.documents ?? []
  const timeline = relatedTrip?.timeline ?? []

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-semibold">{mode === 'indents' ? indent?.id : trip?.id}</span>
                <StatusBadge status={mode === 'indents' ? indent?.status ?? 'PENDING' : trip?.status ?? 'DISPATCHED'} />
                {mode !== 'indents' && trip?.podStatus === 'CONFIRMED' && <StatusBadge status="CONFIRMED" label="POD confirmed" />}
                {mode !== 'indents' && trip?.isInvoiced && <StatusBadge status="INVOICED" />}
              </div>
              <h1 className="mt-2 text-3xl font-semibold">Trip details</h1>
              <p className="mt-2 text-muted-foreground">
                {mode === 'indents'
                  ? 'Review the indent, assign fleet, or decline it with a reason.'
                  : 'View trip timeline, document links, and invoicing status in one place.'}
              </p>
            </div>
            {mode === 'indents' ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setSelectedIndentId(indent!.id)}>
                  <Truck className="mr-2 h-4 w-4" /> Accept & Assign
                </Button>
                <Button variant="outline" onClick={() => setDeclineConfirmId(indent!.id)}>
                  Decline
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trip?.status === 'DELIVERED' && trip.podStatus === 'CONFIRMED' && !trip.isInvoiced && (
                  <Button variant="outline" onClick={() => setSelectedTripForExpense(trip.id)}>
                    Add Expense
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate('/invoices/list')}>
                  View invoices
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-primary" /> Route and load
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> Lane</div>
                <div className="mt-2 font-medium">{(mode === 'indents' ? indent?.laneDetails : trip?.laneDetails)?.origin.city} → {(mode === 'indents' ? indent?.laneDetails : trip?.laneDetails)?.destination.city}</div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Package className="h-4 w-4" /> Load</div>
                <div className="mt-2 font-medium">
                  {mode === 'indents'
                    ? `${indent?.loadDetails.commodity}, ${(indent?.loadDetails.weightKg ?? 0) / 1000}T`
                    : `${trip?.assignedVehicle.type} with ${trip?.assignedDriver.name}`}
                </div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" /> SLA</div>
                <div className="mt-2">
                  {mode === 'indents' ? <SLACountdown deadline={indent!.slaDeadline} /> : <span>{trip?.podStatus === 'CONFIRMED' ? 'POD confirmed' : 'In execution'}</span>}
                </div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarRange className="h-4 w-4" /> Reporting / Delivery</div>
                <div className="mt-2 font-medium">
                  {mode === 'indents' ? formatDateTime(indent!.reportingDateTime) : formatDate(trip?.deliveredDate || trip?.createdAt || '')}
                </div>
              </div>
            </CardContent>
          </Card>

          {mode !== 'indents' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-primary" /> Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {timeline.length === 0 ? (
                  <EmptyState title="No timeline events" />
                ) : (
                  timeline.map((event) => (
                    <div key={event.id} className="flex gap-3 rounded-xl border p-4">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{event.title}</span>
                          {event.status && <StatusBadge status={event.status} />}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(event.timestamp)}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {mode !== 'indents' && trip && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" /> Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Vehicle: </span>{trip.assignedVehicle.registrationNumber}</div>
                <div><span className="text-muted-foreground">Driver: </span>{trip.assignedDriver.name}</div>
                <div><span className="text-muted-foreground">Freight: </span><CurrencyDisplay amount={trip.freightRate} /></div>
                <div><span className="text-muted-foreground">Expenses approved: </span><CurrencyDisplay amount={trip.expenseSummary.approved} /></div>
                <div><span className="text-muted-foreground">Invoiced: </span>{trip.isInvoiced ? 'Yes' : 'No'}</div>
              </CardContent>
            </Card>
          )}

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
                  <div key={doc.id} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{doc.title}</div>
                        <div className="text-sm text-muted-foreground">{doc.fileName}</div>
                        {doc.note && <div className="mt-1 text-xs text-muted-foreground">{doc.note}</div>}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.alert(`Mock download for ${doc.fileName}`)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {mode === 'indents' && indent && (
        <AssignVehicleModal isOpen={!!selectedIndentId} onClose={() => setSelectedIndentId(null)} indentId={indent.id} />
      )}

      {mode !== 'indents' && trip && (
        <AddExpenseModal
          isOpen={!!selectedTripForExpense}
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
          navigate('/trips?tab=penalties')
        }}
        title="Decline indent?"
        description="This will mark the indent as declined and apply the standard penalty in mock data."
        confirmLabel="Decline Indent"
        variant="destructive"
      />
    </div>
  )
}
