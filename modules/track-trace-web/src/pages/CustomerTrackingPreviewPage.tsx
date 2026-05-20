import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, PageHero } from '@shared-ui'
import { CustomerTrackingCard } from '../components/CustomerTrackingCard'
import { EmptyPlaceholder } from '../components/EmptyPlaceholder'
import { TrackTraceAccessBoundary } from '../components/TrackTraceAccessBoundary'
import { Breadcrumb } from '../components/shared/Breadcrumb'
import { trackTraceV2EyebrowClassName, trackTraceV2SummaryCardClassName } from '../components/shared/trackTraceV2Chrome'
import { useTrackTraceAccess } from '../hooks/useTrackTraceAccess'
import { useTrackTraceRouting } from '../hooks/useTrackTraceRouting'
import { getCustomerSafeTracking } from '../services/customerTrackingApi'
import { getCustomerVisibilityRules } from '../services/trackingSettingsApi'
import type { CustomerVisibilityRules } from '../types/settings.types'
import type { CustomerTrackingView } from '../types/tracking.types'
import { DetailPageSkeleton } from '../components/shared/DetailPageSkeleton'

export function CustomerTrackingPreviewPage() {
  const { tripId } = useParams()
  const { scopedPath } = useTrackTraceRouting()
  const { canUseFeature, hasPermission } = useTrackTraceAccess()
  const [view, setView] = useState<CustomerTrackingView | null>(null)
  const [visibilityRules, setVisibilityRules] = useState<CustomerVisibilityRules | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tripId) {
      setError('Trip ID is missing for customer preview.')
      setLoading(false)
      return
    }

    let active = true
    Promise.all([getCustomerSafeTracking(tripId), getCustomerVisibilityRules()])
      .then(([response, rules]) => {
        if (!active) return
        if (!response) {
          setError('Customer-safe preview is not available for the selected trip.')
          return
        }
        setView(response)
        setVisibilityRules(rules)
      })
      .catch(() => {
        if (!active) return
        setError('Customer-safe preview could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [tripId])

  if (loading) {
    return <DetailPageSkeleton />
  }

  if (error || !view) {
    return <EmptyPlaceholder title="Customer preview unavailable" description={error ?? 'Preview data could not be prepared.'} />
  }

  const VISIBILITY_LABELS: Record<string, string> = {
    showVehicleNumber: 'Vehicle number',
    showDriverName: 'Driver name',
    showDriverMobile: 'Driver mobile',
    showExactLocation: 'Exact GPS location',
    showApproxLocation: 'Approximate location',
    showETA: 'ETA',
    showDelayReason: 'Delay reason',
    showPublicTimeline: 'Public timeline',
    showPODStatus: 'POD / delivery status',
    showSupportContact: 'Support contact',
  }

  const visibleFields = visibilityRules
    ? Object.entries(visibilityRules).filter(([, value]) => value).map(([key]) => VISIBILITY_LABELS[key] ?? key)
    : []
  const hiddenFields = visibilityRules
    ? Object.entries(visibilityRules).filter(([, value]) => !value).map(([key]) => VISIBILITY_LABELS[key] ?? key)
    : []

  return (
    <TrackTraceAccessBoundary page="customer-preview">
      <div className="space-y-6">
        <Breadcrumb items={[
          { label: 'Active Trips', to: scopedPath('/trips') },
          { label: tripId ?? 'Trip', to: tripId ? scopedPath(`/trips/${tripId}`) : undefined },
          { label: 'Customer Preview' },
        ]} />
        <PageHero
          eyebrow="Customer Preview"
          title={`Customer-safe preview · ${view.bookingId}`}
          subtitle="Review what a customer-safe tracking experience exposes before sharing or troubleshooting an external visibility flow."
          action={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to={scopedPath(`/trips/${tripId}`)}>Back to trip detail</Link>
              </Button>
            </div>
          }
        />
        <>
            <section className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
              <Card className="border-gray-300 p-5 sm:p-6">
                <p className={trackTraceV2EyebrowClassName}>Share-safe framing</p>
                <h2 className="mt-2 text-xl font-extrabold text-text">What the customer can and cannot see</h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  This workspace validates the external-facing visibility layer before it is shared. Only the fields listed as visible below will appear in the customer-facing tracking experience.
                </p>
              </Card>

              <Card className="p-5 sm:p-6">
                <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Visibility scope</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-success mb-2">Visible to customer ({visibleFields.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {visibleFields.length ? visibleFields.map((f) => (
                        <span key={f} className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">{f}</span>
                      )) : <span className="text-xs text-gray-400">None exposed</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Hidden from customer ({hiddenFields.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {hiddenFields.length ? hiddenFields.map((f) => (
                        <span key={f} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">{f}</span>
                      )) : <span className="text-xs text-gray-400">All fields exposed</span>}
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
              <CustomerTrackingCard view={view} visibilityRules={visibilityRules ?? undefined} />

              <Card className="p-5">
                <h3 className="text-lg font-bold text-text">Preview checklist</h3>
                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="font-semibold text-text">Status clarity</p>
                    <p className="mt-1">Ensure the customer-facing status is understandable without internal dispatch terminology.</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="font-semibold text-text">Location safety</p>
                    <p className="mt-1">Confirm exact vs approximate location settings match the account's visibility policy.</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="font-semibold text-text">Timeline trust</p>
                    <p className="mt-1">Check that public milestones are meaningful and do not leak internal-only operational detail.</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="font-semibold text-text">Last updated</p>
                    <p className="mt-1">{new Date(view.lastUpdatedAt).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </Card>
            </div>
        </>
      </div>
    </TrackTraceAccessBoundary>
  )
}
