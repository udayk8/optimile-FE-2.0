import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useModuleNavigate as useNavigate, ModuleLink as Link } from '@auction/hooks/useModuleRoute'
import { toast } from 'sonner'
import * as ExcelJS from 'exceljs'
import { CheckCircle2, Lock, Upload } from 'lucide-react'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Input } from '@auction/components/ui/input'
import { useAuctionAuth } from '@auction/hooks/useAuctionAuth'
import { useAuctionPermissions } from '@auction/app/permission-context'
import { createAuction, fetchBookings, fetchVendors } from '@auction/lib/mock-services'
import { getLaneCodeError, isValidLaneCode, normalizeLaneCode } from '@shared-utils'
import type { AuctionType, BookingReference, VendorOption } from '@auction/types'

// SPOT  — single lane tied to a booking, single winner
// BULK  — single lane (manually chosen), single winner, no L1/L2/L3
// LOT   — multi-lane, L1/L2/L3 allocation, manual or Excel upload

type DraftLane = {
  lane: string
  vehicleType: string
  capacityMt: string
  commodity: string
  rateUnit: 'PER_TRIP' | 'PER_MT' | 'PER_KM'
  ceilingRate: string
  estimatedTrips: string
  allocationMode: 'SINGLE' | 'SPLIT'
  l1: string
  l2: string
  l3: string
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

const COMMODITY_OPTIONS = [
  'FMCG',
  'Electronics',
  'Automotive',
  'Textiles',
  'Chemicals',
  'Industrial',
  'Pharma',
  'Agriculture',
] as const

const LANE_OPTIONS = [
  'MUM-DEL',
  'MUM-BLR',
  'BLR-MAA',
  'MAA-MUM',
  'DEL-LKO',
  'PNQ-JAI',
  'AMD-SRT',
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
  const lane = laneName ?? (type === 'SPOT' ? 'MUM-DEL' : 'MUM-BLR')
  const isLot = type === 'LOT'
  return {
    lane,
    vehicleType: '20 MT Open Body',
    capacityMt: '20',
    commodity: 'FMCG',
    rateUnit: 'PER_TRIP',
    ceilingRate: type === 'SPOT' ? '52000' : '10000',
    estimatedTrips: type === 'SPOT' ? '1' : '300',
    allocationMode: isLot ? 'SPLIT' : 'SINGLE',
    l1: isLot ? '60' : '100',
    l2: isLot ? '30' : '0',
    l3: isLot ? '10' : '0',
  }
}

function laneTemplateHeaders() {
  return ['lane', 'vehicleType', 'capacityMt', 'rateUnit', 'ceilingRate', 'estimatedTrips', 'allocationMode', 'l1', 'l2', 'l3']
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

const FALLBACK_BOOKING: BookingReference = {
  id: 'BK-DEMO-0001',
  lane: 'MUM-DEL',
  vehicleType: '20 MT Open Body',
  commodity: 'FMCG',
  quantity: 18,
  uom: 'Metric Tonnes',
  loadingDate: new Date().toISOString().slice(0, 10),
  status: 'PENDING_AUCTION',
}

export default function AuctionCreatePage() {
  const { type } = useParams()
  const navigate = useNavigate()
  const auctionType = ((type?.toUpperCase() ?? '') || '') as AuctionType
  const effectiveType: AuctionType | '' = ['SPOT', 'BULK', 'LOT'].includes(auctionType) ? auctionType : ''
  const { auctionUser } = useAuctionAuth()
  const { canCreateAuction } = useAuctionPermissions()

  const [bookings, setBookings] = useState<BookingReference[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchBookings()
      .then(setBookings)
      .catch(() => setBookings([]))
    fetchVendors()
      .then(setVendors)
      .catch(() => setVendors([]))
  }, [])

  const selectedBooking = bookings[0] ?? FALLBACK_BOOKING

  const [selectedBookingId, setSelectedBookingId] = useState(selectedBooking.id)
  const [title, setTitle] = useState(`Spot | ${selectedBooking.id} | ${selectedBooking.lane}`)
  const [auctionRegion, setAuctionRegion] = useState('North India')
  const [lanes, setLanes] = useState<DraftLane[]>([makeDefaultLane('SPOT', selectedBooking.lane)])
  const [auctionSettings, setAuctionSettings] = useState<AuctionSettingsState>(makeAuctionSettings('SPOT'))
  const [laneImportMode, setLaneImportMode] = useState<LaneImportMode>('MANUAL')
  const [importFileName, setImportFileName] = useState('')

  const activeBooking = bookings.find((item) => item.id === selectedBookingId) ?? selectedBooking
  const lotLaneOptions = LANE_OPTIONS.filter((lane) => {
    if (auctionRegion === 'North India') return lane === 'MUM-DEL' || lane === 'DEL-LKO'
    if (auctionRegion === 'South India') return lane === 'MUM-BLR' || lane === 'BLR-MAA' || lane === 'MAA-MUM'
    if (auctionRegion === 'West India') return lane === 'PNQ-JAI' || lane === 'AMD-SRT'
    return true
  })

  useEffect(() => {
    if (!effectiveType) return
    const defaultBooking = bookings[0] ?? FALLBACK_BOOKING
    const defaultLane = effectiveType === 'SPOT' ? defaultBooking.lane : 'MUM-BLR'
    setTitle(
      effectiveType === 'SPOT'
        ? `Spot | ${defaultBooking.id} | ${defaultBooking.lane}`
        : `${titleCase(effectiveType)} | Demo Procurement Event`
    )
    setSelectedBookingId(defaultBooking.id)
    setAuctionRegion('North India')
    setLanes([makeDefaultLane(effectiveType, defaultLane)])
    setAuctionSettings(makeAuctionSettings(effectiveType))
    setLaneImportMode('MANUAL')
    setImportFileName('')
  }, [effectiveType, bookings])

  const addLane = () => {
    if (effectiveType !== 'LOT') return
    setLanes((current) => [...current, makeDefaultLane('LOT', lotLaneOptions[0] ?? 'MUM-BLR')])
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
    if (effectiveType !== 'LOT') return
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const worksheet = workbook.worksheets[0]
      if (!worksheet) throw new Error('No sheets found.')
      const importedLanes: DraftLane[] = []
      const laneErrors: string[] = []
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        const values = row.values as unknown[]
        const rawLane = normalizeText(values[1])
        if (!rawLane) return
        // Lane codes ("MUM-BLR") share validation with vendor-web; the legacy
        // "City → City" format from existing templates stays accepted.
        const isLegacyLane = /→|->/.test(rawLane)
        const lane = isLegacyLane ? rawLane : normalizeLaneCode(rawLane)
        if (!isLegacyLane && !isValidLaneCode(lane)) {
          laneErrors.push(`Row ${rowNumber}: ${getLaneCodeError(lane) ?? 'Invalid lane.'}`)
          return
        }
        importedLanes.push({
          lane,
          vehicleType: normalizeText(values[2]) || '20 MT Open Body',
          capacityMt: normalizeText(values[3]) || '20',
          commodity: 'FMCG',
          rateUnit: parseRateUnit(values[4]),
          ceilingRate: normalizeText(values[5]) || '0',
          estimatedTrips: normalizeText(values[6]) || '300',
          allocationMode: parseLaneMode(values[7]),
          l1: normalizeText(values[8]) || '0',
          l2: normalizeText(values[9]) || '0',
          l3: normalizeText(values[10]) || '0',
        })
      })
      if (laneErrors.length) throw new Error(laneErrors.join(' '))
      if (!importedLanes.length) throw new Error(`Required headers: ${laneTemplateHeaders().join(', ')}`)
      setLanes(importedLanes)
      setImportFileName(file.name)
      toast.success(`Imported ${importedLanes.length} lanes from Excel.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not import file.')
    }
  }

  const handleCreate = async (launchNow: boolean) => {
    if (!effectiveType) {
      toast.error('Select an auction type first.')
      return
    }

    setSaving(true)
    try {
      const payload = {
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
          allocationMode: effectiveType === 'LOT' ? lane.allocationMode : 'SINGLE',
          l1AllocationPct: effectiveType === 'LOT' ? Number(lane.l1) : 100,
          l2AllocationPct: effectiveType === 'LOT' ? Number(lane.l2) : 0,
          l3AllocationPct: effectiveType === 'LOT' ? Number(lane.l3) : 0,
          eligibleVendorIds: vendors.map((item) => item.id),
        })),
      }

      const created = await createAuction(payload)
      toast.success(launchNow ? 'Auction created and launched.' : 'Auction draft created.')
      navigate(`/auction/auctions/${created.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create auction.')
    } finally {
      setSaving(false)
    }
  }

  if (!canCreateAuction) {
    return (
      <div>
        <HeroCard
          eyebrow="Auction Builder"
          title="Access Denied"
          subtitle="Your role doesn't have permission to create auctions."
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Lock className="size-4" />
            </div>
            <div className="text-sm text-[#475569]">
              Ask a Tenant Admin to grant the <span className="font-medium text-[#0F172A]">Create Auction</span> permission.
            </div>
            <Button asChild variant="outline">
              <Link to="/auction/auctions">Back to Auctions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <HeroCard
        eyebrow="Auction Builder"
        title={effectiveType ? `Create ${titleCase(effectiveType)} Auction` : 'Create Auction'}
        subtitle="Select the auction type, configure lanes, rate units, ceilings, and launch when ready."
      />

      <div>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-[#334155]">Auction Type</label>
          <div className="flex flex-wrap gap-2">
            {(['SPOT', 'BULK', 'LOT'] as AuctionType[]).map((item) => (
              <Button
                key={item}
                type="button"
                variant={effectiveType === item ? 'default' : 'outline'}
                onClick={() => navigate(`/auction/auctions/new/${item.toLowerCase()}`)}
              >
                {item}
              </Button>
            ))}
          </div>
          {effectiveType === 'BULK' && (
            <p className="mt-2 text-xs text-[#64748B]">Single-lane auction with a single winner — no allocation split.</p>
          )}
          {effectiveType === 'LOT' && (
            <p className="mt-2 text-xs text-[#64748B]">Multi-lane auction with L1/L2/L3 allocation split. Add lanes manually or import via Excel.</p>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!effectiveType && (
                <div className="rounded-xl border border-dashed border-[#CBD5E1] p-6 text-sm text-[#64748B]">
                  Select <strong>Spot</strong>, <strong>Bulk</strong>, or <strong>Lot</strong> to start configuring the auction.
                </div>
              )}

              {effectiveType && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#334155]">Title</label>
                    <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                  </div>

                  {/* SPOT — booking selector */}
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
                                index === 0 ? { ...lane, lane: booking.lane, vehicleType: booking.vehicleType } : lane
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

                  {/* LOT — region selector */}
                  {effectiveType === 'LOT' && (
                    <div className="rounded-xl border border-[#E5E7EB] p-4">
                      <label className="mb-1 block text-sm font-medium text-[#334155]">Region</label>
                      <select
                        value={auctionRegion}
                        onChange={(event) => setAuctionRegion(event.target.value)}
                        className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                      >
                        {REGION_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-[#64748B]">Choose the region first, then pick lanes from that region below.</p>
                    </div>
                  )}

                  {/* Auction settings */}
                  <div className="rounded-xl border border-[#E5E7EB] p-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-[#0F172A]">Auction Settings</h3>
                      <p className="mt-1 text-xs text-[#64748B]">All auction-level defaults are editable here.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#334155]">Min Bid Decrement</label>
                        <Input type="number" value={auctionSettings.minBidDecrement}
                          onChange={(e) => setAuctionSettings((s) => ({ ...s, minBidDecrement: e.target.value }))} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#334155]">Extension Trigger (min)</label>
                        <Input type="number" value={auctionSettings.extensionTriggerMinutes}
                          onChange={(e) => setAuctionSettings((s) => ({ ...s, extensionTriggerMinutes: e.target.value }))} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#334155]">Extension Duration (min)</label>
                        <Input type="number" value={auctionSettings.extensionDurationMinutes}
                          onChange={(e) => setAuctionSettings((s) => ({ ...s, extensionDurationMinutes: e.target.value }))} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#334155]">Max Extensions</label>
                        <Input type="number" value={auctionSettings.maxExtensions}
                          onChange={(e) => setAuctionSettings((s) => ({ ...s, maxExtensions: e.target.value }))} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#334155]">Bidding Window (min)</label>
                        <Input type="number" value={auctionSettings.biddingWindowMinutes}
                          onChange={(e) => setAuctionSettings((s) => ({ ...s, biddingWindowMinutes: e.target.value }))} />
                      </div>
                      {effectiveType !== 'SPOT' && (
                        <>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#334155]">Contract Start Date</label>
                            <Input type="date" value={auctionSettings.contractStartDate}
                              onChange={(e) => setAuctionSettings((s) => ({ ...s, contractStartDate: e.target.value }))} />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-[#334155]">Contract End Date</label>
                            <Input type="date" value={auctionSettings.contractEndDate}
                              onChange={(e) => setAuctionSettings((s) => ({ ...s, contractEndDate: e.target.value }))} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* LOT — lane input with manual/excel toggle */}
                  {effectiveType === 'LOT' && (
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

                  {/* Lane forms */}
                  {laneImportMode === 'EXCEL' && lanes.length > 0 ? (
                    <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-[#64748B]">
                          <tr>
                            {['#', 'Lane', 'Vehicle', 'Cap (MT)', 'Rate Unit', 'Ceiling ₹', 'Est. Trips', 'Alloc.', 'L1%', 'L2%', 'L3%'].map(h => (
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
                              <td className="px-4 py-3 font-mono text-sm text-[#334155]">{lane.l1}%</td>
                              <td className="px-4 py-3 font-mono text-sm text-[#334155]">{lane.l2}%</td>
                              <td className="px-4 py-3 font-mono text-sm text-[#334155]">{lane.l3}%</td>
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
                            <p className="text-sm font-semibold text-[#0F172A]">
                              {effectiveType === 'SPOT' ? 'Lane' : effectiveType === 'BULK' ? 'Lane' : `Lane ${index + 1}`}
                            </p>
                            {effectiveType === 'LOT' && lanes.length > 1 && (
                              <Button type="button" variant="outline" size="sm"
                                onClick={() => setLanes((current) => current.filter((_, laneIndex) => laneIndex !== index))}>
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
                                    <option key={option} value={option}>{option}</option>
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
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-[#334155]">Capacity (MT)</label>
                              <Input value={lane.capacityMt} onChange={(event) => updateLane(index, 'capacityMt', event.target.value)} />
                            </div>
                            {effectiveType === 'BULK' && (
                              <div>
                                <label className="mb-1 block text-sm font-medium text-[#334155]">Commodity Type</label>
                                <select
                                  value={lane.commodity}
                                  onChange={(event) => updateLane(index, 'commodity', event.target.value)}
                                  className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                                >
                                  {COMMODITY_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </div>
                            )}
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
                            {/* LOT only: L1/L2/L3 allocation split */}
                            {effectiveType === 'LOT' && (
                              <>
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-[#334155]">Rank Split</label>
                                  <select
                                    value={lane.allocationMode}
                                    onChange={(event) => updateLane(index, 'allocationMode', event.target.value)}
                                    className="flex h-10 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
                                  >
                                    <option value="SINGLE">Single Winner</option>
                                    <option value="SPLIT">Split L1/L2/L3</option>
                                  </select>
                                  <p className="mt-2 text-xs text-[#64748B]">L1, L2, and L3 are the allocation ranks used across auctions, awards, and contracts. Any percentage mix is allowed as long as the total is 100.</p>
                                </div>
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-[#334155]">L1 %</label>
                                  <Input value={lane.l1} onChange={(event) => updateLane(index, 'l1', event.target.value)} />
                                </div>
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-[#334155]">L2 %</label>
                                  <Input value={lane.l2} onChange={(event) => updateLane(index, 'l2', event.target.value)} />
                                </div>
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-[#334155]">L3 %</label>
                                  <Input value={lane.l3} onChange={(event) => updateLane(index, 'l3', event.target.value)} />
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
                {effectiveType === 'BULK' && (
                  <p className="mt-2 text-xs text-[#64748B]">Bulk: single lane, single winner. No allocation split.</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" disabled={!effectiveType || saving} onClick={() => handleCreate(false)}>
                  {saving ? 'Saving…' : 'Save Draft'}
                </Button>
                <Button disabled={!effectiveType || saving} onClick={() => handleCreate(true)}>
                  {saving ? 'Creating…' : 'Create and Launch'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
