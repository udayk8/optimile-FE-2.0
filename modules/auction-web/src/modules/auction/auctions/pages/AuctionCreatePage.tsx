import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as ExcelJS from 'exceljs'
import { toast } from 'sonner'
import { PageHero } from '@shared-ui/page-hero'
import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import { Field, Select } from '@shared-ui/form-field'
import { Input } from '@shared-ui/input'
import { useAppStore } from '@admin/stores/app.store'
import { useAuthStore } from '@admin/stores/auth.store'
import type { AuctionType } from '@admin/types'

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

export default function AuctionCreatePage() {
  const { type } = useParams()
  const navigate = useNavigate()
  const auctionType = ((type?.toUpperCase() ?? '') || '') as AuctionType
  const effectiveType: AuctionType | '' = ['SPOT', 'BULK', 'LOT'].includes(auctionType) ? auctionType : ''
  const { createAuction, bookings, vendors } = useAppStore()
  const { user } = useAuthStore()

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

  const handleLaneFileImport = async (file: File) => {
    if (!effectiveType || effectiveType === 'SPOT') return

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
              ...(field === 'vehicleType' && value in VEHICLE_CAPACITY ? { capacityMt: VEHICLE_CAPACITY[value as (typeof VEHICLE_TYPE_OPTIONS)[number]] } : {}),
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
    <div className="space-y-6">
      <PageHero
        eyebrow="Auction Control"
        title={effectiveType ? `Create ${titleCase(effectiveType)} Auction` : 'Create Auction'}
        subtitle="Single entry point. Select the auction type, configure lanes, rate units, ceilings, and launch when ready."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Auction Type</label>
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
            </div>

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
                      >
                        {[selectedBooking, ...bookings.filter((item) => item.id !== selectedBooking.id)].map((booking) => (
                          <option key={booking.id} value={booking.id}>
                            {booking.id} · {booking.lane}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Vehicle Type">
                      <Input value={lanes[0]?.vehicleType ?? '20 MT Open Body'} readOnly />
                    </Field>
                  </div>
                )}

                {effectiveType === 'LOT' && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <Field label="Region" description="Choose the region first, then pick lanes from that region below.">
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

                {effectiveType !== 'SPOT' && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-text">Lane Input</h3>
                        <p className="mt-1 text-xs text-gray-500">Add lanes manually one by one, or upload an Excel sheet with the same columns as the UI.</p>
                      </div>
                      <div className="flex rounded-lg border border-gray-200 bg-white p-1">
                        <button
                          type="button"
                          onClick={() => setLaneImportMode('MANUAL')}
                          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                            laneImportMode === 'MANUAL' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Manual
                        </button>
                        <button
                          type="button"
                          onClick={() => setLaneImportMode('EXCEL')}
                          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                            laneImportMode === 'EXCEL' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
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
                          {importFileName ? ` Imported file: ${importFileName}` : ' Upload a single-sheet workbook with one lane per row.'}
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
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Min Bid Decrement</label>
                      <Input
                        type="number"
                        value={auctionSettings.minBidDecrement}
                        onChange={(event) => setAuctionSettings((current) => ({ ...current, minBidDecrement: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Extension Trigger (min)</label>
                      <Input
                        type="number"
                        value={auctionSettings.extensionTriggerMinutes}
                        onChange={(event) => setAuctionSettings((current) => ({ ...current, extensionTriggerMinutes: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Extension Duration (min)</label>
                      <Input
                        type="number"
                        value={auctionSettings.extensionDurationMinutes}
                        onChange={(event) => setAuctionSettings((current) => ({ ...current, extensionDurationMinutes: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Max Extensions</label>
                      <Input
                        type="number"
                        value={auctionSettings.maxExtensions}
                        onChange={(event) => setAuctionSettings((current) => ({ ...current, maxExtensions: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Bidding Window (min)</label>
                      <Input
                        type="number"
                        value={auctionSettings.biddingWindowMinutes}
                        onChange={(event) => setAuctionSettings((current) => ({ ...current, biddingWindowMinutes: event.target.value }))}
                      />
                    </div>
                    {effectiveType !== 'SPOT' && (
                      <>
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Contract Start Date</label>
                          <Input
                            type="date"
                            value={auctionSettings.contractStartDate}
                            onChange={(event) => setAuctionSettings((current) => ({ ...current, contractStartDate: event.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Contract End Date</label>
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

                <div className="space-y-4">
                  {lanes.map((lane, index) => (
                    <div key={`lane-config-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm font-bold text-text">{effectiveType === 'SPOT' ? 'Lane' : `Lane ${index + 1}`}</p>
                        {effectiveType !== 'SPOT' && lanes.length > 1 && (
                          <Button type="button" variant="outline" size="sm" onClick={() => setLanes((current) => current.filter((_, laneIndex) => laneIndex !== index))}>
                            Remove
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Field label="Lane">
                          {effectiveType === 'SPOT' ? (
                            <Input value={activeBooking.lane} readOnly />
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
                          <Input value={lane.capacityMt} onChange={(event) => updateLane(index, 'capacityMt', event.target.value)} />
                        </Field>
                        {effectiveType === 'LOT' && (
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Region</label>
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
                          <Input value={lane.ceilingRate} onChange={(event) => updateLane(index, 'ceilingRate', event.target.value)} />
                        </Field>
                        {effectiveType === 'LOT' && (
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Estimated Trips</label>
                            <Input value={lane.estimatedTrips} onChange={(event) => updateLane(index, 'estimatedTrips', event.target.value)} />
                          </div>
                        )}
                        {effectiveType !== 'SPOT' && (
                          <>
                            <Field label="Rank Split" description="R1, R2, and R3 are the auction ranks used across the module. Any percentage mix is allowed as long as the total is 100.">
                              <Select
                                value={lane.allocationMode}
                                onChange={(event) => updateLane(index, 'allocationMode', event.target.value)}
                              >
                                <option value="SINGLE">Single Winner</option>
                                <option value="SPLIT">Split R1/R2/R3</option>
                              </Select>
                            </Field>
                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">R1 %</label>
                              <Input value={lane.r1} onChange={(event) => updateLane(index, 'r1', event.target.value)} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">R2 %</label>
                              <Input value={lane.r2} onChange={(event) => updateLane(index, 'r2', event.target.value)} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">R3 %</label>
                              <Input value={lane.r3} onChange={(event) => updateLane(index, 'r3', event.target.value)} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

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
              <Button variant="outline" disabled={!effectiveType} onClick={() => handleCreate(false)}>Save Draft</Button>
              <Button disabled={!effectiveType} onClick={() => handleCreate(true)}>Create and Launch</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
