export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-20 rounded-full bg-gray-200" />
        <div className="h-3 w-3 rounded-full bg-gray-200" />
        <div className="h-3 w-24 rounded-full bg-gray-200" />
        <div className="h-3 w-3 rounded-full bg-gray-200" />
        <div className="h-3 w-20 rounded-full bg-gray-200" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-16 rounded-full bg-gray-200" />
            <div className="h-7 w-44 rounded-xl bg-gray-200" />
            <div className="h-3 w-72 rounded-lg bg-gray-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-lg bg-gray-100" />
            <div className="h-9 w-28 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
            <div className="h-3 w-24 rounded-full bg-gray-200" />
            <div className="h-6 w-20 rounded-lg bg-gray-200" />
            <div className="h-3 w-28 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.08fr,0.92fr]">
        <div className="rounded-xl border border-gray-200 bg-white h-64" />
        <div className="rounded-xl border border-gray-200 bg-white h-64" />
      </div>
    </div>
  )
}
