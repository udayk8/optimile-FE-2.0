import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Badge } from '@auction/components/ui/badge'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'
import { formatDateTime } from '@auction/lib/date-utils'
import { Users } from 'lucide-react'
import type { RfiType, RfqType } from '@auction/types'
import { fetchRfis, fetchRfqs } from '@auction/lib/mock-services'

const PAGE_SIZE = 10

export default function SourcingPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = searchParams.get('tab') === 'RFQ' ? 'RFQ' : 'RFI'

  const [page, setPage] = useState(1)

  const [rfis, setRfis] = useState<RfiType[]>([])
  const [rfqs, setRfqs] = useState<RfqType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetchRfis(),
      fetchRfqs(),
    ])
      .then(([rfiData, rfqData]) => {
        setRfis(rfiData)
        setRfqs(rfqData)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filteredRfis = useMemo(() => rfis, [rfis])

  const rfiColumns = useMemo<DataTableColumn<(typeof filteredRfis)[number]>[]>(
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

  const filteredRfqs = useMemo(() => rfqs, [rfqs])

  const rfqColumns = useMemo<DataTableColumn<(typeof filteredRfqs)[number]>[]>(
    () => [
      { key: 'id', header: 'ID', render: (rfq) => <span className="text-sm font-medium text-[#0F172A]">{rfq.id}</span> },
      { key: 'title', header: 'RFQ Title', render: (rfq) => <span className="font-medium text-[#0F172A]">{rfq.title}</span> },
      { key: 'status', header: 'Status', render: (rfq) => <Badge variant={rfq.status === 'PUBLISHED' ? 'success' : 'secondary'}>{rfq.status}</Badge> },
      { key: 'createdBy', header: 'Created By', render: (rfq) => <span className="text-sm text-[#0F172A]">{rfq.createdBy}</span> },
      { key: 'createdAt', header: 'Created At', render: (rfq) => <span className="text-sm text-[#0F172A]">{formatDateTime(rfq.createdAt)}</span> },
      { key: 'deadline', header: 'Deadline', render: (rfq) => <span className="text-sm text-[#0F172A]">{formatDateTime(rfq.deadline)}</span> },
      { key: 'recipients', header: 'Recipients', align: 'right', render: (rfq) => <span className="text-sm text-[#0F172A]">{rfq.targetEmails?.length || 0}</span> },
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
        title="Client Hub"
        subtitle="Manage Requests for Information (RFI) to discover new vendors, and Requests for Quotation (RFQ) to gather pricing."
        icon={<Users className="h-5 w-5 text-primary" />}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/auction/sourcing/rfi/new')}>New RFI</Button>
            <Button onClick={() => navigate('/auction/sourcing/rfq/new')}>New RFQ</Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>{activeTab === 'RFI' ? 'RFI Campaigns' : 'RFQ Events'}</CardTitle>
          </div>
          <div className="flex w-fit gap-1 overflow-x-auto border-b border-gray-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`shrink-0 whitespace-nowrap px-4 py-3 text-sm font-bold transition-all ${activeTab === 'RFI' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'}`}
              onClick={() => { setSearchParams({ tab: 'RFI' }); setPage(1) }}
            >
              RFI Campaigns
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`shrink-0 whitespace-nowrap px-4 py-3 text-sm font-bold transition-all ${activeTab === 'RFQ' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'}`}
              onClick={() => { setSearchParams({ tab: 'RFQ' }); setPage(1) }}
            >
              Request for Quotations (RFQs)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              Failed to load data: {error}
            </div>
          )}
          {activeTab === 'RFI' ? (
            <DataTable
              rows={filteredRfis}
              columns={rfiColumns}
              getRowKey={(rfi) => rfi.id}
              page={page}
              onPageChange={setPage}
              pageSize={PAGE_SIZE}
              emptyState={loading ? <div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">Loading...</div> : <div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">No RFI campaigns found.</div>}
            />
          ) : (
            <DataTable
              rows={filteredRfqs}
              columns={rfqColumns}
              getRowKey={(rfq) => rfq.id}
              page={page}
              onPageChange={setPage}
              pageSize={PAGE_SIZE}
              emptyState={loading ? <div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">Loading...</div> : <div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">No RFQs found.</div>}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
