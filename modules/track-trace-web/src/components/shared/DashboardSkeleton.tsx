/** Skeleton shown while the V2 dashboard data is loading.
 *  Mirrors the V2 section structure so the layout shell is visible
 *  before data arrives, reducing perceived load time. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* PageHero */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <div className="h-3 w-24 rounded-full bg-gray-200" />
        <div className="mt-3 h-7 w-64 rounded-xl bg-gray-200" />
        <div className="mt-2 h-4 w-full max-w-lg rounded-lg bg-gray-100" />
      </div>

      {/* Control tower status + operator actions (2-col) */}
      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="h-3 w-32 rounded-full bg-gray-200" />
          <div className="mt-3 h-6 w-56 rounded-xl bg-gray-200" />
          <div className="mt-4 flex gap-2">
            <div className="h-7 w-28 rounded-full bg-gray-100" />
            <div className="h-7 w-24 rounded-full bg-gray-100" />
            <div className="h-7 w-20 rounded-full bg-gray-100" />
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 space-y-3">
          <div className="h-3 w-28 rounded-full bg-gray-200" />
          <div className="h-16 rounded-2xl bg-gray-100" />
          <div className="h-16 rounded-2xl bg-gray-100" />
        </div>
      </div>

      {/* TrackingDataHealthBanner (2 cards) */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-20 rounded-2xl bg-gray-100" />
        <div className="h-20 rounded-2xl bg-gray-100" />
      </div>

      {/* Critical operations KPI strip (4 cards) */}
      <div className="space-y-3">
        <div className="h-3 w-36 rounded-full bg-gray-200" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-20 rounded-full bg-gray-200" />
                  <div className="h-8 w-16 rounded-xl bg-gray-200" />
                  <div className="h-3 w-24 rounded-full bg-gray-100" />
                </div>
                <div className="h-11 w-11 rounded-xl bg-gray-100" />
              </div>
              <div className="mt-4 h-4 w-full rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>

      {/* Network health KPI strip (4 cards) */}
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-full bg-gray-200" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-20 rounded-full bg-gray-200" />
                  <div className="h-8 w-12 rounded-xl bg-gray-200" />
                  <div className="h-3 w-24 rounded-full bg-gray-100" />
                </div>
                <div className="h-10 w-10 rounded-lg bg-gray-100" />
              </div>
              <div className="mt-4 h-4 w-full rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>

      {/* Main workspace — trips table + alerts/events column */}
      <div className="space-y-3">
        <div className="h-3 w-24 rounded-full bg-gray-200" />
        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          {/* Trips card */}
          <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-200 px-5 py-4">
              <div className="h-5 w-40 rounded-xl bg-gray-200" />
              <div className="mt-1 h-3 w-56 rounded-lg bg-gray-100" />
            </div>
            {/* Selected trip insight skeleton */}
            <div className="border-b border-gray-200 bg-gray-50/70 p-5">
              <div className="flex justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-3 w-20 rounded-full bg-gray-200" />
                  <div className="h-6 w-32 rounded-xl bg-gray-200" />
                  <div className="h-3 w-48 rounded-lg bg-gray-100" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-28 rounded-xl bg-gray-100" />
                  <div className="h-8 w-28 rounded-xl bg-gray-200" />
                </div>
              </div>
            </div>
            {/* Table rows */}
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-24 rounded-lg bg-gray-200" />
                    <div className="h-3 w-32 rounded-lg bg-gray-100" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-gray-100" />
                  <div className="h-3 w-16 rounded-lg bg-gray-100" />
                </div>
              ))}
            </div>
          </div>

          {/* Alerts + events column */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-5">
              <div className="h-5 w-32 rounded-xl bg-gray-200" />
              <div className="mt-3 flex gap-2">
                <div className="h-6 w-20 rounded-full bg-gray-200" />
                <div className="h-6 w-16 rounded-full bg-gray-100" />
                <div className="h-6 w-18 rounded-full bg-gray-100" />
              </div>
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex justify-between gap-2">
                      <div className="h-4 w-32 rounded-lg bg-gray-200" />
                      <div className="h-5 w-16 rounded-full bg-gray-200" />
                    </div>
                    <div className="mt-2 h-3 w-full rounded-lg bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white p-5">
              <div className="h-5 w-36 rounded-xl bg-gray-200" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="flex justify-between gap-2">
                      <div className="h-4 w-40 rounded-lg bg-gray-200" />
                      <div className="h-3 w-20 rounded-lg bg-gray-100" />
                    </div>
                    <div className="mt-1 h-3 w-32 rounded-lg bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
