import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import * as ExcelJS from 'exceljs'
import { useModuleNavigate as useNavigate } from '@auction/hooks/useModuleRoute'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Input } from '@auction/components/ui/input'
import { DataTable, type DataTableColumn } from '@shared-ui/data-table'
import { formatDate } from '@auction/lib/date-utils'
import { formatCurrency } from '@auction/lib/currency-utils'
import { FileSpreadsheet, Upload, X } from 'lucide-react'
import type { RfqResponse, RfqResponseRow, RfqType } from '@auction/types'
import { fetchAllRfqResponses, uploadRfqResponse } from '@auction/lib/mock-services'
import { fetchRfqs } from '@auction/lib/mock-services'
import { readSessionTenantId } from '@auction/lib/auction-store'
import { listTenantVendors } from '@shared-utils'

const PAGE_SIZE = 15
const RFQ_TEMPLATE_HEADERS = ['originCity', 'destinationCity', 'vehicleType', 'price'] as const

// Parse an uploaded RFQ-response file (xlsx or csv) into rows + validation errors.
async function parseRfqFile(file: File): Promise<{ rows: RfqResponseRow[]; errors: string[] }> {
  const rows: RfqResponseRow[] = []
  const errors: string[] = []
  const pushRow = (cells: string[], rowNo: number) => {
    const originCity = (cells[0] ?? '').trim()
    const destinationCity = (cells[1] ?? '').trim()
    const vehicleType = (cells[2] ?? '').trim()
    const priceText = (cells[3] ?? '').trim()
    if (!originCity && !destinationCity && !vehicleType && !priceText) return
    const price = Number(priceText)
    if (!originCity) errors.push(`Row ${rowNo}: source city is missing.`)
    if (!destinationCity) errors.push(`Row ${rowNo}: destination city is missing.`)
    if (!vehicleType) errors.push(`Row ${rowNo}: vehicle type is missing.`)
    if (!priceText || !Number.isFinite(price) || price <= 0) errors.push(`Row ${rowNo}: price must be a positive number.`)
    rows.push({ originCity, destinationCity, vehicleType, price: Number.isFinite(price) ? price : 0 })
  }
  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = await file.text()
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const headerIsLabels = (lines[0] ?? '').toLowerCase().includes('origin')
    lines.slice(headerIsLabels ? 1 : 0).forEach((line, i) => pushRow(line.split(','), i + 1))
  } else {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await file.arrayBuffer())
    const ws = wb.worksheets[0]
    if (!ws) return { rows: [], errors: ['No sheets found in the file.'] }
    // Header column-order check.
    const headerCells = (ws.getRow(1).values as unknown[]).slice(1).map((v) => String(v ?? '').trim().toLowerCase())
    const expected = RFQ_TEMPLATE_HEADERS.map((h) => h.toLowerCase())
    if (expected.some((h, i) => headerCells[i] !== h)) {
      errors.push(`Column mismatch. Expected headers in order: ${RFQ_TEMPLATE_HEADERS.join(', ')}.`)
    }
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const values = (row.values as unknown[]).slice(1).map((v) => String(v ?? ''))
      pushRow(values, rowNumber - 1)
    })
  }
  if (rows.length === 0 && errors.length === 0) errors.push('No data rows found in the file.')
  return { rows, errors }
}

type FlatRow = {
  id: string
  originCity: string
  destinationCity: string
  vehicleType: string
  price: number
  avgPrice: number
  vendorName: string
  uploadedAt: string
}

