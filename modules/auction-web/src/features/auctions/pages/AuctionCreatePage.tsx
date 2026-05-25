import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { HeroCard } from '@auction/components/cards/HeroCard'
import { Button } from '@auction/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@auction/components/ui/card'
import { Input } from '@auction/components/ui/input'
import { useAuctionAuth } from '@auction/hooks/useAuctionAuth'
import { useAppStore } from '@auction/stores/app.store'
import { useAuctionPath } from '@auction/lib/auctionPath'
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

export default function AuctionCreatePage() {
  const { type } = useParams()
  const navigate = useNavigate()
  const ap = useAuctionPath()
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
    navigate(ap(`/auctions/${newAuctionId}`))
  }

  return (
    <div>
      <HeroCard
        eyebrow="Auction Builder"
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
              <label className="mb-2 block text-sm font-medium text-[#334155]">Auction Type</label>
              <div className="flex flex-wrap gap-2">
                {(['SPOT', 'BULK', 'LOT'] as AuctionType[]).map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant={effectiveType === item ? 'default' : 'outline'}
                    onClick={() => navigate(ap(`/auctions/new/${item.toLowerCase()}`))}
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </div>

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

                {effectiveType !== 'SPOT' && (
                  <Button type="button" variant="outline" onClick={addLane}>
                    Add Lane
                  </Button>
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
    </div>
  )
}
