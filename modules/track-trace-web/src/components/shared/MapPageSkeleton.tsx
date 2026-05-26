export function MapPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="h-3 w-20 rounded-full bg-gray-200" />
        <div className="mt-3 h-7 w-56 rounded-xl bg-gray-200" />
        <div className="mt-2 h-4 w-96 rounded-lg bg-gray-100" />
      </div>
      <div className="h-14 rounded-xl border border-gray-200 bg-white px-5" />
      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="h-[480px] rounded-xl border border-gray-200 bg-gray-100" />
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="h-5 w-40 rounded-lg bg-gray-200" />
            <div className="mt-1 h-3 w-56 rounded-lg bg-gray-100" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-gray-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
