import { useState, useMemo, useRef } from 'react'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Input } from '@auction/components/ui/input'
import { useAppStore } from '@auction/stores/app.store'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'
import { formatDate } from '@auction/lib/date-utils'
import { formatCurrency } from '@auction/lib/currency-utils'
import { FileSpreadsheet, Upload, X } from 'lucide-react'
import type { RfqResponse } from '@auction/types'

const PAGE_SIZE = 15

type FlatRow = {
  id: string
  lane: string
  vehicleType: string
  price: number
  avgPrice: number
  vendorName: string
  rfqId: string
  uploadedAt: string
}

export default function RfqResponsesPage() {
  const { rfqResponses, rfqs, addRfqResponse } = useAppStore()

  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [selectedRfqId, setSelectedRfqId] = useState('')
  const [uploading, setUploading] = useState(false)

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const allRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = []
    rfqResponses.forEach((response: RfqResponse) => {
      response.rows.forEach((row, idx) => {
        rows.push({
          id: `${response.id}-${idx}`,
          lane: row.lane,
          vehicleType: row.vehicleType,
          price: row.price,
          avgPrice: 0,
          vendorName: response.vendorName || '—',
          rfqId: response.rfqId || '—',
          uploadedAt: response.uploadedAt,
        })
      })
    })
    return rows
  }, [rfqResponses])

  const avgPriceMap = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>()
    allRows.forEach((row) => {
      const key = `${row.lane}||${row.vehicleType}`
      const existing = map.get(key) || { sum: 0, count: 0 }
      map.set(key, { sum: existing.sum + row.price, count: existing.count + 1 })
    })
    const result = new Map<string, number>()
    map.forEach((value, key) => result.set(key, Math.round(value.sum / value.count)))
    return result
  }, [allRows])

  const filteredRows = useMemo<FlatRow[]>(() => {
    const query = search.trim().toLowerCase()
    const from = dateFrom ? new Date(dateFrom).getTime() : 0
    const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity
    return allRows
      .map((row) => ({ ...row, avgPrice: avgPriceMap.get(`${row.lane}||${row.vehicleType}`) ?? row.price }))
      .filter((row) => {
        const uploadedTime = new Date(row.uploadedAt).getTime()
        const matchesDate = uploadedTime >= from && uploadedTime <= to
        const matchesSearch = !query || row.lane.toLowerCase().includes(query) || row.vendorName.toLowerCase().includes(query)
        return matchesDate && matchesSearch
      })
  }, [allRows, avgPriceMap, search, dateFrom, dateTo])

  const columns = useMemo<DataTableColumn<FlatRow>[]>(
    () => [
      {
        key: 'lane',
        header: 'Lane',
        render: (row) => <span className="font-medium text-[#0F172A]">{row.lane}</span>,
      },
      {
        key: 'vehicleType',
        header: 'Vehicle Type',
        render: (row) => <span className="text-sm text-[#475569]">{row.vehicleType}</span>,
      },
      {
        key: 'price',
        header: 'Quoted Price',
        align: 'right',
        render: (row) => <span className="font-semibold text-[#0F172A]">{formatCurrency(row.price)}</span>,
      },
      {
        key: 'avgPrice',
        header: 'Lane Avg',
        align: 'right',
        render: (row) => <span className="text-sm text-[#64748B]">{formatCurrency(row.avgPrice)}</span>,
      },
      {
        key: 'vendorName',
        header: 'Vendor',
        render: (row) => <span className="text-sm text-[#0F172A]">{row.vendorName}</span>,
      },
      {
        key: 'rfqId',
        header: 'RFQ',
        render: (row) => <span className="text-sm text-[#64748B]">{row.rfqId}</span>,
      },
      {
        key: 'uploadedAt',
        header: 'Uploaded',
        render: (row) => <span className="text-sm text-[#64748B]">{formatDate(row.uploadedAt)}</span>,
      },
    ],
    []
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setFileName(file.name)
  }

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFileName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleUpload = () => {
    if (!fileName) return
    setUploading(true)
    setTimeout(() => {
      addRfqResponse({
        fileName,
        vendorName: vendorName.trim() || undefined,
        rfqId: selectedRfqId || undefined,
        rows: [
          { lane: 'Mumbai → Pune', vehicleType: '20ft Container', price: Math.round(8000 + Math.random() * 2000) },
          { lane: 'Mumbai → Nashik', vehicleType: '20ft Container', price: Math.round(11000 + Math.random() * 2000) },
          { lane: 'Delhi → Jaipur', vehicleType: '20ft Container', price: Math.round(8500 + Math.random() * 2000) },
        ],
      })
      setFileName('')
      setVendorName('')
      setSelectedRfqId('')
      if (fileRef.current) fileRef.current.value = ''
      setUploading(false)
      setPage(1)
    }, 700)
  }

  const hasFilters = search || dateFrom || dateTo

  return (
    <div className="space-y-6">
      <HeroCard
        eyebrow="Sourcing"
        title="RFQ Responses"
        subtitle="Upload vendor RFQ responses and analyse lane-wise pricing across all submitted quotes."
        icon={<FileSpreadsheet className="h-5 w-5 text-primary" />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4 text-primary" />
            Upload Response
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Excel / CSV File *</label>
              <div
                className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 transition-colors hover:border-primary"
                onClick={() => fileRef.current?.click()}
              >
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-[#94A3B8]" />
                <span className="truncate text-sm text-[#64748B]">
                  {fileName || 'Click to select file (.xlsx, .xls, .csv)'}
                </span>
                {fileName && (
                  <button onClick={clearFile} className="ml-auto shrink-0 text-[#94A3B8] hover:text-[#475569]">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
            </div>

            <div className="space-y-1.5 lg:w-52">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Vendor Name (optional)</label>
              <Input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Fast Logistics"
              />
            </div>

            <div className="space-y-1.5 lg:w-56">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">RFQ Reference (optional)</label>
              <select
                value={selectedRfqId}
                onChange={(e) => setSelectedRfqId(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-primary"
              >
                <option value="">— None —</option>
                {rfqs.map((rfq) => (
                  <option key={rfq.id} value={rfq.id}>
                    {rfq.id} – {rfq.title}
                  </option>
                ))}
              </select>
            </div>

            <Button disabled={!fileName || uploading} onClick={handleUpload} className="shrink-0">
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2">
              Quote Responses
              {filteredRows.length > 0 && (
                <span className="text-sm font-normal text-[#64748B]">({filteredRows.length} rows)</span>
              )}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search lane or vendor"
                className="w-full sm:w-[200px]"
              />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-primary"
              />
              <span className="text-xs text-[#94A3B8]">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-primary"
              />
              {hasFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(1) }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={filteredRows}
            columns={columns}
            getRowKey={(row) => row.id}
            page={page}
            onPageChange={setPage}
            pageSize={PAGE_SIZE}
            emptyState={
              <div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">
                No responses found. Upload an RFQ response Excel to get started.
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
