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
import { Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import type { RfqResponse, RfqResponseRow, RfqType } from '@auction/types'
import { fetchAllRfqResponses, uploadRfqResponse } from '@auction/lib/mock-services'
import { fetchRfqs } from '@auction/lib/mock-services'
import { readSessionTenantId } from '@auction/lib/auction-store'
import { isKnownTenantCity, listTenantCities } from '@shared-utils'

export const LOT_DRAFT_KEY = 'optimile.auction.lotDraftFromRfq'

const PAGE_SIZE = 15
const RFQ_TEMPLATE_HEADERS = ['originCity', 'destinationCity', 'vehicleType', 'price'] as const

// Build + download an RFQ-response Excel template (header row + one sample).
async function downloadRfqTemplate() {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('RFQ Response')
  ws.addRow([...RFQ_TEMPLATE_HEADERS])
  ws.addRow(['Mumbai', 'Delhi', '20 MT Open Body', 48000])
  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'Optimile_Auction_Vendor_RFQ_Template.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

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
  const [fileName, setFileName] = useState('')
  const [vendorName, setVendorName] = useState('')
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

  const canSave = Boolean(selectedRfqId) && previewRows.length > 0 && previewErrors.length === 0

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save RFQ response.')
    } finally {
      setUploading(false)
    }
  }

  const hasFilters = search || dateFrom || dateTo

  // Cities valid for an auction lane = those onboarded in a customer address or
  // rate card (listTenantCities already merges both pools).
  const tenantCities = useMemo(() => listTenantCities(readSessionTenantId()), [])

  // Build a LOT auction from the selected RFQ's responses (distinct lanes),
  // validate the cities, and jump to the auction-create page prefilled.
  const createLotFromRfq = () => {
    const seen = new Set<string>()
    const lanes = filteredRows.reduce<{ originCity: string; destinationCity: string; vehicleType: string; ceilingRate: number }[]>((acc, row) => {
      const key = `${row.originCity}||${row.destinationCity}||${row.vehicleType}`
      if (seen.has(key)) return acc
      seen.add(key)
      acc.push({ originCity: row.originCity, destinationCity: row.destinationCity, vehicleType: row.vehicleType, ceilingRate: row.avgPrice || row.price })
      return acc
    }, [])
    if (lanes.length === 0) {
      setError('No responses available to build a LOT auction from this RFQ.')
      return
    }
    const missing = new Set<string>()
    lanes.forEach((lane) => {
      if (!isKnownTenantCity(lane.originCity, tenantCities)) missing.add(lane.originCity)
      if (!isKnownTenantCity(lane.destinationCity, tenantCities)) missing.add(lane.destinationCity)
    })
    if (missing.size > 0) {
      setError(`Cannot create the auction — these cities are not onboarded in any customer address or rate card: ${[...missing].join(', ')}. Add them in Administration first.`)
      return
    }
    setError(null)
    sessionStorage.setItem(LOT_DRAFT_KEY, JSON.stringify(lanes))
    navigate('/auction/auctions/create/lot')
  }

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
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4 text-primary" />
              Upload Response
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => { void downloadRfqTemplate() }}>
              <Download className="mr-2 h-4 w-4" /> Download Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="space-y-1.5 lg:w-64">
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

            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Excel / CSV File</label>
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

            <Button disabled={!canSave || uploading} onClick={handleUpload} className="shrink-0">
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Saving...' : 'Save Response'}
            </Button>
          </div>

          {/* Preview before save — confirm columns + data, surface any errors. */}
          {parsing && <p className="mt-4 text-sm text-[#64748B]">Reading file…</p>}
          {previewErrors.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-semibold">Fix these before saving:</p>
              <ul className="mt-1 list-disc pl-5">
                {previewErrors.slice(0, 8).map((err, i) => <li key={i}>{err}</li>)}
                {previewErrors.length > 8 && <li>…and {previewErrors.length - 8} more.</li>}
              </ul>
            </div>
          )}
          {previewRows.length > 0 && (
            <div className="mt-4 space-y-2">
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
              {filteredRows.length > 0 && (
                <Button size="sm" onClick={createLotFromRfq} className="ml-2">
                  Create LOT Auction
                </Button>
              )}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
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
    </div>
  )
}
