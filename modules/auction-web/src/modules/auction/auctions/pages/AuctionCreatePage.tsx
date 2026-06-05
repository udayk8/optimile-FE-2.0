import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as ExcelJS from 'exceljs'
import { toast } from 'sonner'
import { CheckCircle2, FileSpreadsheet, Minus, TrendingDown, TrendingUp, Upload } from 'lucide-react'
import { PageHero } from '@shared-ui/page-hero'
import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import { Field, Select } from '@shared-ui/form-field'
import { Input } from '@shared-ui/input'
import { useAppStore } from '@admin/stores/app.store'
import { useAuthStore } from '@admin/stores/auth.store'
import type { AuctionType } from '@admin/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DraftLane = {
  lane: string
  vehicleType: string
  capacityMt: string
  rateUnit: 'PER_TRIP' | 'PER_MT' | 'PER_KM'
  ceilingRate: string
  estimatedTrips: string
  allocationMode: 'SINGLE' | 'SPLIT'
  r1: string
  r2: string
  r3: string
}

type AuctionSettingsState = {
  minBidDecrement: string
  extensionTriggerMinutes: string
  extensionDurationMinutes: string
  maxExtensions: string
  biddingWindowMinutes: string
  contractStartDate: string
  contractEndDate: string
}

type LaneImportMode = 'MANUAL' | 'EXCEL'

type ActiveMode = AuctionType | 'RFQ'

type RfqLaneRow = {
  id: string
  lane: string
  vehicleType: string
  capacityMt: string
  estimatedTrips: string
  targetPrice: string
}

type RfqResponse = {
  lane: string
  vendorName: string
  quotedPrice: number
}

