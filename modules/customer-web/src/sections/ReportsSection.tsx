import { Button } from '@shared-ui/button'
import { Card, CardContent } from '@shared-ui/card'
import { Download, FileText } from 'lucide-react'
import { REPORTS } from '../shared/customer-types'

export function ReportsSection() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-text">Reports & Analytics</h2>
        <p className="text-sm text-gray-500">Downloadable operational and financial reports for customer teams.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {REPORTS.map((report) => (
          <Card key={report.name}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <p className="font-extrabold text-text">{report.name}</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{report.metrics}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">Exports: {report.exports}</p>
                </div>
                <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
