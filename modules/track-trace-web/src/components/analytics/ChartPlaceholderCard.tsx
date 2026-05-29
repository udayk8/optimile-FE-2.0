import { Card } from '@shared-ui'
import type { DistributionPoint } from '../../types/analytics.types'

export function ChartPlaceholderCard({
  title,
  description,
  points,
}: {
  title: string
  description: string
  points: DistributionPoint[]
}) {
  const maxValue = Math.max(...points.map((point) => point.value), 1)

  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold text-text">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      <div className="mt-5 space-y-3">
        {points.map((point) => (
          <div key={point.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-text">{point.label}</span>
              <span className="text-gray-500">{point.value}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${Math.max(12, Math.round((point.value / maxValue) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
