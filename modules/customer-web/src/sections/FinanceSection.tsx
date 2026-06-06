import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import { ReceiptText } from 'lucide-react'
import { FINANCE_TILES } from '../shared/customer-types'

export function FinanceSection() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-text">Finance Snapshot</h2>
        <p className="text-sm text-gray-500">Customer-facing AR visibility from freight, invoice, and payment data.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {FINANCE_TILES.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="p-5">
              <ReceiptText className="h-5 w-5 text-primary" />
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500">{tile.label}</p>
              <p className="mt-2 text-2xl font-extrabold text-text">{tile.value}</p>
              <p className="mt-1 text-sm text-gray-500">{tile.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Invoice Aging</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          {['0-15 days', '16-30 days', '31-45 days', '46-60 days', '60+ days'].map((bucket, index) => (
            <div key={bucket} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{bucket}</p>
              <p className="mt-2 text-xl font-extrabold text-text">Rs {[2.4, 3.1, 1.9, 0.8, 0.4][index] ?? 0}L</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