type LaneSummary = {
  lane: RfqLaneRow
  responses: RfqResponse[]
  avgPrice: number
  minPrice: number
  gapToTarget: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VEHICLE_TYPE_OPTIONS = [
  '20 MT Open Body',
  '32 FT Closed Body',
  '32 FT Open Body',
  '20 FT Container',
  'LCV',
] as const

const VEHICLE_CAPACITY: Record<(typeof VEHICLE_TYPE_OPTIONS)[number], string> = {
  '20 MT Open Body': '20',
  '32 FT Closed Body': '32',
  '32 FT Open Body': '32',
  '20 FT Container': '20',
  LCV: '8',
}

const LANE_OPTIONS = [
  'Mumbai → Delhi',
  'Mumbai → Bengaluru',
  'Bengaluru → Chennai',
  'Chennai → Mumbai',
  'Delhi → Lucknow',
  'Pune → Jaipur',
  'Ahmedabad → Surat',
] as const

const REGION_OPTIONS = ['North India', 'South India', 'West India', 'East India', 'Central India'] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function makeAuctionSettings(type: AuctionType): AuctionSettingsState {
  const defaultStartDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const defaultEndDate = new Date(Date.now() + 190 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return {
    minBidDecrement: '200',
    extensionTriggerMinutes: '5',
    extensionDurationMinutes: '5',
    maxExtensions: '3',
    biddingWindowMinutes: type === 'SPOT' ? '20' : type === 'BULK' ? '60' : String(24 * 60),
    contractStartDate: defaultStartDate,
    contractEndDate: defaultEndDate,
  }
}

function makeDefaultLane(type: AuctionType, laneName?: string): DraftLane {
  const lane = laneName ?? (type === 'SPOT' ? 'Mumbai → Delhi' : 'Mumbai → Bengaluru')
  return {
    lane,
    vehicleType: '20 MT Open Body',
    capacityMt: '20',
    rateUnit: 'PER_TRIP',
    ceilingRate: type === 'SPOT' ? '52000' : '10000',
    estimatedTrips: type === 'SPOT' ? '1' : '300',
    allocationMode: type === 'LOT' ? 'SPLIT' : 'SINGLE',
    r1: type === 'LOT' ? '60' : '100',
    r2: type === 'LOT' ? '30' : '0',
    r3: type === 'LOT' ? '10' : '0',
  }
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function parseLaneMode(value: unknown): DraftLane['allocationMode'] {
  return normalizeText(value).toUpperCase() === 'SINGLE' ? 'SINGLE' : 'SPLIT'
}

function parseRateUnit(value: unknown): DraftLane['rateUnit'] {
  const normalized = normalizeText(value).toUpperCase()
  if (normalized === 'PER_MT') return 'PER_MT'
  if (normalized === 'PER_KM') return 'PER_KM'
  return 'PER_TRIP'
}

function laneTemplateHeaders() {
  return ['lane', 'vehicleType', 'capacityMt', 'rateUnit', 'ceilingRate', 'estimatedTrips', 'allocationMode', 'r1', 'r2', 'r3']
}

function formatIndianCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

/** Lane = source/destination cities; display joins them with an arrow. */
function bookingLaneLabel(booking: { originCity: string; destinationCity: string }) {
  return `${booking.originCity} → ${booking.destinationCity}`
}

/** "Mumbai → Delhi" → ["Mumbai", "Delhi"] (draft lanes keep the display string locally). */
function splitDraftLane(lane: string): [string, string] {
  const [origin = '', destination = ''] = lane.split('→').map((part) => part.trim())
  return [origin, destination]
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Feature 1: compact read-only preview table for Excel-imported lanes */
function ImportedLanesPreviewTable({
  lanes,
  importFileName,
  onEditManually,
}: {
  lanes: DraftLane[]
  importFileName: string
  onEditManually: () => void
}) {
  return (
    <div className="space-y-3">
      {/* Chip */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          {lanes.length} lane{lanes.length !== 1 ? 's' : ''} imported from {importFileName}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={onEditManually}>
          Edit manually
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              {['#', 'Lane', 'Vehicle Type', 'Capacity (MT)', 'Rate Unit', 'Ceiling Rate', 'Est. Trips', 'Allocation', 'R1%', 'R2%', 'R3%'].map(
                (col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lanes.map((lane, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 font-mono text-xs text-gray-400">{index + 1}</td>
                <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{lane.lane}</td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{lane.vehicleType}</td>
                <td className="px-3 py-2 font-mono text-gray-700">{lane.capacityMt}</td>
                <td className="px-3 py-2 text-gray-600">{lane.rateUnit}</td>
                <td className="px-3 py-2 font-mono text-gray-700">{lane.ceilingRate}</td>
                <td className="px-3 py-2 font-mono text-gray-700">{lane.estimatedTrips}</td>
                <td className="px-3 py-2 text-gray-600">{lane.allocationMode}</td>
                <td className="px-3 py-2 font-mono text-gray-700">{lane.r1}</td>
                <td className="px-3 py-2 font-mono text-gray-700">{lane.r2}</td>
                <td className="px-3 py-2 font-mono text-gray-700">{lane.r3}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Feature 2: full RFQ UI */
function RfqPanel() {
  const [rfqLanes, setRfqLanes] = useState<RfqLaneRow[]>([])
  const [rfqResponses, setRfqResponses] = useState<RfqResponse[]>([])
  const [rfqLanesFileName, setRfqLanesFileName] = useState('')
  const [rfqResponsesFileName, setRfqResponsesFileName] = useState('')

  // ---- parsers ----

  const handleRfqLanesImport = async (file: File) => {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const worksheet = workbook.worksheets[0]
      if (!worksheet) throw new Error('No sheets found in workbook.')

      const rows: RfqLaneRow[] = []
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        const values = row.values as unknown[]
        const lane = normalizeText(values[1])
        if (!lane) return
        rows.push({
          id: `rfq-lane-${rowNumber}`,
          lane,
          vehicleType: normalizeText(values[2]) || '20 MT Open Body',
          capacityMt: normalizeText(values[3]) || '20',
          estimatedTrips: normalizeText(values[4]) || '1',
          targetPrice: normalizeText(values[5]) || '0',
        })
      })

      if (!rows.length) throw new Error('No data rows found. Required columns: lane, vehicleType, capacityMt, estimatedTrips, targetPrice.')
      setRfqLanes(rows)
      setRfqLanesFileName(file.name)
      toast.success(`Loaded ${rows.length} RFQ lanes from Excel.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not parse RFQ lanes file.')
    }
  }

  const handleRfqResponsesImport = async (file: File) => {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const worksheet = workbook.worksheets[0]
      if (!worksheet) throw new Error('No sheets found in workbook.')

      const rows: RfqResponse[] = []
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        const values = row.values as unknown[]
        const lane = normalizeText(values[1])
        if (!lane) return
        rows.push({
          lane,
          vendorName: normalizeText(values[2]) || 'Unknown Vendor',
          quotedPrice: Number(normalizeText(values[3])) || 0,
        })
      })

      if (!rows.length) throw new Error('No data rows found. Required columns: lane, vendorName, quotedPrice.')
      setRfqResponses(rows)
      setRfqResponsesFileName(file.name)
      toast.success(`Loaded ${rows.length} vendor responses from Excel.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not parse RFQ responses file.')
    }
  }

  // ---- derived data ----

  const laneSummaries: LaneSummary[] = useMemo(() => {
    return rfqLanes.map((rfqLane) => {
      const responses = rfqResponses.filter((r) => r.lane === rfqLane.lane)
      const prices = responses.map((r) => r.quotedPrice)
      const avgPrice = prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0
      const gapToTarget = avgPrice - Number(rfqLane.targetPrice)
      return { lane: rfqLane, responses, avgPrice, minPrice, gapToTarget }
    })
  }, [rfqLanes, rfqResponses])

  const uniqueVendors = useMemo(() => {
    const names = new Set(rfqResponses.map((r) => r.vendorName))
    return Array.from(names).sort()
  }, [rfqResponses])

  const lanesbelowTarget = laneSummaries.filter((s) => s.responses.length > 0 && s.gapToTarget < 0).length

  // ---- vendor quote colour helper ----
  function quoteColor(quoted: number, target: number): string {
    if (quoted <= target) return 'text-green-700 bg-green-50'
    if (quoted <= target * 1.1) return 'text-amber-700 bg-amber-50'
    return 'text-red-700 bg-red-50'
  }

  return (
    <div className="space-y-6">
      {/* Step cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card 1 — Upload RFQ Lanes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Upload RFQ Lanes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500">Upload lane requirements with target prices.</p>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors">
              <Upload className="h-4 w-4 shrink-0" />
              <span>{rfqLanes.length > 0 ? 'Replace file…' : 'Choose .xlsx / .xls file'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleRfqLanesImport(file)
                }}
              />
            </label>
            {rfqLanes.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                {rfqLanes.length} lanes loaded · {rfqLanesFileName}
              </span>
            )}
            <p className="text-xs text-gray-400">
              Required columns:{' '}
              <span className="font-mono">lane, vehicleType, capacityMt, estimatedTrips, targetPrice</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2 — Upload Vendor Responses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Upload Vendor Responses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500">Upload vendor-submitted quotes for each lane.</p>
            <label
              className={`flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm transition-colors ${
                rfqLanes.length === 0
                  ? 'cursor-not-allowed border-gray-200 text-gray-300'
                  : 'cursor-pointer border-gray-300 text-gray-600 hover:border-primary hover:text-primary'
              }`}
              title={rfqLanes.length === 0 ? 'Upload RFQ lanes first before adding responses.' : undefined}
            >
              <Upload className="h-4 w-4 shrink-0" />
              <span>{rfqResponses.length > 0 ? 'Replace file…' : 'Choose .xlsx / .xls file'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="sr-only"
                disabled={rfqLanes.length === 0}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleRfqResponsesImport(file)
                }}
              />
            </label>
            {rfqResponses.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                {rfqResponses.length} responses loaded · {rfqResponsesFileName}
              </span>
            )}
            <p className="text-xs text-gray-400">
              Required columns: <span className="font-mono">lane, vendorName, quotedPrice</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Results section */}
      {rfqLanes.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">RFQ Response Summary</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Avg, min, and gap-to-target per lane across all vendor responses.
            </p>
          </div>

          {/* Summary stats bar */}
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm">
              <span className="font-bold text-gray-900">{rfqLanes.length}</span> total lanes
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
              <span className="font-bold text-blue-900">{uniqueVendors.length}</span> vendors responded
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
              <TrendingDown className="h-3.5 w-3.5" />
              <span className="font-bold text-green-900">{lanesbelowTarget}</span> lanes below target
            </div>
          </div>

          {/* No responses yet — placeholder table */}
          {rfqResponses.length === 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    {['Lane', 'Vehicle', 'Cap.', 'Trips', 'Target ₹', 'Avg Quote', 'Lowest', 'Gap'].map((col) => (
                      <th
                        key={col}
                        className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rfqLanes.map((lane) => (
                    <tr key={lane.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{lane.lane}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {lane.vehicleType}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{lane.capacityMt} MT</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">{lane.estimatedTrips}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">₹{formatIndianCurrency(Number(lane.targetPrice))}</td>
                      <td className="px-3 py-2.5 text-gray-400 text-xs italic" colSpan={3}>
                        No vendor responses yet. Upload responses to see quotes.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Full table with vendor columns */
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Lane</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Vehicle</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Cap.</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Trips</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Target ₹</th>
                    {uniqueVendors.map((vendor) => (
                      <th
                        key={vendor}
                        className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-blue-700 bg-blue-50"
                      >
                        {vendor}
                      </th>
                    ))}
                    <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Avg Quote</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Lowest</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {laneSummaries.map((summary) => {
                    const targetNum = Number(summary.lane.targetPrice)
                    const lowestVendor = summary.responses.find((r) => r.quotedPrice === summary.minPrice)?.vendorName ?? ''

                    return (
                      <tr key={summary.lane.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{summary.lane.lane}</td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {summary.lane.vehicleType}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-gray-700">{summary.lane.capacityMt} MT</td>
                        <td className="px-3 py-2.5 font-mono text-gray-700">{summary.lane.estimatedTrips}</td>
                        <td className="px-3 py-2.5 font-mono text-gray-700">₹{formatIndianCurrency(targetNum)}</td>
                        {uniqueVendors.map((vendor) => {
                          const response = summary.responses.find((r) => r.vendorName === vendor)
                          return (
                            <td key={vendor} className="px-3 py-2.5 bg-blue-50/30">
                              {response ? (
                                <span
                                  className={`rounded-md px-2 py-0.5 font-mono text-xs font-medium ${quoteColor(response.quotedPrice, targetNum)}`}
                                >
                                  ₹{formatIndianCurrency(response.quotedPrice)}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-3 py-2.5 font-mono font-bold text-gray-800">
                          {summary.avgPrice > 0 ? `₹${formatIndianCurrency(summary.avgPrice)}` : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          {summary.minPrice > 0 ? (
                            <div>
                              <p className="font-mono text-xs font-medium text-gray-800">₹{formatIndianCurrency(summary.minPrice)}</p>
                              {lowestVendor && (
                                <p className="text-xs text-gray-400 truncate max-w-[8rem]" title={lowestVendor}>
                                  {lowestVendor}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {summary.responses.length > 0 ? (
                            <span
                              className={`inline-flex items-center gap-1 font-mono text-xs font-semibold ${
                                summary.gapToTarget < 0 ? 'text-green-700' : 'text-red-600'
                              }`}
                            >
                              {summary.gapToTarget < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : summary.gapToTarget > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                              {summary.gapToTarget >= 0 ? '+' : ''}₹{formatIndianCurrency(Math.abs(summary.gapToTarget))}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend for vendor column colours */}
          {rfqResponses.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="font-medium">Quote colour key:</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400" /> At or below target
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Up to 10% above target
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400" /> More than 10% above target
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AuctionCreatePage() {
  const { type } = useParams()
  const navigate = useNavigate()
  const auctionType = ((type?.toUpperCase() ?? '') || '') as AuctionType
  const effectiveType: AuctionType | '' = ['SPOT', 'BULK', 'LOT'].includes(auctionType) ? auctionType : ''
  const { createAuction, bookings, vendors } = useAppStore()
  const { user } = useAuthStore()

  const selectedBooking = bookings[0] ?? {
    id: 'BK-DEMO-0001',
    originCity: 'Mumbai',
    destinationCity: 'Delhi',
    vehicleType: '20 MT Open Body',
    commodity: 'FMCG',
    quantity: 18,
    uom: 'Metric Tonnes',
    loadingDate: new Date().toISOString().slice(0, 10),
    status: 'PENDING_AUCTION' as const,
  }

  const [selectedBookingId, setSelectedBookingId] = useState(selectedBooking.id)
  const [title, setTitle] = useState(`Spot | ${selectedBooking.id} | ${bookingLaneLabel(selectedBooking)}`)
  const [auctionRegion, setAuctionRegion] = useState('North India')
  const [lanes, setLanes] = useState<DraftLane[]>([makeDefaultLane('SPOT', bookingLaneLabel(selectedBooking))])
  const [auctionSettings, setAuctionSettings] = useState<AuctionSettingsState>(makeAuctionSettings('SPOT'))
  const [laneImportMode, setLaneImportMode] = useState<LaneImportMode>('MANUAL')
  const [importFileName, setImportFileName] = useState('')

  // Active mode: SPOT | BULK | LOT | RFQ — local UI state; RFQ is independent of URL params
  const [activeMode, setActiveMode] = useState<ActiveMode>(() => (effectiveType || 'SPOT') as ActiveMode)

  const activeBooking = bookings.find((item) => item.id === selectedBookingId) ?? selectedBooking
  const lotLaneOptions = LANE_OPTIONS.filter((lane) => {
    if (auctionRegion === 'North India') return lane === 'Mumbai → Delhi' || lane === 'Delhi → Lucknow'
    if (auctionRegion === 'South India')
      return lane === 'Mumbai → Bengaluru' || lane === 'Bengaluru → Chennai' || lane === 'Chennai → Mumbai'
    if (auctionRegion === 'West India') return lane === 'Pune → Jaipur' || lane === 'Ahmedabad → Surat'
    return true
  })

  useEffect(() => {
    if (!effectiveType) return
    const defaultBooking = bookings[0] ?? selectedBooking
    const defaultLane = effectiveType === 'LOT' ? 'Mumbai → Bengaluru' : 'Mumbai → Delhi'
    setTitle(
      effectiveType === 'SPOT'
        ? `Spot | ${defaultBooking.id} | ${bookingLaneLabel(defaultBooking)}`
        : `${titleCase(effectiveType)} | Demo Procurement Event`
    )
    setSelectedBookingId(defaultBooking.id)
    setAuctionRegion(effectiveType === 'LOT' ? 'North India' : 'South India')
    setLanes([makeDefaultLane(effectiveType, defaultLane)])
    setAuctionSettings(makeAuctionSettings(effectiveType))
    setLaneImportMode('MANUAL')
    setImportFileName('')
    setActiveMode(effectiveType)
  }, [effectiveType, bookings, selectedBooking.id, selectedBooking.originCity, selectedBooking.destinationCity])

  const addLane = () => {
    if (!effectiveType || effectiveType === 'SPOT' || effectiveType === 'BULK') return
    setLanes((current) => [...current, makeDefaultLane(effectiveType, lotLaneOptions[0] ?? 'Mumbai → Bengaluru')])
  }

  const handleLaneFileImport = async (file: File) => {
    if (!effectiveType || effectiveType === 'SPOT' || effectiveType === 'BULK') return

    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const worksheet = workbook.worksheets[0]

      if (!worksheet) {
        throw new Error('The workbook does not contain any sheets.')
      }

      const importedLanes: DraftLane[] = []
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return

        const values = row.values as unknown[]
        const lane = normalizeText(values[1])
        if (!lane) return

        importedLanes.push({
          lane,
          vehicleType: normalizeText(values[2]) || '20 MT Open Body',
          capacityMt: normalizeText(values[3]) || '20',
          rateUnit: parseRateUnit(values[4]),
          ceilingRate: normalizeText(values[5]) || '0',
          estimatedTrips: normalizeText(values[6]) || (effectiveType === 'LOT' ? '1' : '300'),
          allocationMode: parseLaneMode(values[7]),
          r1: normalizeText(values[8]) || '0',
          r2: normalizeText(values[9]) || '0',
          r3: normalizeText(values[10]) || '0',
        })
      })

      if (!importedLanes.length) {
        throw new Error(`Add at least one lane row using the template: ${laneTemplateHeaders().join(', ')}`)
      }

      setLanes(importedLanes)
      setImportFileName(file.name)
      toast.success(`Imported ${importedLanes.length} lanes from Excel.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not import lanes from the selected file.'
      toast.error(message)
    }
  }

  const updateLane = (index: number, field: keyof DraftLane, value: string) => {
    setLanes((current) =>
      current.map((lane, laneIndex) =>
        laneIndex !== index
          ? lane
          : {
              ...lane,
              [field]: value,
              ...(field === 'vehicleType' && value in VEHICLE_CAPACITY
                ? { capacityMt: VEHICLE_CAPACITY[value as (typeof VEHICLE_TYPE_OPTIONS)[number]] }
                : {}),
            }
      )
    )
  }

  const handleCreate = (launchNow: boolean) => {
    if (!effectiveType) {
      toast.error('Select an auction type first.')
      return
    }

    const newAuctionId = createAuction({
      type: effectiveType,
      title,
      bookingId: effectiveType === 'SPOT' ? activeBooking.id : undefined,
      region: effectiveType === 'LOT' ? auctionRegion : undefined,
      minBidDecrement: Number(auctionSettings.minBidDecrement),
      extensionTriggerMinutes: Number(auctionSettings.extensionTriggerMinutes),
      extensionDurationMinutes: Number(auctionSettings.extensionDurationMinutes),
      maxExtensions: Number(auctionSettings.maxExtensions),
      biddingWindowMinutes: Number(auctionSettings.biddingWindowMinutes),
      contractStartDate: effectiveType === 'SPOT' ? undefined : auctionSettings.contractStartDate || undefined,
      contractEndDate: effectiveType === 'SPOT' ? undefined : auctionSettings.contractEndDate || undefined,
      invitedVendorIds: vendors.map((item) => item.id),
      createdBy: user?.name ?? 'Demo User',
      createdByRole: user?.role ?? 'OPS',
      launchNow,
      lanes: lanes.map((lane) => {
        const [originCity, destinationCity] = splitDraftLane(lane.lane)
        return {
        originCity,
        destinationCity,
        region: effectiveType === 'LOT' ? auctionRegion : undefined,
        vehicleType: lane.vehicleType,
        capacityMt: Number(lane.capacityMt),
        rateUnit: lane.rateUnit,
        ceilingRate: Number(lane.ceilingRate),
        estimatedTrips: effectiveType === 'LOT' ? Number(lane.estimatedTrips) : undefined,
        basePriceSource: 'MANUAL' as const,
        allocationMode: lane.allocationMode,
        allocation: {
          l1: Number(lane.r1),
          l2: Number(lane.r2),
          l3: Number(lane.r3),
        },
        eligibleVendorIds: vendors.map((item) => item.id),
        }
      }),
    })

    toast.success(launchNow ? 'Auction created and launched.' : 'Auction draft created.')
    navigate(`/auction/auctions/${newAuctionId}`)
  }

  const isRfqMode = activeMode === 'RFQ'

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Auction Control"
        title={
          isRfqMode
            ? 'RFQ Analysis'
            : effectiveType
            ? `Create ${titleCase(effectiveType)} Auction`
            : 'Create Auction'
        }
        subtitle={
          isRfqMode
            ? 'Upload lane requirements and vendor responses to compare quotes against target prices.'
            : 'Single entry point. Select the auction type, configure lanes, rate units, ceilings, and launch when ready.'
        }
      />

      {/* ------------------------------------------------------------------ */}
      {/* Mode selector — SPOT | BULK | LOT | RFQ                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap gap-2">
        {(['SPOT', 'BULK', 'LOT'] as AuctionType[]).map((item) => (
          <Button
            key={item}
            type="button"
            variant={activeMode === item ? 'default' : 'outline'}
            onClick={() => {
              setActiveMode(item)
              navigate(`/auction/auctions/new/${item.toLowerCase()}`)
            }}
          >
            {item}
          </Button>
        ))}
        <Button
          type="button"
          variant={isRfqMode ? 'default' : 'outline'}
          onClick={() => setActiveMode('RFQ')}
        >
          RFQ
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* RFQ mode — standalone flow                                         */}
      {/* ------------------------------------------------------------------ */}
      {isRfqMode && (
        <RfqPanel />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Normal auction form — hidden when RFQ is active                    */}
      {/* ------------------------------------------------------------------ */}
      {!isRfqMode && (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!effectiveType && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
                  Select `Spot`, `Bulk`, or `Lot` to start configuring the auction.
                </div>
              )}

              {effectiveType && (
                <>
                  <Field label="Title">
                    <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                  </Field>

                  {effectiveType === 'SPOT' && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Booking">
                        <Select
                          value={selectedBookingId}
                          onChange={(event) => {
                            const booking =
                              bookings.find((item) => item.id === event.target.value) ?? selectedBooking
                            setSelectedBookingId(booking.id)
                            setTitle(`Spot | ${booking.id} | ${bookingLaneLabel(booking)}`)
                            setLanes((current) =>
                              current.map((lane, index) =>
                                index === 0
                                  ? {
                                      ...lane,
                                      lane: bookingLaneLabel(booking),
                                      vehicleType: booking.vehicleType,
                                    }
                                  : lane
                              )
                            )
                          }}
                        >
                          {[selectedBooking, ...bookings.filter((item) => item.id !== selectedBooking.id)].map(
                            (booking) => (
                              <option key={booking.id} value={booking.id}>
                                {booking.id} · {bookingLaneLabel(booking)}
                              </option>
                            )
                          )}
                        </Select>
                      </Field>
                      <Field label="Vehicle Type">
                        <Input value={lanes[0]?.vehicleType ?? '20 MT Open Body'} readOnly />
                      </Field>
                    </div>
                  )}

                  {effectiveType === 'LOT' && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <Field
                        label="Region"
                        description="Choose the region first, then pick lanes from that region below."
                      >
                        <Select
                          value={auctionRegion}
                          onChange={(event) => setAuctionRegion(event.target.value)}
                        >
                          {REGION_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                  )}

                  {effectiveType === 'LOT' && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-text">Lane Input</h3>
                          <p className="mt-1 text-xs text-gray-500">
                            Add lanes manually one by one, or upload an Excel sheet with the same columns as the UI.
                          </p>
                        </div>
                        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
                          <button
                            type="button"
                            onClick={() => setLaneImportMode('MANUAL')}
                            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                              laneImportMode === 'MANUAL'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            Manual
                          </button>
                          <button
                            type="button"
                            onClick={() => setLaneImportMode('EXCEL')}
                            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                              laneImportMode === 'EXCEL'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            Excel
                          </button>
                        </div>
                      </div>

                      {laneImportMode === 'EXCEL' ? (
                        <div className="space-y-3">
                          <Input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file) void handleLaneFileImport(file)
                            }}
                          />
                          <p className="text-xs text-gray-500">
                            Required headers: {laneTemplateHeaders().join(', ')}.
                            {importFileName
                              ? ` Imported file: ${importFileName}`
                              : ' Upload a single-sheet workbook with one lane per row.'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Button type="button" variant="outline" onClick={addLane}>
                            Add Lane
                          </Button>
                          <p className="text-xs text-gray-500">Current lanes are edited below in the form.</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-text">Auction Settings</h3>
                      <p className="mt-1 text-xs text-gray-500">All auction-level defaults are editable here.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Min Bid Decrement
                        </label>
                        <Input
                          type="number"
                          value={auctionSettings.minBidDecrement}
                          onChange={(event) =>
                            setAuctionSettings((current) => ({
                              ...current,
                              minBidDecrement: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Extension Trigger (min)
                        </label>
                        <Input
                          type="number"
                          value={auctionSettings.extensionTriggerMinutes}
                          onChange={(event) =>
                            setAuctionSettings((current) => ({
                              ...current,
                              extensionTriggerMinutes: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Extension Duration (min)
                        </label>
                        <Input
                          type="number"
                          value={auctionSettings.extensionDurationMinutes}
                          onChange={(event) =>
                            setAuctionSettings((current) => ({
                              ...current,
                              extensionDurationMinutes: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Max Extensions
                        </label>
                        <Input
                          type="number"
                          value={auctionSettings.maxExtensions}
                          onChange={(event) =>
                            setAuctionSettings((current) => ({
                              ...current,
                              maxExtensions: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Bidding Window (min)
                        </label>
                        <Input
                          type="number"
                          value={auctionSettings.biddingWindowMinutes}
                          onChange={(event) =>
                            setAuctionSettings((current) => ({
                              ...current,
                              biddingWindowMinutes: event.target.value,
                            }))
                          }
                        />
                      </div>
                      {effectiveType !== 'SPOT' && (
                        <>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Contract Start Date
                            </label>
                            <Input
                              type="date"
                              value={auctionSettings.contractStartDate}
                              onChange={(event) =>
                                setAuctionSettings((current) => ({
                                  ...current,
                                  contractStartDate: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Contract End Date
                            </label>
                            <Input
                              type="date"
                              value={auctionSettings.contractEndDate}
                              onChange={(event) =>
                                setAuctionSettings((current) => ({
                                  ...current,
                                  contractEndDate: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* -------------------------------------------------------- */}
                  {/* Lane form cards OR imported-lanes preview table           */}
                  {/* -------------------------------------------------------- */}
                  {laneImportMode === 'EXCEL' && lanes.length > 0 && effectiveType === 'LOT' ? (
                    <ImportedLanesPreviewTable
                      lanes={lanes}
                      importFileName={importFileName}
                      onEditManually={() => setLaneImportMode('MANUAL')}
                    />
                  ) : (
                    <div className="space-y-4">
                      {lanes.map((lane, index) => (
                        <div
                          key={`lane-config-${index}`}
                          className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                        >
                          <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm font-bold text-text">
                              {effectiveType === 'SPOT' ? 'Lane' : `Lane ${index + 1}`}
                            </p>
                            {effectiveType !== 'SPOT' && lanes.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setLanes((current) => current.filter((_, laneIndex) => laneIndex !== index))
                                }
                              >
                                Remove
                              </Button>
                            )}
                          </div>

                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <Field label="Lane">
                              {effectiveType === 'SPOT' ? (
                                <Input value={bookingLaneLabel(activeBooking)} readOnly />
                              ) : (
                                <Select
                                  value={lane.lane}
                                  onChange={(event) => updateLane(index, 'lane', event.target.value)}
                                >
                                  {(effectiveType === 'LOT' ? lotLaneOptions : LANE_OPTIONS).map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </Select>
                              )}
                            </Field>
                            <Field label="Vehicle Type">
                              {effectiveType === 'SPOT' ? (
                                <Input value={activeBooking.vehicleType} readOnly />
                              ) : (
                                <Select
                                  value={lane.vehicleType}
                                  onChange={(event) => updateLane(index, 'vehicleType', event.target.value)}
                                >
                                  {VEHICLE_TYPE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </Select>
                              )}
                            </Field>
                            <Field label="Capacity (MT)">
                              <Input
                                value={lane.capacityMt}
                                onChange={(event) => updateLane(index, 'capacityMt', event.target.value)}
                              />
                            </Field>
                            {effectiveType === 'LOT' && (
                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Region
                                </label>
                                <Input value={auctionRegion} readOnly />
                              </div>
                            )}
                            <Field label="Rate Unit">
                              <Select
                                value={lane.rateUnit}
                                onChange={(event) => updateLane(index, 'rateUnit', event.target.value)}
                              >
                                <option value="PER_TRIP">Per Trip</option>
                                <option value="PER_MT">Per MT</option>
                                <option value="PER_KM">Per KM</option>
                              </Select>
                            </Field>
                            <Field label="Ceiling Rate">
                              <Input
                                value={lane.ceilingRate}
                                onChange={(event) => updateLane(index, 'ceilingRate', event.target.value)}
                              />
                            </Field>
                            {effectiveType !== 'SPOT' && (
                              <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Estimated Trips
                                </label>
                                <Input
                                  value={lane.estimatedTrips}
                                  onChange={(event) => updateLane(index, 'estimatedTrips', event.target.value)}
                                />
                              </div>
                            )}
                            {effectiveType === 'LOT' && (
                              <>
                                <Field
                                  label="Rank Split"
                                  description="R1, R2, and R3 are the auction ranks used across the module. Any percentage mix is allowed as long as the total is 100."
                                >
                                  <Select
                                    value={lane.allocationMode}
                                    onChange={(event) => updateLane(index, 'allocationMode', event.target.value)}
                                  >
                                    <option value="SINGLE">Single Winner</option>
                                    <option value="SPLIT">Split R1/R2/R3</option>
                                  </Select>
                                </Field>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    R1 %
                                  </label>
                                  <Input
                                    value={lane.r1}
                                    onChange={(event) => updateLane(index, 'r1', event.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    R2 %
                                  </label>
                                  <Input
                                    value={lane.r2}
                                    onChange={(event) => updateLane(index, 'r2', event.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    R3 %
                                  </label>
                                  <Input
                                    value={lane.r3}
                                    onChange={(event) => updateLane(index, 'r3', event.target.value)}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-600">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Type</p>
                    <p className="mt-1 text-sm font-bold text-text">{effectiveType || 'Not selected'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lanes</p>
                    <p className="mt-1 text-sm font-bold text-text">{effectiveType ? lanes.length : 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vendors</p>
                    <p className="mt-1 text-sm font-bold text-text">{vendors.length} invited vendors</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Window</p>
                    <p className="mt-1 text-sm font-bold text-text">{auctionSettings.biddingWindowMinutes} minutes</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" disabled={!effectiveType} onClick={() => handleCreate(false)}>
                  Save Draft
                </Button>
                <Button disabled={!effectiveType} onClick={() => handleCreate(true)}>
                  Create and Launch
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