export default function RfqResponsesPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [fileName, setFileName] = useState('')
  const [vendorName, setVendorName] = useState('')
  // Vendors onboarded in tenant-admin (cross-module) — the response is attributed
  // to one of them rather than free text.
  const tenantVendors = useMemo(() => listTenantVendors(readSessionTenantId()), [])
  const [rfqs, setRfqs] = useState<RfqType[]>([])
  const [selectedRfqId, setSelectedRfqId] = useState('')
  const [uploading, setUploading] = useState(false)
  // Parsed preview before commit.
  const [previewRows, setPreviewRows] = useState<RfqResponseRow[]>([])
  const [previewErrors, setPreviewErrors] = useState<string[]>([])
  const [parsing, setParsing] = useState(false)

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const [rfqResponses, setRfqResponses] = useState<RfqResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadResponses = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchAllRfqResponses({
      search: search || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
    })
      .then(setRfqResponses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo, search])

  useEffect(() => {
    loadResponses()
  }, [loadResponses])

  useEffect(() => {
    fetchRfqs()
      .then((data) => {
        setRfqs(data)
        setSelectedRfqId((current) => current || data[0]?.id || '')
      })
      .catch(() => setRfqs([]))
  }, [])

  const allRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = []
    rfqResponses.forEach((response: RfqResponse) => {
      // Show responses for the SELECTED RFQ only — never a mix across RFQs.
      if (selectedRfqId && response.rfqId !== selectedRfqId) return
      response.rows.forEach((row, idx) => {
        rows.push({
          id: `${response.id}-${idx}`,
          originCity: row.originCity,
          destinationCity: row.destinationCity,
          vehicleType: row.vehicleType,
          price: row.price,
          avgPrice: 0,
          vendorName: response.vendorName || '—',
          uploadedAt: response.uploadedAt,
        })
      })
    })
    return rows
  }, [rfqResponses, selectedRfqId])

  const avgPriceMap = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>()
    allRows.forEach((row) => {
      const key = `${row.originCity}||${row.destinationCity}||${row.vehicleType}`
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
      .map((row) => ({ ...row, avgPrice: avgPriceMap.get(`${row.originCity}||${row.destinationCity}||${row.vehicleType}`) ?? row.price }))
      .filter((row) => {
        const uploadedTime = new Date(row.uploadedAt).getTime()
        const matchesDate = uploadedTime >= from && uploadedTime <= to
        const matchesSearch =
          !query ||
          row.originCity.toLowerCase().includes(query) ||
          row.destinationCity.toLowerCase().includes(query) ||
          row.vendorName.toLowerCase().includes(query)
        return matchesDate && matchesSearch
      })
  }, [allRows, avgPriceMap, search, dateFrom, dateTo])

  const columns = useMemo<DataTableColumn<FlatRow>[]>(
    () => [
      {
        key: 'originCity',
        header: 'Source',
        render: (row) => <span className="font-medium text-[#0F172A]">{row.originCity}</span>,
      },
      {
        key: 'destinationCity',
        header: 'Destination',
        render: (row) => <span className="font-medium text-[#0F172A]">{row.destinationCity}</span>,
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
        key: 'uploadedAt',
        header: 'Uploaded',
        render: (row) => <span className="text-sm text-[#64748B]">{formatDate(row.uploadedAt)}</span>,
      },
    ],
    []
  )

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError(null)
    setParsing(true)
    try {
      const { rows, errors } = await parseRfqFile(file)
      setPreviewRows(rows)
      setPreviewErrors(errors)
    } catch (err) {
      setPreviewRows([])
      setPreviewErrors([err instanceof Error ? err.message : 'Could not read the file.'])
    } finally {
      setParsing(false)
    }
  }

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFileName('')
    setPreviewRows([])
    setPreviewErrors([])
    if (fileRef.current) fileRef.current.value = ''
  }

  const canSave = Boolean(selectedRfqId) && Boolean(vendorName) && previewRows.length > 0 && previewErrors.length === 0

  const handleUpload = async () => {
    if (!selectedRfqId) {
      setError('Select an RFQ before saving a response.')
      return
    }
    if (!canSave) return
    setUploading(true)
    try {
      const uploaded = await uploadRfqResponse(selectedRfqId, {
        fileName,
        vendorName: vendorName || undefined,
        rows: previewRows,
      })
      setRfqResponses((current) => [uploaded, ...current])
      setFileName('')
      setVendorName('')
      setPreviewRows([])
      setPreviewErrors([])
      if (fileRef.current) fileRef.current.value = ''
      setPage(1)
      setUploadOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save RFQ response.')
    } finally {
      setUploading(false)
    }
  }

  const hasFilters = search || dateFrom || dateTo

  return (
    <div className="space-y-6">
      <HeroCard
        eyebrow="Sourcing"
        title="RFQ Responses"
        subtitle="Upload vendor RFQ responses and analyse lane-wise pricing across all submitted quotes."
        icon={<FileSpreadsheet className="h-5 w-5 text-primary" />}
        onBack={() => navigate('/auction/sourcing')}
      />

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
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Upload RFQ Response
              </Button>
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search source, destination, or vendor"
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
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              Failed to load responses: {error}
            </div>
          )}
          <DataTable
            rows={filteredRows}
            columns={columns}
            getRowKey={(row) => row.id}
            page={page}
            onPageChange={setPage}
            pageSize={PAGE_SIZE}
            emptyState={
              <div className="rounded-xl border border-dashed border-[#CBD5E1] px-4 py-10 text-center text-sm text-[#64748B]">
                {loading ? 'Loading...' : 'No responses found. Upload an RFQ response Excel to get started.'}
              </div>
            }
          />
        </CardContent>
      </Card>

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setUploadOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-[#0F172A]">
                <Upload className="h-5 w-5 text-primary" /> Upload RFQ Response
              </h3>
              <button onClick={() => setUploadOpen(false)} className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">RFQ *</label>
                  <select
                    value={selectedRfqId}
                    onChange={(event) => setSelectedRfqId(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-primary"
                  >
                    {rfqs.length === 0 && <option value="">No RFQs available</option>}
                    {rfqs.map((rfq) => (
                      <option key={rfq.id} value={rfq.id}>{rfq.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Vendor *</label>
                  <select
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-primary"
                  >
                    <option value="">{tenantVendors.length === 0 ? 'No vendors onboarded' : 'Select vendor'}</option>
                    {tenantVendors.map((v) => (
                      <option key={v.id} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
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

              {/* Preview before save — confirm columns + data, surface any errors. */}
              {parsing && <p className="text-sm text-[#64748B]">Reading file…</p>}
              {previewErrors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-semibold">Fix these before saving:</p>
                  <ul className="mt-1 list-disc pl-5">
                    {previewErrors.slice(0, 8).map((err, i) => <li key={i}>{err}</li>)}
                    {previewErrors.length > 8 && <li>…and {previewErrors.length - 8} more.</li>}
                  </ul>
                </div>
              )}
              {previewRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                    Preview — {previewRows.length} row{previewRows.length === 1 ? '' : 's'}
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                    <table className="w-full text-sm">
                      <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                        <tr>
                          <th className="px-3 py-2">Source</th>
                          <th className="px-3 py-2">Destination</th>
                          <th className="px-3 py-2">Vehicle Type</th>
                          <th className="px-3 py-2 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {previewRows.map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">{row.originCity || <span className="text-red-500">missing</span>}</td>
                            <td className="px-3 py-2">{row.destinationCity || <span className="text-red-500">missing</span>}</td>
                            <td className="px-3 py-2">{row.vehicleType || <span className="text-red-500">missing</span>}</td>
                            <td className="px-3 py-2 text-right">{row.price > 0 ? formatCurrency(row.price) : <span className="text-red-500">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button disabled={!canSave || uploading} onClick={handleUpload}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? 'Saving...' : 'Save Response'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
