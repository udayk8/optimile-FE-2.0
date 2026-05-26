export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="h-3 w-20 rounded-full bg-gray-200" />
        <div className="mt-3 h-7 w-64 rounded-xl bg-gray-200" />
        <div className="mt-2 h-4 w-full max-w-lg rounded-lg bg-gray-100" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-gray-200" />
            <div className="flex gap-2">
              <div className="h-7 w-12 rounded-full bg-gray-200" />
              <div className="h-7 w-12 rounded-full bg-gray-100" />
              <div className="h-7 w-12 rounded-full bg-gray-100" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-16 w-40 rounded-2xl bg-gray-100" />
            <div className="h-16 w-40 rounded-2xl bg-gray-100" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
            <div className="h-3 w-24 rounded-full bg-gray-200" />
            <div className="h-6 w-16 rounded-lg bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="h-5 w-40 rounded-lg bg-gray-200" />
          <div className="mt-1 h-3 w-56 rounded-lg bg-gray-100" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 h-4 rounded-lg bg-gray-100" />
              <div className="h-4 w-16 rounded-lg bg-gray-100" />
              <div className="h-4 w-16 rounded-lg bg-gray-100" />
              <div className="h-4 w-20 rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
