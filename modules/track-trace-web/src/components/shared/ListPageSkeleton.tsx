export function ListPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="h-3 w-20 rounded-full bg-gray-200" />
        <div className="mt-3 h-7 w-56 rounded-xl bg-gray-200" />
        <div className="mt-2 h-4 w-96 rounded-lg bg-gray-100" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2 h-11 rounded-lg bg-gray-100" />
          <div className="h-11 rounded-lg bg-gray-100" />
          <div className="h-11 rounded-lg bg-gray-100" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="h-5 w-32 rounded-lg bg-gray-200" />
          <div className="mt-1 h-3 w-48 rounded-lg bg-gray-100" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-28 rounded-lg bg-gray-200" />
                <div className="h-3 w-36 rounded-lg bg-gray-100" />
              </div>
              <div className="h-6 w-20 rounded-full bg-gray-100" />
              <div className="h-8 w-20 rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
