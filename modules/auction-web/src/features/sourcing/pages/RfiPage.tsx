import { useState, useMemo, useEffect } from 'react'

import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@auction/hooks/useModuleRoute'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { useAppStore } from '@auction/stores/app.store'
import { Badge } from '@auction/components/ui/badge'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'
import { formatDateTime } from '@auction/lib/date-utils'
import { fetchRfis } from '@auction/lib/mock-services'
import type { RfiType } from '@auction/types'

const PAGE_SIZE = 10

export default function RfiPage() {
  const navigate = useNavigate()
  const storeRfis = useAppStore((s) => s.rfis)
  const [rfis, setRfis] = useState<RfiType[]>(storeRfis)
  useEffect(() => {
    fetchRfis().then(setRfis).catch(() => undefined)
  }, [])

  const [page, setPage] = useState(1)

  const filteredRfis = useMemo(() => rfis, [rfis])

  const columns = useMemo<DataTableColumn<(typeof filteredRfis)[number]>[]>(
    () => [
      { key: 'id', header: 'ID', render: (rfi) => <span className="text-sm font-medium text-[#0F172A]">{rfi.id}</span> },
      { key: 'title', header: 'Campaign Title', render: (rfi) => <span className="font-medium text-[#0F172A]">{rfi.title}</span> },
      { key: 'status', header: 'Status', render: (rfi) => <Badge variant={rfi.status === 'PUBLISHED' ? 'success' : 'secondary'}>{rfi.status}</Badge> },
      { key: 'createdBy', header: 'Created By', render: (rfi) => <span className="text-sm text-[#0F172A]">{rfi.createdBy}</span> },
      { key: 'createdAt', header: 'Created At', render: (rfi) => <span className="text-sm text-[#0F172A]">{formatDateTime(rfi.createdAt)}</span> },
      { key: 'deadline', header: 'Deadline', render: (rfi) => <span className="text-sm text-[#0F172A]">{formatDateTime(rfi.deadline)}</span> },
      { key: 'recipients', header: 'Recipients', align: 'right', render: (rfi) => <span className="text-sm text-[#0F172A]">{rfi.targetEmails.length}</span> },
      {
        key: 'action',
        header: 'Action',
        align: 'right',
        render: (rfi) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => navigate(`/auction/sourcing/rfi/${rfi.id}`)}>
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
        title="RFI Campaigns"
        subtitle="Manage Requests for Information to discover and evaluate potential new vendors."
        action={<Button onClick={() => navigate('/auction/sourcing/rfi/new')}>New RFI</Button>}
      />

      <Card className="mb-6">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>RFI Queue</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={filteredRfis}
            columns={columns}
            getRowKey={(rfi) => rfi.id}
            page={page}
            onPageChange={setPage}
            pageSize={PAGE_SIZE}
            emptyState={<div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">No RFI campaigns found.</div>}
          />
        </CardContent>
      </Card>
    </div>
  )
}
