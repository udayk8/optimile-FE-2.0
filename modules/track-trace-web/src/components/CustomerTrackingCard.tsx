import { Card } from '@shared-ui'
import type { CustomerVisibilityRules } from '../types/settings.types'
import type { CustomerTrackingView } from '../types/tracking.types'

export function CustomerTrackingCard({
  view,
  visibilityRules,
}: {
  view: CustomerTrackingView
  visibilityRules?: CustomerVisibilityRules
}) {
  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold text-text">Customer-safe tracking preview</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Booking ID</p>
          <p className="mt-1 text-sm font-semibold text-text">{view.bookingId}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Current Status</p>
          <p className="mt-1 text-sm font-semibold text-text">{view.currentStatus}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Origin / Destination</p>
          <p className="mt-1 text-sm font-semibold text-text">{view.origin} to {view.destination}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">ETA / Delay</p>
          <p className="mt-1 text-sm font-semibold text-text">
            {visibilityRules?.showETA === false ? 'Hidden by tenant rule' : new Date(view.eta).toLocaleString('en-IN')}
            {visibilityRules?.showDelayReason === false ? '' : ` · ${view.delayStatus}`}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Current Region</p>
          <p className="mt-1 text-sm font-semibold text-text">
            {visibilityRules?.showExactLocation === true || visibilityRules?.showApproxLocation !== false ? view.currentRegion : 'Hidden by tenant rule'}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">POD Status</p>
          <p className="mt-1 text-sm font-semibold text-text">{visibilityRules?.showPODStatus === false ? 'Hidden by tenant rule' : view.podStatus}</p>
        </div>
      </div>
      {visibilityRules?.showPublicTimeline === false ? null : (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Public Timeline</p>
          <div className="mt-3 space-y-3">
            {view.publicTimeline.map((item) => (
              <div key={`${item.title}-${item.time}`} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-text">{item.title}</p>
                  <p className="text-xs text-gray-500">{new Date(item.time).toLocaleString('en-IN')}</p>
                </div>
                {item.location ? <p className="mt-1 text-sm text-gray-600">{item.location}</p> : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
