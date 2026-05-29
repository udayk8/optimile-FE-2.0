import { Card } from '@shared-ui'

export function FeatureAccessNotice({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card className="border border-warning/20 bg-warning/5 p-5">
      <p className="text-sm font-bold uppercase tracking-wide text-warning">Feature Access</p>
      <h3 className="mt-2 text-lg font-bold text-text">{title}</h3>
      <p className="mt-2 text-sm text-gray-700">{description}</p>
    </Card>
  )
}
