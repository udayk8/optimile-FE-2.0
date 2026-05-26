import { EmptyPlaceholder } from './EmptyPlaceholder'

export function TrackingAnalyticsLoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
      <div className="h-[260px] animate-pulse rounded-2xl bg-gray-100" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    </div>
  )
}

export function TrackingAnalyticsErrorState({ message }: { message: string }) {
  return <div className="mt-5 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-4 text-sm text-danger">{message}</div>
}

export function TrackingAnalyticsEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mt-5">
      <EmptyPlaceholder compact title={title} description={description} />
    </div>
  )
}
