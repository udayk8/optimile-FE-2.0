import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { useAppStore } from '@auction/stores/app.store'
import { Badge } from '@auction/components/ui/badge'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'
import { formatDateTime } from '@auction/lib/date-utils'
import { fetchRfqs } from '@auction/lib/mock-services'
import type { RfqType } from '@auction/types'

const PAGE_SIZE = 10

export default function RfqPage() {
  const navigate = useNavigate()
  const storeRfqs = useAppStore((s) => s.rfqs)
  const [rfqs, setRfqs] = useState<RfqType[]>(storeRfqs)
  useEffect(() => {
    fetchRfqs().then(setRfqs).catch(() => undefined)
  }, [])

  const [page, setPage] = useState(1)

  const filteredRfqs = useMemo(() => rfqs, [rfqs])

  const columns = useMemo<DataTableColumn<(typeof filteredRfqs)[number]>[]>(
    () => [
      { key: 'id', header: 'ID', render: (rfq) => <span className="text-sm font-medium text-[#0F172A]">{rfq.id}</span> },
      { key: 'title', header: 'RFQ Title', render: (rfq) => <span className="font-medium text-[#0F172A]">{rfq.title}</span> },
      { key: 'status', header: 'Status', render: (rfq) => <Badge variant={rfq.status === 'PUBLISHED' ? 'success' : 'secondary'}>{rfq.status}</Badge> },
      { key: 'createdBy', header: 'Created By', render: (rfq) => <span className="text-sm text-[#0F172A]">{rfq.createdBy}</span> },
      { key: 'createdAt', header: 'Created At', render: (rfq) => <span className="text-sm text-[#0F172A]">{formatDateTime(rfq.createdAt)}</span> },
      { key: 'deadline', header: 'Deadline', render: (rfq) => <span className="text-sm text-[#0F172A]">{formatDateTime(rfq.deadline)}</span> },
      { key: 'onboarded', header: 'Onboarded', align: 'right', render: (rfq) => <span className="text-sm text-[#0F172A]">{((rfq as any).invitedVendorIds ?? []).length}</span> },
      { key: 'external', header: 'External', align: 'right', render: (rfq) => <span className="text-sm text-[#0F172A]">{rfq.targetEmails?.length || 0}</span> },
      {
        key: 'action',
        header: 'Action',
        align: 'right',
        render: (rfq) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => navigate(`/auction/sourcing/rfq/${rfq.id}`)}>
              View Details
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  )

  return (
    <div>
      <HeroCard
        eyebrow="Sourcing"
        title="Request for Quotations"
        subtitle="Manage targeted RFQs sent to your onboarded vendors."
        action={<Button onClick={() => navigate('/auction/sourcing/rfq/new')}>New RFQ</Button>}
      />

      <Card className="mb-6">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>RFQ Queue</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={filteredRfqs}
            columns={columns}
            getRowKey={(rfq) => rfq.id}
            page={page}
            onPageChange={setPage}
            pageSize={PAGE_SIZE}
            emptyState={<div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">No RFQs found.</div>}
          />
        </CardContent>
      </Card>
    </div>
  )
}
