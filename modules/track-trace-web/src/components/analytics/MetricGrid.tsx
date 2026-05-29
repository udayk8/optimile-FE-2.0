import { Card } from '@shared-ui'

export function MetricGrid({
  items,
}: {
  items: Array<{ label: string; value: string | number; description?: string }>
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{item.label}</p>
          <p className="mt-2 text-2xl font-extrabold text-text">{item.value}</p>
          {item.description ? <p className="mt-1 text-sm text-gray-600">{item.description}</p> : null}
        </Card>
      ))}
    </div>
  )
}
