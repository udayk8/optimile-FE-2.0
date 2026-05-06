import { useParams, useNavigate } from 'react-router-dom'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { useAppStore } from '@auction/stores/app.store'
import { Badge } from '@auction/components/ui/badge'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'
import type { VendorResponseStatus, SourcingVendorTracking } from '@auction/types'
import { useMemo, useState } from 'react'

export default function RfiDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { rfis, updateSourcingVendorStatus } = useAppStore()

  const rfi = rfis.find((r) => r.id === id)

  if (!rfi) {
    return (
      <div className="p-8 text-center text-[#64748B]">
        RFI not found.
        <br />
        <Button variant="outline" className="mt-4" onClick={() => navigate('/auction/sourcing?tab=RFI')}>Back to Client Hub</Button>
      </div>
    )
  }

  const handleStatusChange = (vendorIdOrEmail: string, newStatus: VendorResponseStatus) => {
    updateSourcingVendorStatus('RFI', rfi.id, vendorIdOrEmail, newStatus)
  }

  const [page, setPage] = useState(1)

  const columns = useMemo<DataTableColumn<SourcingVendorTracking>[]>(
    () => [
      { key: 'contact', header: 'Contact Email', render: (vt) => <span className="font-medium text-[#0F172A]">{vt.vendorIdOrEmail}</span> },
      {
        key: 'status',
        header: 'Status',
        render: (vt) => (
          <Badge variant={vt.status === 'RESPONDED' ? 'success' : vt.status === 'DECLINED' ? 'destructive' : 'secondary'}>
            {vt.status}
          </Badge>
        ),
      },
      {
        key: 'action',
        header: 'Update Status',
        align: 'right',
        render: (vt) => (
          <div className="flex justify-end">
            <select
              value={vt.status}
              onChange={(e) => handleStatusChange(vt.vendorIdOrEmail, e.target.value as VendorResponseStatus)}
              className="h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-xs text-[#0F172A] outline-none"
            >
              <option value="PENDING">Pending</option>
              <option value="RESPONDED">Responded</option>
              <option value="DECLINED">Declined</option>
            </select>
          </div>
        ),
      },
    ],
    []
  )

  return (
    <div>
      <HeroCard
        eyebrow="RFI Campaign"
        title={rfi.title}
        subtitle="Manage this Request for Information and track offline vendor responses."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                rows={rfi.vendorTracking}
                columns={columns}
                getRowKey={(vt) => vt.vendorIdOrEmail}
                page={page}
                onPageChange={setPage}
                pageSize={10}
                emptyState={<div className="p-4 text-center text-sm text-[#64748B]">No vendors tracked yet.</div>}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[#475569]">
            <div className="rounded-xl border border-[#E5E7EB] p-4">
              <p><span className="font-medium text-[#0F172A]">ID:</span> {rfi.id}</p>
              <p className="mt-2"><span className="font-medium text-[#0F172A]">Status:</span> {rfi.status}</p>
              <p className="mt-2"><span className="font-medium text-[#0F172A]">Deadline:</span> {new Date(rfi.deadline).toLocaleDateString()}</p>
              <p className="mt-2"><span className="font-medium text-[#0F172A]">Template:</span> {rfi.templateFileName || 'None'}</p>
              <p className="mt-2"><span className="font-medium text-[#0F172A]">Created By:</span> {rfi.createdBy}</p>
            </div>
            
            <div className="rounded-xl border border-[#E5E7EB] p-4">
              <span className="mb-1 block font-medium text-[#0F172A]">Description</span>
              <p>{rfi.description}</p>
            </div>

            {rfi.messageToVendor && (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <span className="mb-1 block font-medium text-[#0F172A]">Message Sent</span>
                <p className="whitespace-pre-wrap italic">{rfi.messageToVendor}</p>
              </div>
            )}
            
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
