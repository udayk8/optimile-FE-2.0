import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import * as ExcelJS from 'exceljs'
import { CheckCircle2, FileSpreadsheet, Minus, TrendingDown, TrendingUp, Upload } from 'lucide-react'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Input } from '@auction/components/ui/input'
import { useAuctionAuth } from '@auction/hooks/useAuctionAuth'
import { useAppStore } from '@auction/stores/app.store'
import type { AuctionType } from '@auction/types'

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
  'Mumbai → Bangalore',
  'Bangalore → Chennai',
  'Chennai → Mumbai',
  'Delhi → Lucknow',
  'Pune → Jaipur',
  'Ahmedabad → Surat',
] as const

const REGION_OPTIONS = ['North India', 'South India', 'West India', 'East India', 'Central India'] as const

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
    biddingWindowMinutes: type === 'SPOT' ? '20' : String(24 * 60),
    contractStartDate: defaultStartDate,
    contractEndDate: defaultEndDate,
  }
}

function makeDefaultLane(type: AuctionType, laneName?: string): DraftLane {
  const lane = laneName ?? (type === 'SPOT' ? 'Mumbai → Delhi' : 'Mumbai → Bangalore')
  return {
    lane,
    vehicleType: '20 MT Open Body',
    capacityMt: '20',
    rateUnit: 'PER_TRIP',
    ceilingRate: type === 'SPOT' ? '52000' : '10000',
    estimatedTrips: type === 'SPOT' ? '1' : '300',
    allocationMode: type === 'SPOT' ? 'SINGLE' : 'SPLIT',
    r1: type === 'SPOT' ? '100' : '60',
    r2: type === 'SPOT' ? '0' : '30',
    r3: type === 'SPOT' ? '0' : '10',
  }
}

function laneTemplateHeaders() {
  return ['lane', 'vehicleType', 'capacityMt', 'rateUnit', 'ceilingRate', 'estimatedTrips', 'allocationMode', 'r1', 'r2', 'r3']
}

function normalizeText(value: unknown) { return String(value ?? '').trim() }

function parseRateUnit(value: unknown): DraftLane['rateUnit'] {
  const n = normalizeText(value).toUpperCase()
  if (n === 'PER_MT') return 'PER_MT'
  if (n === 'PER_KM') return 'PER_KM'
  return 'PER_TRIP'
}

function parseLaneMode(value: unknown): DraftLane['allocationMode'] {
  return normalizeText(value).toUpperCase() === 'SINGLE' ? 'SINGLE' : 'SPLIT'
}

function RfqPanel() {
  const [rfqLanes, setRfqLanes] = useState<RfqLaneRow[]>([])
  const [rfqResponses, setRfqResponses] = useState<RfqResponse[]>([])
  const [rfqLanesFileName, setRfqLanesFileName] = useState('')
  const [rfqResponsesFileName, setRfqResponsesFileName] = useState('')

  const handleRfqLanesImport = async (file: File) => {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const ws = workbook.worksheets[0]
      if (!ws) throw new Error('No sheet found.')
      const rows: RfqLaneRow[] = []
      ws.eachRow((row, rn) => {
        if (rn === 1) return
        const v = row.values as unknown[]
        const lane = normalizeText(v[1])
        if (!lane) return
        rows.push({ id: `rfq-${rn}`, lane, vehicleType: normalizeText(v[2]) || '20 MT Open Body', capacityMt: normalizeText(v[3]) || '20', estimatedTrips: normalizeText(v[4]) || '1', targetPrice: normalizeText(v[5]) || '0' })
      })
      if (!rows.length) throw new Error('No data. Columns: lane, vehicleType, capacityMt, estimatedTrips, targetPrice')
      setRfqLanes(rows); setRfqLanesFileName(file.name)
      toast.success(`Loaded ${rows.length} RFQ lanes.`)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Parse error.') }
  }

  const handleRfqResponsesImport = async (file: File) => {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const ws = workbook.worksheets[0]
      if (!ws) throw new Error('No sheet found.')
      const rows: RfqResponse[] = []
      ws.eachRow((row, rn) => {
        if (rn === 1) return
        const v = row.values as unknown[]
        const lane = normalizeText(v[1])
        if (!lane) return
        rows.push({ lane, vendorName: normalizeText(v[2]) || 'Unknown', quotedPrice: Number(normalizeText(v[3])) || 0 })
      })
      if (!rows.length) throw new Error('No data. Columns: lane, vendorName, quotedPrice')
      setRfqResponses(rows); setRfqResponsesFileName(file.name)
      toast.success(`Loaded ${rows.length} vendor responses.`)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Parse error.') }
  }

  const laneSummaries = useMemo<LaneSummary[]>(() => rfqLanes.map(rfqLane => {
    const responses = rfqResponses.filter(r => r.lane === rfqLane.lane)
    const prices = responses.map(r => r.quotedPrice)
    const avgPrice = prices.length ? prices.reduce((s, p) => s + p, 0) / prices.length : 0
    const minPrice = prices.length ? Math.min(...prices) : 0
    return { lane: rfqLane, responses, avgPrice, minPrice, gapToTarget: avgPrice - Number(rfqLane.targetPrice) }
  }), [rfqLanes, rfqResponses])

  const uniqueVendors = useMemo(() => Array.from(new Set(rfqResponses.map(r => r.vendorName))).sort(), [rfqResponses])
  const lanesbelowTarget = laneSummaries.filter(s => s.responses.length > 0 && s.gapToTarget < 0).length

  function quoteColor(quoted: number, target: number) {
    if (quoted <= target) return 'text-green-700 bg-green-50'
    if (quoted <= target * 1.1) return 'text-amber-700 bg-amber-50'
    return 'text-red-700 bg-red-50'
  }

  function fmt(n: number) { return `₹${Math.round(n).toLocaleString('en-IN')}` }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-primary" /> Upload RFQ Lanes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[#64748B]">Upload lane requirements with target prices.</p>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-gray-50 p-4 hover:border-primary transition-colors">
              <Upload className="h-5 w-5 text-[#64748B]" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#0F172A]">Choose Excel file</div>
                <div className="text-xs text-[#64748B] truncate">lane · vehicleType · capacityMt · estimatedTrips · targetPrice</div>
              </div>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void handleRfqLanesImport(f) }} />
            </label>
            {rfqLanes.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="font-semibold text-green-800">{rfqLanes.length} lanes</span>
                <span className="text-green-600 truncate">· {rfqLanesFileName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={rfqLanes.length === 0 ? 'opacity-60' : ''}>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-primary" /> Upload Vendor Responses</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[#64748B]">Upload vendor-submitted quotes for each lane.</p>
            <label className={`flex items-center gap-3 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-gray-50 p-4 transition-colors ${rfqLanes.length > 0 ? 'cursor-pointer hover:border-primary' : 'cursor-not-allowed'}`}>
              <Upload className="h-5 w-5 text-[#64748B]" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#0F172A]">{rfqLanes.length === 0 ? 'Upload RFQ lanes first' : 'Choose Excel file'}</div>
                <div className="text-xs text-[#64748B] truncate">lane · vendorName · quotedPrice</div>
              </div>
              <input type="file" accept=".xlsx,.xls" className="hidden" disabled={rfqLanes.length === 0} onChange={e => { const f = e.target.files?.[0]; if (f) void handleRfqResponsesImport(f) }} />
            </label>
            {rfqResponses.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="font-semibold text-green-800">{rfqResponses.length} responses</span>
                <span className="text-green-600 truncate">· {rfqResponsesFileName}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {rfqLanes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">RFQ Response Summary</h2>
              <p className="mt-1 text-sm text-[#64748B]">Avg, min, and gap-to-target per lane across all vendor responses.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm"><span className="font-bold text-[#0F172A]">{rfqLanes.length}</span> <span className="text-[#64748B]">lanes</span></div>
              <div className="rounded-lg bg-blue-50 px-4 py-2 text-sm"><span className="font-bold text-blue-900">{uniqueVendors.length}</span> <span className="text-blue-700">vendors</span></div>
              <div className="rounded-lg bg-green-50 px-4 py-2 text-sm"><span className="font-bold text-green-900">{lanesbelowTarget}</span> <span className="text-green-700">below target</span></div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
            <table className="w-full text-left" style={{ minWidth: `${700 + uniqueVendors.length * 130}px` }}>
              <thead>
                <tr className="bg-gray-50 text-xs uppercase tracking-wide text-[#64748B]">
                  <th className="px-4 py-3 font-bold">Lane</th>
                  <th className="px-4 py-3 font-bold">Vehicle</th>
                  <th className="px-4 py-3 font-bold">Trips</th>
                  <th className="px-4 py-3 font-bold">Target ₹</th>
                  {uniqueVendors.map(v => <th key={v} className="bg-blue-50 px-4 py-3 font-bold text-blue-700">{v}</th>)}
                  <th className="px-4 py-3 font-bold">Avg Quote</th>
                  <th className="px-4 py-3 font-bold">Lowest</th>
                  <th className="px-4 py-3 font-bold">Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {laneSummaries.map(summary => {
                  const target = Number(summary.lane.targetPrice)
                  const lowestVendor = summary.responses.find(r => r.quotedPrice === summary.minPrice)
                  return (
                    <tr key={summary.lane.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-[#0F172A]">{summary.lane.lane}</td>
                      <td className="px-4 py-3 text-sm text-[#334155]">{summary.lane.vehicleType}</td>
                      <td className="px-4 py-3 font-mono text-sm text-[#334155]">{summary.lane.estimatedTrips}</td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-[#334155]">{fmt(target)}</td>
                      {uniqueVendors.map(v => {
                        const resp = summary.responses.find(r => r.vendorName === v)
                        return (
                          <td key={v} className="px-4 py-3">
                            {resp ? (
                              <span className={`rounded-lg px-2 py-1 font-mono text-xs font-semibold ${quoteColor(resp.quotedPrice, target)}`}>
                                {fmt(resp.quotedPrice)}
                              </span>
                            ) : <span className="text-xs text-[#94A3B8]">—</span>}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 font-mono text-sm font-bold text-[#0F172A]">
                        {summary.avgPrice > 0 ? fmt(summary.avgPrice) : <span className="text-xs text-[#94A3B8]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {summary.minPrice > 0 ? (
                          <div>
                            <div className="font-mono text-sm font-semibold text-green-700">{fmt(summary.minPrice)}</div>
                            {lowestVendor && <div className="text-xs text-[#64748B]">{lowestVendor.vendorName}</div>}
                          </div>
                        ) : <span className="text-xs text-[#94A3B8]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {summary.avgPrice > 0 ? (
                          <div className={`flex items-center gap-1 font-mono text-sm font-bold ${summary.gapToTarget < 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {summary.gapToTarget < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : summary.gapToTarget > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                            {summary.gapToTarget > 0 ? '+' : ''}{fmt(summary.gapToTarget)}
                          </div>
                        ) : <span className="text-xs text-[#94A3B8]">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rfqResponses.length === 0 && (
              <div className="flex items-center justify-center py-8 text-sm italic text-[#94A3B8]">
                No vendor responses yet — upload the responses file to see quotes.
              </div>
            )}
          </div>

          {rfqResponses.length > 0 && (
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-100 border border-green-300" /> Quote ≤ target</div>
              <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100 border border-amber-300" /> Quote ≤ target + 10%</div>
              <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-100 border border-red-300" /> Quote &gt; target + 10%</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AuctionCreatePage() {
  const { type } = useParams()
  const navigate = useNavigate()
  const auctionType = ((type?.toUpperCase() ?? '') || '') as AuctionType
  const effectiveType: AuctionType | '' = ['SPOT', 'BULK', 'LOT'].includes(auctionType) ? auctionType : ''
  const { createAuction, bookings, vendors } = useAppStore()
  const { auctionUser } = useAuctionAuth()

  const selectedBooking = bookings[0] ?? {
    id: 'BK-DEMO-0001',
    lane: 'Mumbai → Delhi',
    vehicleType: '20 MT Open Body',
    commodity: 'FMCG',
    quantity: 18,
    uom: 'Metric Tonnes',
    loadingDate: new Date().toISOString().slice(0, 10),
    status: 'PENDING_AUCTION' as const,
  }

  const [selectedBookingId, setSelectedBookingId] = useState(selectedBooking.id)
  const [title, setTitle] = useState(`Spot | ${selectedBooking.id} | ${selectedBooking.lane}`)
  const [auctionRegion, setAuctionRegion] = useState('North India')
  const [lanes, setLanes] = useState<DraftLane[]>([makeDefaultLane('SPOT', selectedBooking.lane)])
  const [auctionSettings, setAuctionSettings] = useState<AuctionSettingsState>(makeAuctionSettings('SPOT'))
  const [laneImportMode, setLaneImportMode] = useState<LaneImportMode>('MANUAL')
  const [importFileName, setImportFileName] = useState('')
  const [activeMode, setActiveMode] = useState<ActiveMode>(effectiveType || 'SPOT')

  const isRfqMode = activeMode === 'RFQ'

  const activeBooking = bookings.find((item) => item.id === selectedBookingId) ?? selectedBooking
  const lotLaneOptions = LANE_OPTIONS.filter((lane) => {
    if (auctionRegion === 'North India') return lane === 'Mumbai → Delhi' || lane === 'Delhi → Lucknow'
    if (auctionRegion === 'South India') return lane === 'Mumbai → Bangalore' || lane === 'Bangalore → Chennai' || lane === 'Chennai → Mumbai'
    if (auctionRegion === 'West India') return lane === 'Pune → Jaipur' || lane === 'Ahmedabad → Surat'
    return true
  })

  useEffect(() => {
    if (!effectiveType) return
    const defaultBooking = bookings[0] ?? selectedBooking
    const defaultLane = effectiveType === 'LOT' ? 'Mumbai → Bangalore' : 'Mumbai → Delhi'
    setTitle(
      effectiveType === 'SPOT'
        ? `Spot | ${defaultBooking.id} | ${defaultBooking.lane}`
        : `${titleCase(effectiveType)} | Demo Procurement Event`
    )
    setSelectedBookingId(defaultBooking.id)
    setAuctionRegion(effectiveType === 'LOT' ? 'North India' : 'South India')
    setLanes([makeDefaultLane(effectiveType, defaultLane)])
    setAuctionSettings(makeAuctionSettings(effectiveType))
    setLaneImportMode('MANUAL')
    setImportFileName('')
  }, [effectiveType, bookings, selectedBooking.id, selectedBooking.lane])

  const addLane = () => {
    if (!effectiveType || effectiveType === 'SPOT') return
    setLanes((current) => [...current, makeDefaultLane(effectiveType, lotLaneOptions[0] ?? 'Mumbai → Bangalore')])
  }

  const updateLane = (index: number, field: keyof DraftLane, value: string) => {
    setLanes((current) =>
      current.map((lane, laneIndex) =>
        laneIndex !== index
          ? lane
          : {
              ...lane,
              [field]: value,
              ...(field === 'vehicleType' && value in VEHICLE_CAPACITY ? { capacityMt: VEHICLE_CAPACITY[value as (typeof VEHICLE_TYPE_OPTIONS)[number]] } : {}),
            }
      )
    )
  }

  const handleLaneFileImport = async (file: File) => {
    if (!effectiveType || effectiveType === 'SPOT') return
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const worksheet = workbook.worksheets[0]
      if (!worksheet) throw new Error('No sheets found.')
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
      if (!importedLanes.length) throw new Error(`Required headers: ${laneTemplateHeaders().join(', ')}`)
      setLanes(importedLanes)
      setImportFileName(file.name)
      toast.success(`Imported ${importedLanes.length} lanes from Excel.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not import file.')
    }
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
      createdBy: auctionUser?.name ?? 'Demo User',
      createdByRole: auctionUser?.role ?? 'OPS',
      launchNow,
      lanes: lanes.map((lane) => ({
        lane: lane.lane,
        region: effectiveType === 'LOT' ? auctionRegion : undefined,
        vehicleType: lane.vehicleType,
        capacityMt: Number(lane.capacityMt),
        rateUnit: lane.rateUnit,
        ceilingRate: Number(lane.ceilingRate),
        estimatedTrips: effectiveType === 'LOT' ? Number(lane.estimatedTrips) : undefined,
        basePriceSource: 'MANUAL' as const,
        allocationMode: lane.allocationMode,
        allocation: {
          r1: Number(lane.r1),
          r2: Number(lane.r2),
          r3: Number(lane.r3),
        },
        eligibleVendorIds: vendors.map((item) => item.id),
      })),
    })

    toast.success(launchNow ? 'Auction created and launched.' : 'Auction draft created.')
    navigate(`/auction/auctions/${newAuctionId}`)
  }

  return (
    <div>
      <HeroCard
        eyebrow="Auction Builder"
        title={effectiveType ? `Create ${titleCase(effectiveType)} Auction` : 'Create Auction'}
        subtitle="Single entry point. Select the auction type, configure lanes, rate units, ceilings, and launch when ready."
      />

      <div>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-[#334155]">Auction Type</label>
          <div className="flex flex-wrap gap-2">
            {(['SPOT', 'BULK', 'LOT'] as AuctionType[]).map((item) => (
              <Button
                key={item}
                type="button"
                variant={!isRfqMode && effectiveType === item ? 'default' : 'outline'}
                onClick={() => { setActiveMode(item); navigate(`/auction/auctions/new/${item.toLowerCase()}`) }}
              >
                {item}
              </Button>
            ))}
            <Button type="button" variant={isRfqMode ? 'default' : 'outline'} onClick={() => setActiveMode('RFQ')}>
              RFQ
            </Button>
          </div>
        </div>

        {isRfqMode ? (
          <RfqPanel />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!effectiveType && (
                  <div className="rounded-xl border border-dashed border-[#CBD5E1] p-6 text-sm text-[#64748B]">
                    Select `Spot`, `Bulk`, or `Lot` to start configuring the auction.
                  </div>
                )}

                {effectiveType && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#334155]">Title</label>
                      <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                    </div>

                    {effectiveType === 'SPOT' && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#334155]">Booking</label>
                          <select
                            value={selectedBookingId}
                            onChange={(event) => {
                              const booking = bookings.find((item) => item.id === event.target.value) ?? selectedBooking
                              setSelectedBookingId(booking.id)
                              setTitle(`Spot | ${booking.id} | ${booking.lane}`)
                              setLanes((current) =>
                                current.map((lane, index) =>
                                  index === 0
                                    ? {
                                        ...lane,
                                        lane: booking.lane,
                                        vehicleType: booking.vehicleType,
                                      }
                                    : lane
                                )
                              )
                            }}
                            className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                          >
                            {[selectedBooking, ...bookings.filter((item) => item.id !== selectedBooking.id)].map((booking) => (
                              <option key={booking.id} value={booking.id}>
                                {booking.id} · {booking.lane}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#334155]">Vehicle Type</label>
                          <Input value={lanes[0]?.vehicleType ?? '20 MT Open Body'} readOnly />
                        </div>
                      </div>
                    )}

                    {effectiveType === 'LOT' && (
                      <div className="rounded-xl border border-[#E5E7EB] p-4">
                        <label className="mb-1 block text-sm font-medium text-[#334155]">Region</label>
                        <select
                          value={auctionRegion}
                          onChange={(event) => setAuctionRegion(event.target.value)}
                          className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                        >
                          {REGION_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-[#64748B]">Choose the region first, then pick lanes from that region below.</p>
                      </div>
                    )}

                    <div className="rounded-xl border border-[#E5E7EB] p-4">
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-[#0F172A]">Auction Settings</h3>
                        <p className="mt-1 text-xs text-[#64748B]">All auction-level defaults are editable here.</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#334155]">Min Bid Decrement</label>
                          <Input
                            type="number"
                            value={auctionSettings.minBidDecrement}
                            onChange={(event) => setAuctionSettings((current) => ({ ...current, minBidDecrement: event.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#334155]">Extension Trigger (min)</label>
                          <Input
                            type="number"
                            value={auctionSettings.extensionTriggerMinutes}
                            onChange={(event) => setAuctionSettings((current) => ({ ...current, extensionTriggerMinutes: event.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#334155]">Extension Duration (min)</label>
                          <Input
                            type="number"
                            value={auctionSettings.extensionDurationMinutes}
                            onChange={(event) => setAuctionSettings((current) => ({ ...current, extensionDurationMinutes: event.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#334155]">Max Extensions</label>
                          <Input
                            type="number"
                            value={auctionSettings.maxExtensions}
                            onChange={(event) => setAuctionSettings((current) => ({ ...current, maxExtensions: event.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[#334155]">Bidding Window (min)</label>
                          <Input
                            type="number"
                            value={auctionSettings.biddingWindowMinutes}
                            onChange={(event) => setAuctionSettings((current) => ({ ...current, biddingWindowMinutes: event.target.value }))}
                          />
                        </div>
                        {effectiveType !== 'SPOT' && (
                          <>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-[#334155]">Contract Start Date</label>
                              <Input
                                type="date"
                                value={auctionSettings.contractStartDate}
                                onChange={(event) => setAuctionSettings((current) => ({ ...current, contractStartDate: event.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-[#334155]">Contract End Date</label>
                              <Input
                                type="date"
                                value={auctionSettings.contractEndDate}
                                onChange={(event) => setAuctionSettings((current) => ({ ...current, contractEndDate: event.target.value }))}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {effectiveType !== 'SPOT' && (
                      <div className="rounded-xl border border-[#E5E7EB] bg-gray-50 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-[#0F172A]">Lane Input</h3>
                            <p className="mt-1 text-xs text-[#64748B]">Add lanes manually or bulk-upload via Excel.</p>
                          </div>
                          <div className="flex rounded-lg border border-[#E5E7EB] bg-white p-1">
                            <button type="button" onClick={() => setLaneImportMode('MANUAL')}
                              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${laneImportMode === 'MANUAL' ? 'bg-primary text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}>
                              Manual
                            </button>
                            <button type="button" onClick={() => setLaneImportMode('EXCEL')}
                              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${laneImportMode === 'EXCEL' ? 'bg-primary text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}>
                              Bulk Upload
                            </button>
                          </div>
                        </div>
                        {laneImportMode === 'EXCEL' ? (
                          <div className="space-y-3">
                            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white p-4 hover:border-primary transition-colors">
                              <Upload className="h-5 w-5 text-[#64748B]" />
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-[#0F172A]">Upload Excel file</div>
                                <div className="text-xs text-[#64748B]">Required columns: {laneTemplateHeaders().join(', ')}</div>
                              </div>
                              <input type="file" accept=".xlsx,.xls" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLaneFileImport(f) }} />
                            </label>
                            {importFileName && (
                              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="font-semibold text-green-800">{lanes.length} lanes imported</span>
                                <span className="text-green-600">· {importFileName}</span>
                                <button onClick={() => setLaneImportMode('MANUAL')} className="ml-auto text-xs text-[#64748B] underline hover:text-[#0F172A]">Edit manually</button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Button type="button" variant="outline" onClick={addLane}>Add Lane</Button>
                            <p className="text-xs text-[#64748B]">Lanes are configured in the form below.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {laneImportMode === 'EXCEL' && lanes.length > 0 ? (
                      <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left">
                          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-[#64748B]">
                            <tr>
                              {['#','Lane','Vehicle','Cap (MT)','Rate Unit','Ceiling ₹','Est. Trips','Alloc.','R1%','R2%','R3%'].map(h => (
                                <th key={h} className="px-4 py-3 font-bold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {lanes.map((lane, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-xs text-[#64748B]">{i + 1}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-[#0F172A]">{lane.lane}</td>
                                <td className="px-4 py-3 text-sm text-[#334155]">{lane.vehicleType}</td>
                                <td className="px-4 py-3 font-mono text-sm text-[#334155]">{lane.capacityMt}</td>
                                <td className="px-4 py-3 text-sm text-[#334155]">{lane.rateUnit.replace('_', ' ')}</td>
                                <td className="px-4 py-3 font-mono text-sm text-[#334155]">₹{Number(lane.ceilingRate).toLocaleString('en-IN')}</td>
                                <td className="px-4 py-3 font-mono text-sm text-[#334155]">{lane.estimatedTrips}</td>
                                <td className="px-4 py-3 text-sm text-[#334155]">{lane.allocationMode}</td>
                                <td className="px-4 py-3 font-mono text-sm text-[#334155]">{lane.r1}%</td>
                                <td className="px-4 py-3 font-mono text-sm text-[#334155]">{lane.r2}%</td>
                                <td className="px-4 py-3 font-mono text-sm text-[#334155]">{lane.r3}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {lanes.map((lane, index) => (
                          <div key={`lane-config-${index}`} className="rounded-xl border border-[#E5E7EB] p-4">
                            <div className="mb-4 flex items-center justify-between">
                              <p className="text-sm font-semibold text-[#0F172A]">{effectiveType === 'SPOT' ? 'Lane' : `Lane ${index + 1}`}</p>
                              {effectiveType !== 'SPOT' && lanes.length > 1 && (
                                <Button type="button" variant="outline" size="sm" onClick={() => setLanes((current) => current.filter((_, laneIndex) => laneIndex !== index))}>
                                  Remove
                                </Button>
                              )}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                              <div>
                                <label className="mb-1 block text-sm font-medium text-[#334155]">Lane</label>
                                {effectiveType === 'SPOT' ? (
                                  <Input value={activeBooking.lane} readOnly />
                                ) : (
                                  <select
                                    value={lane.lane}
                                    onChange={(event) => updateLane(index, 'lane', event.target.value)}
                                    className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                                  >
                                    {(effectiveType === 'LOT' ? lotLaneOptions : LANE_OPTIONS).map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium text-[#334155]">Vehicle Type</label>
                                {effectiveType === 'SPOT' ? (
                                  <Input value={activeBooking.vehicleType} readOnly />
                                ) : (
                                  <select
                                    value={lane.vehicleType}
                                    onChange={(event) => updateLane(index, 'vehicleType', event.target.value)}
                                    className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                                  >
                                    {VEHICLE_TYPE_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium text-[#334155]">Capacity (MT)</label>
                                <Input value={lane.capacityMt} onChange={(event) => updateLane(index, 'capacityMt', event.target.value)} />
                              </div>
                              {effectiveType === 'LOT' && (
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-[#334155]">Region</label>
                                  <Input value={auctionRegion} readOnly />
                                </div>
                              )}
                              <div>
                                <label className="mb-1 block text-sm font-medium text-[#334155]">Rate Unit</label>
                                <select
                                  value={lane.rateUnit}
                                  onChange={(event) => updateLane(index, 'rateUnit', event.target.value)}
                                  className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                                >
                                  <option value="PER_TRIP">Per Trip</option>
                                  <option value="PER_MT">Per MT</option>
                                  <option value="PER_KM">Per KM</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium text-[#334155]">Ceiling Rate</label>
                                <Input value={lane.ceilingRate} onChange={(event) => updateLane(index, 'ceilingRate', event.target.value)} />
                              </div>
                              {effectiveType === 'LOT' && (
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-[#334155]">Estimated Trips</label>
                                  <Input value={lane.estimatedTrips} onChange={(event) => updateLane(index, 'estimatedTrips', event.target.value)} />
                                </div>
                              )}
                              {effectiveType !== 'SPOT' && (
                                <>
                                  <div>
                                    <label className="mb-1 block text-sm font-medium text-[#334155]">Rank Split</label>
                                    <select
                                      value={lane.allocationMode}
                                      onChange={(event) => updateLane(index, 'allocationMode', event.target.value)}
                                      className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                                    >
                                      <option value="SINGLE">Single Winner</option>
                                      <option value="SPLIT">Split R1/R2/R3</option>
                                    </select>
                                    <p className="mt-2 text-xs text-[#64748B]">R1, R2, and R3 are the auction ranks used across the module. Any percentage mix is allowed as long as the total is 100.</p>
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-sm font-medium text-[#334155]">R1 %</label>
                                    <Input value={lane.r1} onChange={(event) => updateLane(index, 'r1', event.target.value)} />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-sm font-medium text-[#334155]">R2 %</label>
                                    <Input value={lane.r2} onChange={(event) => updateLane(index, 'r2', event.target.value)} />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-sm font-medium text-[#334155]">R3 %</label>
                                    <Input value={lane.r3} onChange={(event) => updateLane(index, 'r3', event.target.value)} />
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
              <CardContent className="space-y-4 text-sm text-[#475569]">
                <div className="rounded-xl border border-[#E5E7EB] p-4">
                  <p><span className="font-medium text-[#0F172A]">Type:</span> {effectiveType || 'Not selected'}</p>
                  <p className="mt-2"><span className="font-medium text-[#0F172A]">Lanes:</span> {effectiveType ? lanes.length : 0}</p>
                  <p className="mt-2"><span className="font-medium text-[#0F172A]">Vendors:</span> {vendors.length} invited vendors</p>
                  <p className="mt-2"><span className="font-medium text-[#0F172A]">Window:</span> {auctionSettings.biddingWindowMinutes} minutes</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" disabled={!effectiveType} onClick={() => handleCreate(false)}>Save Draft</Button>
                  <Button disabled={!effectiveType} onClick={() => handleCreate(true)}>Create and Launch</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
