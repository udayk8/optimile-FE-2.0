import { MapPin, Plus, ArrowRight, ChevronDown, AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@shared-ui/button'
import { useEffect, useRef } from 'react'
import type { CustomerDataBridge, CustomerCommercialType, CustomerServiceType, CustomerContractRateType, CustomerSpotContractMatch, CustomerRateCardResult } from '../integration/customer-data-bridge'

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryDraft = {
  id:                   string
  originCity:           string
  originAddressId:      string
  destinationCity:      string
  destinationAddressId: string
  materialId:           string
  quantity:             string
  uom:                  string
  weight:               string
  weightUom:            string
  distanceKm:           string
}

type BookingDraft = {
  commercialType:      CustomerCommercialType
  serviceType:         CustomerServiceType
  contractRateType:    CustomerContractRateType
  vehicleTypeId:       string
  pickupDateTime:      string
  enteredRate:         string
  deviationRemark:     string
  specialInstructions: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SELECT_CLS =
  'h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uniqueCities(addresses: CustomerDataBridge['addresses']): string[] {
  return Array.from(
    new Set(addresses.map((a) => a.city.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b))
}

function addressesForCity(
  addresses: CustomerDataBridge['addresses'],
  city: string,
  excludeId?: string,
): CustomerDataBridge['addresses'] {
  return addresses.filter(
    (a) =>
      a.city.trim().toLowerCase() === city.trim().toLowerCase() &&
      a.id !== excludeId,
  )
}

function createEmptyDelivery(index: number): DeliveryDraft {
  return {
    id:                   `draft-${index}-${Date.now()}`,
    originCity:           '',
    originAddressId:      '',
    destinationCity:      '',
    destinationAddressId: '',
    materialId:           '',
    quantity:             '',
    uom:                  '',
    weight:               '',
    weightUom:            'MT',
    distanceKm:           '',
  }
}

// Weight unit conversion — factors relative to KG
const WEIGHT_TO_KG: Record<string, number> = { KG: 1, MT: 1000, TON: 1000, LB: 0.453592, QT: 100 }

function convertWeight(value: number, from: string, to: string): number {
  if (!value || from === to) return value
  const fromFactor = WEIGHT_TO_KG[from.toUpperCase()] ?? 1
  const toFactor   = WEIGHT_TO_KG[to.toUpperCase()]   ?? 1
  return parseFloat(((value * fromFactor) / toFactor).toFixed(3))
}

// ─── Address dialog types & helpers ───────────────────────────────────────────

type AddressDraft = {
  contactPersonName: string
  phone: string
  email: string
  addressName: string
  addressLine1: string
  addressLine2: string
  pincode: string
  country: string
  state: string
  city: string
  gstin: string
  usage: 'ORIGIN' | 'DESTINATION' | 'BOTH'
}

function emptyAddressDraft(city: string): AddressDraft {
  return {
    contactPersonName: '', phone: '', email: '',
    addressName: '', addressLine1: '', addressLine2: '',
    pincode: '', country: 'India', state: '', city,
    gstin: '', usage: 'DESTINATION',
  }
}

function validateAddressDraft(d: AddressDraft): string | null {
  if (!d.contactPersonName.trim()) return 'Contact person name is required.'
  const digits = d.phone.replace(/\D/g, '')
  const normalized = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits
  if (!/^[6-9]\d{9}$/.test(normalized)) return 'Phone must be a valid Indian mobile number.'
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return 'Email must be valid.'
  if (!d.addressLine1.trim()) return 'Address Line 1 is required.'
  if (!/^\d{6}$/.test(d.pincode.trim())) return 'Pincode must be 6 digits.'
  if (!d.state.trim()) return 'State is required.'
  if (!d.city.trim()) return 'City is required.'
  if (d.gstin.trim() && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/i.test(d.gstin.trim())) return 'GSTIN must be valid if entered.'
  return null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children, required, optional }: { children: React.ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
      {children}
      {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
      {optional && <span className="ml-1 font-normal normal-case text-gray-300">optional</span>}
    </p>
  )
}

function RouteCard({
  side, city, addressId, allCities, addresses, onCityChange, onAddressChange,
}: {
  side:            'origin' | 'destination'
  city:            string
  addressId:       string
  allCities:       string[]
  addresses:       CustomerDataBridge['addresses']
  onCityChange:    (v: string) => void
  onAddressChange: (v: string) => void
}) {
  const isOrigin  = side === 'origin'
  const accentCls = isOrigin ? 'border-t-blue-400' : 'border-t-emerald-400'
  const iconCls   = isOrigin ? 'text-blue-500' : 'text-emerald-500'

  return (
    <div className={`flex-1 rounded-xl border border-gray-200 border-t-4 ${accentCls} p-4`}>
      <div className={`mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${iconCls}`}>
        <MapPin className="h-3 w-3" />
        {isOrigin ? 'Origin' : 'Destination'}
      </div>
      <div className="space-y-2.5">
        <div>
          <Label required>City</Label>
          <div className="relative">
            <select className={SELECT_CLS} value={city} onChange={(e) => onCityChange(e.target.value)}>
              <option value="">Select city</option>
              {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        <div>
          <Label required>Address</Label>
          <div className="relative">
            <select
              className={SELECT_CLS}
              value={addressId}
              disabled={!city}
              onChange={(e) => onAddressChange(e.target.value)}
            >
              <option value="">
                {!city ? 'Select city first' : addresses.length ? 'Select address' : 'No addresses registered'}
              </option>
              {addresses.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          </div>
          {city && !addresses.length && (
            <p className="mt-1 text-[11px] text-warning">
              No registered addresses for {city} — contact operations to add one.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function CommercialKV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="truncate text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
}

function DlgField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      {children}
    </div>
  )
}

function DlgInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-gray-300"
    />
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  bridge:            CustomerDataBridge
  onCreated:         (bookingId: string) => void
  editingBookingId?: string
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomerCreateBookingForm({ bridge, onCreated, editingBookingId }: Props) {
  const prefill = editingBookingId ? bridge.getBookingForEdit(editingBookingId) : null

  const [draft, setDraft] = useState<BookingDraft>({
    commercialType:      prefill?.commercialType      ?? 'SPOT',
    serviceType:         prefill?.serviceType         ?? 'FTL',
    contractRateType:    prefill?.contractRateType    ?? 'PER_TRIP',
    vehicleTypeId:       prefill?.vehicleTypeId       ?? '',
    pickupDateTime:      prefill?.pickupDate          ?? '',
    enteredRate:         prefill?.enteredRate != null ? String(prefill.enteredRate) : '',
    deviationRemark:     prefill?.deviationRemark     ?? '',
    specialInstructions: prefill?.specialInstructions ?? '',
  })

  const [matchedRateCard,    setMatchedRateCard]    = useState<CustomerRateCardResult | null>(null)
  const [rateLookupPending,  setRateLookupPending]  = useState(false)
  const rateLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [successMsg,         setSuccessMsg]         = useState('')

  const [deliveries, setDeliveries] = useState<DeliveryDraft[]>(
    prefill
      ? [{
          id:                   `edit-${editingBookingId}`,
          originCity:           bridge.addresses.find((a) => a.id === prefill.originAddressId)?.city ?? '',
          originAddressId:      prefill.originAddressId,
          destinationCity:      bridge.addresses.find((a) => a.id === prefill.destinationAddressId)?.city ?? '',
          destinationAddressId: prefill.destinationAddressId,
          materialId:           prefill.materialId,
          quantity:             prefill.quantity > 0 ? String(prefill.quantity) : '',
          uom:                  prefill.uom,
          weight:               prefill.weight > 0 ? String(prefill.weight) : '',
          weightUom:            prefill.weightUom,
          distanceKm:           prefill.distanceKm != null ? String(prefill.distanceKm) : '',
        }]
      : [createEmptyDelivery(1)]
  )
  const [error,  setError]  = useState('')
  const [saving, setSaving] = useState(false)
  const [useSpotContract, setUseSpotContract] = useState(true)

  // Address dialog state
  const [addrDialogOpen,        setAddrDialogOpen]        = useState(false)
  const [addrDialogDeliveryIdx, setAddrDialogDeliveryIdx] = useState(0)
  const [addrDialogTarget,      setAddrDialogTarget]      = useState<'origin' | 'destination'>('destination')
  const [addrDraft,             setAddrDraft]             = useState<AddressDraft>(() => emptyAddressDraft(''))
  const [addrDialogError,       setAddrDialogError]       = useState('')
  const [addrSaving,            setAddrSaving]            = useState(false)

  // ── Delivery helpers ────────────────────────────────────────────────────────

  function patchDelivery(index: number, patch: Partial<DeliveryDraft>) {
    setDeliveries((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d
        const next = { ...d, ...patch }

        // Keep uom + weightUom in sync when material changes
        const materialChanged = patch.materialId !== undefined
        const mat = bridge.materials.find((m) => m.id === (materialChanged ? patch.materialId : d.materialId))
        if (materialChanged && mat) {
          next.uom = mat.uom
          if (mat.weightUom) next.weightUom = mat.weightUom
        }

        // Convert weight when weight UOM changes
        if (patch.weightUom !== undefined && d.weightUom && patch.weightUom !== d.weightUom && Number(d.weight) > 0) {
          next.weight = String(convertWeight(Number(d.weight), d.weightUom, patch.weightUom))
        }

        // Auto-calculate weight from quantity × conversion factor
        const qty = Number(patch.quantity ?? next.quantity)
        if (mat?.conversionValue && qty > 0) {
          next.weight = String(parseFloat((qty * mat.conversionValue).toFixed(3)))
        } else if (materialChanged) {
          // Material cleared — reset weight too
          if (!patch.materialId) next.weight = ''
        }

        return next
      }),
    )
    setError('')
  }

  function addDelivery() {
    setDeliveries((prev) => [
      ...prev,
      {
        ...createEmptyDelivery(prev.length + 1),
        originCity:      prev.at(-1)?.destinationCity      ?? '',
        originAddressId: prev.at(-1)?.destinationAddressId ?? '',
      },
    ])
  }

  function removeDelivery(index: number) {
    if (deliveries.length === 1) return
    setDeliveries((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Address dialog ──────────────────────────────────────────────────────────

  function openAddressDialog(deliveryIndex: number, target: 'origin' | 'destination') {
    const delivery = deliveries[deliveryIndex]
    const city = target === 'origin' ? (delivery?.originCity ?? '') : (delivery?.destinationCity ?? '')
    setAddrDialogDeliveryIdx(deliveryIndex)
    setAddrDialogTarget(target)
    setAddrDraft({ ...emptyAddressDraft(city), usage: target === 'origin' ? 'ORIGIN' : 'DESTINATION' })
    setAddrDialogError('')
    setAddrDialogOpen(true)
  }

  function saveAddress() {
    const validationError = validateAddressDraft(addrDraft)
    if (validationError) { setAddrDialogError(validationError); return }
    setAddrSaving(true)
    try {
      const created = bridge.createAddress(addrDraft)
      if (addrDialogTarget === 'origin') {
        patchDelivery(addrDialogDeliveryIdx, {
          originCity:      created.city,
          originAddressId: created.id,
        })
      } else {
        patchDelivery(addrDialogDeliveryIdx, {
          destinationCity:      created.city,
          destinationAddressId: created.id,
        })
      }
      setAddrDialogOpen(false)
      setAddrDialogError('')
    } catch (e) {
      setAddrDialogError(e instanceof Error ? e.message : 'Address could not be saved.')
    } finally {
      setAddrSaving(false)
    }
  }

  // ── CONTRACT rate lookup (debounced 300 ms, mirrors TMS) ───────────────────

  useEffect(() => {
    if (draft.commercialType !== 'CONTRACT') {
      setMatchedRateCard(null)
      setRateLookupPending(false)
      return
    }
    const first = deliveries[0]
    const last  = deliveries[deliveries.length - 1] ?? first
    if (!first?.originAddressId || !last?.destinationCity) {
      setMatchedRateCard(null)
      setRateLookupPending(false)
      return
    }
    const totalWeight = deliveries.reduce((sum, d) => sum + (Number(d.weight) || 0), 0)
    setRateLookupPending(true)
    if (rateLookupTimer.current) clearTimeout(rateLookupTimer.current)
    rateLookupTimer.current = setTimeout(() => {
      const vehicleTypeCode = draft.vehicleTypeId
        ? (bridge.vehicleTypes.find((v) => v.id === draft.vehicleTypeId)?.label ?? null)
        : null
      const result = bridge.lookupContractRate({
        originAddressId: first.originAddressId,
        destinationCity: last.destinationCity,
        vehicleTypeCode,
        rateType:        draft.contractRateType,
        weight:          totalWeight,
        pickupDate:      draft.pickupDateTime ? draft.pickupDateTime.slice(0, 10) : null,
      })
      setMatchedRateCard(result)
      setRateLookupPending(false)
    }, 300)
    return () => { if (rateLookupTimer.current) clearTimeout(rateLookupTimer.current) }
  }, [
    bridge,
    draft.commercialType,
    draft.contractRateType,
    draft.vehicleTypeId,
    draft.pickupDateTime,
    deliveries,
  ])

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (draft.commercialType === 'SPOT' && !(Number(draft.enteredRate) > 0)) {
      return 'Enter a valid freight rate (₹).'
    }
    if (draft.commercialType === 'CONTRACT' && !matchedRateCard) {
      return 'No rate card found for the selected lane. Contact operations.'
    }
    for (const [i, d] of deliveries.entries()) {
      const n = i + 1
      if (!d.originCity)        return `Delivery ${n}: select an origin city.`
      if (!d.originAddressId)   return `Delivery ${n}: select an origin address.`
      if (!d.destinationCity)   return `Delivery ${n}: select a destination city.`

      const destAddrs = addressesForCity(
        bridge.addresses.filter((a) => a.usage !== 'ORIGIN'),
        d.destinationCity,
        d.originAddressId,
      )
      if (destAddrs.length > 0 && !d.destinationAddressId)
                                return `Delivery ${n}: select a destination address.`
      if (!d.materialId)        return `Delivery ${n}: select a material.`
      if (!(Number(d.quantity) > 0)) return `Delivery ${n}: enter a valid quantity.`
      if (!(Number(d.weight)   > 0)) return `Delivery ${n}: enter a valid weight.`
    }
    return null
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  function buildBookingInput(d: typeof deliveries[number], asDraft: boolean) {
    const mat = bridge.materials.find((m) => m.id === d.materialId)
    return {
      commercialType:       draft.commercialType,
      serviceType:          draft.serviceType,
      contractRateType:     draft.contractRateType,
      originAddressId:      d.originAddressId,
      destinationAddressId: d.destinationAddressId,
      materialId:           d.materialId,
      quantity:             Number(d.quantity),
      weight:               Number(d.weight),
      uom:                  d.uom || mat?.uom || 'NOS',
      weightUom:            d.weightUom || mat?.weightUom || 'MT',
      vehicleTypeId:        draft.vehicleTypeId || null,
      pickupDate:           draft.pickupDateTime ? draft.pickupDateTime.slice(0, 10) : null,
      pickupTime:           draft.pickupDateTime ? draft.pickupDateTime.slice(11, 16) || null : null,
      specialInstructions:  draft.specialInstructions.trim() || null,
      distanceKm:           d.distanceKm ? Number(d.distanceKm) : null,
      spotContractId:       useSpotContract && spotContractMatch ? spotContractMatch.contractId : null,
      enteredRate:          draft.commercialType === 'SPOT' ? Number(draft.enteredRate) : (matchedRateCard?.rate ?? null),
      deviationRemark:      draft.deviationRemark.trim() || null,
      goodsValue:           null,
      asDraft,
    }
  }

  function handleSubmit() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setSaving(true)
    try {
      let firstId = ''
      for (let i = 0; i < deliveries.length; i++) {
        const d = deliveries[i]!
        const input = buildBookingInput(d, false)
        const id = (editingBookingId && i === 0)
          ? bridge.updateBooking(editingBookingId, input)
          : bridge.createBooking(input)
        if (!firstId) firstId = id
      }
      setSaving(false)
      setSuccessMsg(editingBookingId ? `Booking ${firstId} updated.` : `Booking ${firstId} submitted.`)
      setTimeout(() => onCreated(firstId), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking could not be submitted.')
      setSaving(false)
    }
  }

  function handleSaveDraft() {
    // Draft only requires at least one field filled — mirrors TMS validateAll:false
    const d = deliveries[0]
    if (!d || (!d.originAddressId && !d.destinationCity && !d.materialId)) {
      setError('Fill in at least the origin, destination, or material before saving a draft.')
      return
    }
    setError('')
    setSaving(true)
    try {
      let firstId = ''
      for (const del of deliveries) {
        const input = buildBookingInput(del, true)
        const id = editingBookingId
          ? bridge.updateBooking(editingBookingId, input)
          : bridge.createBooking(input)
        if (!firstId) firstId = id
      }
      setSaving(false)
      setSuccessMsg(`Draft ${firstId} saved.`)
      setTimeout(() => onCreated(firstId), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Draft could not be saved.')
      setSaving(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  // Commercial preview shown once route + material are ready
  const routeReady    = deliveries.some((d) => d.originAddressId && d.destinationCity)
  const materialReady = deliveries.some((d) => d.materialId && Number(d.quantity) > 0 && Number(d.weight) > 0)
  const commercialReady = routeReady && materialReady

  // Spot contract lane match — only relevant when commercial type is SPOT
  const spotContractMatch: CustomerSpotContractMatch | null = (() => {
    if (draft.commercialType !== 'SPOT') return null
    const first = deliveries[0]
    const last  = deliveries[deliveries.length - 1] ?? first
    if (!first?.originCity || !last?.destinationCity) return null
    return bridge.getSpotContractForLane(first.originCity, last.destinationCity)
  })()

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 pb-28">

      {/* Heading */}
      <div>
        {editingBookingId && (
          <button type="button" onClick={() => onCreated('')} className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:underline">
            ← Back to Bookings
          </button>
        )}
        <h2 className="text-xl font-extrabold text-text">{editingBookingId ? `Edit Booking — ${editingBookingId}` : 'New Booking'}</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Fields marked <span className="text-danger" aria-hidden>*</span> are required.
        </p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="text-sm font-semibold text-emerald-700">{successMsg} Redirecting…</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="flex-1 text-sm font-medium text-danger">{error}</p>
          <button type="button" onClick={() => setError('')} className="text-danger/50 hover:text-danger">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Config ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-end gap-4">

          <div>
            <Label>Type</Label>
            <div className="relative">
              <select
                className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm font-medium text-gray-700 outline-none transition hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={draft.commercialType}
                onChange={(e) => setDraft((p) => ({ ...p, commercialType: e.target.value as CustomerCommercialType }))}
              >
                <option value="SPOT">Spot</option>
                <option value="CONTRACT">Contract</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <Label>Service</Label>
            <div className="relative">
              <select
                className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm font-medium text-gray-700 outline-none transition hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={draft.serviceType}
                onChange={(e) => setDraft((p) => ({ ...p, serviceType: e.target.value as CustomerServiceType }))}
              >
                <option value="FTL">FTL — Full Truck</option>
                <option value="PTL">PTL — Part Truck</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {draft.commercialType === 'CONTRACT' && (
            <div>
              <Label>Rate Type</Label>
              <div className="relative">
                <select
                  className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm font-medium text-gray-700 outline-none transition hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
                  value={draft.contractRateType}
                  onChange={(e) => setDraft((p) => ({ ...p, contractRateType: e.target.value as CustomerContractRateType }))}
                >
                  <option value="PER_TRIP">Per Trip</option>
                  <option value="PER_MT">Per MT</option>
                  <option value="PER_KM">Per KM</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          )}

          <div className="h-8 w-px bg-gray-200" />

          <div>
            <Label>No. of Deliveries</Label>
            <input
              disabled
              value={deliveries.length}
              className="h-9 w-16 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-400 outline-none cursor-not-allowed text-center"
            />
          </div>

          <div>
            <Label>Mode</Label>
            <input
              disabled
              value="Road"
              className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-400 outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <Label>Vehicle</Label>
            <div className="relative">
              <select
                className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm font-medium text-gray-700 outline-none transition hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={draft.vehicleTypeId}
                onChange={(e) => setDraft((p) => ({ ...p, vehicleTypeId: e.target.value }))}
              >
                <option value="">Any vehicle</option>
                {bridge.vehicleTypes.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <Label>Loading Date &amp; Time</Label>
            <input
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={draft.pickupDateTime}
              onChange={(e) => setDraft((p) => ({ ...p, pickupDateTime: e.target.value }))}
            />
          </div>

        </div>
      </div>

      {/* ── Spot contract lane match ───────────────────────────────────────── */}
      {spotContractMatch && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                ⚡ Pre-negotiated rate available: {spotContractMatch.originCity} → {spotContractMatch.destinationCity}
              </p>
              <p className="mt-1 text-xs text-amber-800">
                ₹{spotContractMatch.contractedRate.toLocaleString('en-IN')}{' '}
                {spotContractMatch.rateUnit.replace('PER_', '/').toLowerCase()} · valid till {spotContractMatch.endDate}.
                One-time use.
              </p>
              <p className="mt-1 text-xs text-amber-700">
                {useSpotContract
                  ? 'This rate will be applied to your booking automatically.'
                  : 'Ignored — your booking will follow the standard rate confirmation process.'}
              </p>
            </div>
            <Button
              onClick={() => setUseSpotContract((v) => !v)}
              disabled={saving}
            >
              {useSpotContract ? 'Ignore rate' : 'Use pre-negotiated rate'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Deliveries ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {deliveries.map((delivery, index) => {
          const mat          = bridge.materials.find((m) => m.id === delivery.materialId)
          const originCities = uniqueCities(bridge.addresses.filter((a) => a.usage !== 'DESTINATION'))
          const destCities   = uniqueCities(bridge.addresses.filter((a) => a.usage !== 'ORIGIN' && a.id !== delivery.originAddressId))
          const originAddrs  = addressesForCity(bridge.addresses.filter((a) => a.usage !== 'DESTINATION'), delivery.originCity)
          const destAddrs    = addressesForCity(bridge.addresses.filter((a) => a.usage !== 'ORIGIN'), delivery.destinationCity, delivery.originAddressId)
          const originLabel  = bridge.addresses.find((a) => a.id === delivery.originAddressId)?.label
          const destLabel    = bridge.addresses.find((a) => a.id === delivery.destinationAddressId)?.label ?? delivery.destinationCity

          return (
            <div key={delivery.id} className="rounded-xl border border-gray-200 bg-white">

              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-600">
                    {originLabel ?? (delivery.originCity || 'Origin')}
                    <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-gray-300" />
                    {destLabel || 'Destination'}
                  </span>
                </div>
                {deliveries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDelivery(index)}
                    className="text-xs text-gray-400 transition hover:text-danger"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="space-y-4 border-t border-gray-100 p-5">

                {/* Route */}
                <div className="flex items-stretch gap-3">
                  <div className="flex flex-1 flex-col gap-2">
                    <RouteCard
                      side="origin"
                      city={delivery.originCity}
                      addressId={delivery.originAddressId}
                      allCities={originCities}
                      addresses={originAddrs}
                      onCityChange={(v) => patchDelivery(index, { originCity: v, originAddressId: '' })}
                      onAddressChange={(v) => patchDelivery(index, { originAddressId: v })}
                    />
                    <button
                      type="button"
                      onClick={() => openAddressDialog(index, 'origin')}
                      className="self-start rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-blue-400 hover:text-blue-500"
                    >
                      <Plus className="mr-1 inline h-3 w-3" />
                      Add origin address
                    </button>
                  </div>

                  <div className="flex items-center justify-center px-1">
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                  </div>

                  <div className="flex flex-1 flex-col gap-2">
                    <RouteCard
                      side="destination"
                      city={delivery.destinationCity}
                      addressId={delivery.destinationAddressId}
                      allCities={destCities}
                      addresses={destAddrs}
                      onCityChange={(v) => patchDelivery(index, { destinationCity: v, destinationAddressId: '' })}
                      onAddressChange={(v) => patchDelivery(index, { destinationAddressId: v })}
                    />
                    <button
                      type="button"
                      onClick={() => openAddressDialog(index, 'destination')}
                      className="self-start rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-emerald-400 hover:text-emerald-500"
                    >
                      <Plus className="mr-1 inline h-3 w-3" />
                      Add destination address
                    </button>
                  </div>
                </div>

                {/* Distance — only for PER_KM contract */}
                {draft.commercialType === 'CONTRACT' && draft.contractRateType === 'PER_KM' && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="max-w-[180px]">
                      <Label>Distance (KM)</Label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 320"
                        value={delivery.distanceKm}
                        onChange={(e) => patchDelivery(index, { distanceKm: e.target.value })}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                )}

                {/* Cargo — simple divider, no nested card */}
                <div className="border-t border-gray-100 pt-4">
                  {/* Row 1: Material + Sub Brand */}
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <div>
                      <Label required>Commodity</Label>
                      <div className="relative">
                        <select
                          className={SELECT_CLS}
                          value={delivery.materialId}
                          onChange={(e) => patchDelivery(index, { materialId: e.target.value })}
                        >
                          <option value="">Select material</option>
                          {bridge.materials.map((m) => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      </div>
                      {mat && <p className="mt-1 text-[11px] text-gray-400">{mat.uom} per unit</p>}
                    </div>
                    <div>
                      <Label>Sub Brand</Label>
                      <input
                        disabled
                        value={mat?.description ?? '—'}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Row 2: Quantity + Weight + Weight UOM */}
                  <div className="grid grid-cols-[1fr_1fr_120px] gap-3">
                    <div>
                      <Label required>Quantity</Label>
                      <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={delivery.quantity}
                          onChange={(e) => patchDelivery(index, { quantity: e.target.value })}
                          className="h-10 min-w-0 flex-1 bg-transparent pl-3 text-sm outline-none"
                        />
                        <div className="flex h-10 items-center border-l border-gray-200 bg-gray-50 px-3 text-xs font-bold text-gray-500">
                          {delivery.uom || mat?.uom || 'UOM'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label required>Weight</Label>
                      <div className={`flex overflow-hidden rounded-lg border bg-white focus-within:ring-4 ${
                        mat?.conversionValue && delivery.weight
                          ? 'border-primary/30 focus-within:border-primary focus-within:ring-primary/10'
                          : 'border-gray-200 focus-within:border-primary focus-within:ring-primary/10'
                      }`}>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          placeholder="0.000"
                          value={delivery.weight}
                          onChange={(e) => patchDelivery(index, { weight: e.target.value })}
                          className="h-10 min-w-0 flex-1 bg-transparent pl-3 text-sm outline-none"
                        />
                        <span className="flex items-center border-l border-gray-200 bg-gray-50 px-2.5 text-xs font-semibold text-gray-500 select-none">
                          {delivery.weightUom || 'MT'}
                        </span>
                      </div>
                      {mat?.conversionValue && mat.weightUom ? (
                        <p className="mt-1 text-[11px] text-gray-400">
                          Auto: 1 {mat.uom} = {mat.conversionValue} {mat.weightUom}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <Label>Weight UOM</Label>
                      <div className="relative">
                        <select
                          className={SELECT_CLS}
                          value={delivery.weightUom}
                          onChange={(e) => patchDelivery(index, { weightUom: e.target.value })}
                        >
                          {bridge.weightUomOptions.map((uom) => (
                            <option key={uom} value={uom}>{uom}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )
        })}

        {/* Add delivery */}
        <button
          type="button"
          onClick={addDelivery}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Add another delivery
        </button>
      </div>

      {/* ── Commercial Preview ─────────────────────────────────────────────── */}
      {commercialReady && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Commercial</p>

          {draft.commercialType === 'SPOT' && (
            <>
              {/* SPOT: manual rate entry */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label required>Freight Rate (₹ / trip)</Label>
                  <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <div className="flex h-10 items-center border-r border-gray-200 bg-gray-50 px-3 text-xs font-bold text-gray-500">₹</div>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 18000"
                      value={draft.enteredRate}
                      onChange={(e) => setDraft((p) => ({ ...p, enteredRate: e.target.value }))}
                      className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                    />
                  </div>
                </div>
                <div>
                  <Label optional>Rate Remark</Label>
                  <input
                    type="text"
                    placeholder="Any note on this rate…"
                    value={draft.deviationRemark}
                    onChange={(e) => setDraft((p) => ({ ...p, deviationRemark: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-gray-300"
                  />
                </div>
              </div>

              {/* SPOT preview row */}
              {Number(draft.enteredRate) > 0 && (
                <div className="flex flex-wrap items-end gap-x-8 gap-y-2 rounded-xl border border-gray-100 bg-slate-50/60 px-4 py-2.5">
                  <CommercialKV label="Rate Source" value="Spot · manual" />
                  <CommercialKV label="Rate Type"   value="Per Trip" />
                  <CommercialKV label="Entered Rate" value={`₹${Number(draft.enteredRate).toLocaleString('en-IN')}`} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total Freight</span>
                    <span className="text-lg font-bold text-gray-900">₹{Number(draft.enteredRate).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {draft.commercialType === 'CONTRACT' && (
            <>
              {rateLookupPending ? (
                <p className="text-sm text-gray-400">Checking rate card…</p>
              ) : matchedRateCard ? (
                <div className="flex flex-wrap items-end gap-x-8 gap-y-2 rounded-xl border border-gray-100 bg-slate-50/60 px-4 py-2.5">
                  <CommercialKV label="Rate Source"  value="Contract rate card" />
                  <CommercialKV label="Rate Type"    value={matchedRateCard.rateType.replace('PER_', 'Per ')} />
                  <CommercialKV label="Contract Rate" value={`₹${matchedRateCard.rate.toLocaleString('en-IN')}`} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total Freight</span>
                    <span className="text-lg font-bold text-gray-900">₹{matchedRateCard.rate.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <div>
                    <p className="text-sm font-semibold text-danger">No rate card found for this lane</p>
                    <p className="mt-0.5 text-xs text-red-600">No active contract covers this origin–destination. Contact operations to configure a rate card before submitting.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Special instructions — no separate card, just a labelled textarea */}
      <div>
        <Label optional>Special Instructions</Label>
        <textarea
          rows={2}
          value={draft.specialInstructions}
          onChange={(e) => setDraft((p) => ({ ...p, specialInstructions: e.target.value }))}
          placeholder="Hazmat, fragile goods, temperature-sensitive, stacking restrictions…"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-gray-400"
        />
      </div>

      {/* ── Add Destination Address Dialog ─────────────────────────────────── */}
      {addrDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAddrDialogOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <p className="text-base font-bold text-gray-900">{addrDialogTarget === 'origin' ? 'Add Origin Address' : 'Add Destination Address'}</p>
                <p className="mt-0.5 text-xs text-gray-500">The new address will be saved and immediately available in this booking.</p>
              </div>
              <button type="button" onClick={() => setAddrDialogOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
              {addrDialogError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{addrDialogError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <DlgField label="Contact Person Name *">
                  <DlgInput value={addrDraft.contactPersonName} onChange={(v) => setAddrDraft((p) => ({ ...p, contactPersonName: v }))} placeholder="e.g. Ramesh Kumar" />
                </DlgField>
                <DlgField label="Phone *">
                  <DlgInput value={addrDraft.phone} onChange={(v) => setAddrDraft((p) => ({ ...p, phone: v }))} placeholder="+91 98765 43210" />
                </DlgField>
                <DlgField label="Email">
                  <DlgInput value={addrDraft.email} onChange={(v) => setAddrDraft((p) => ({ ...p, email: v }))} placeholder="name@company.com" />
                </DlgField>
                <DlgField label="Address Name">
                  <DlgInput value={addrDraft.addressName} onChange={(v) => setAddrDraft((p) => ({ ...p, addressName: v }))} placeholder="e.g. Mumbai Warehouse" />
                </DlgField>
              </div>

              <DlgField label="Address Line 1 *">
                <DlgInput value={addrDraft.addressLine1} onChange={(v) => setAddrDraft((p) => ({ ...p, addressLine1: v }))} placeholder="Street / Building / Plot" />
              </DlgField>
              <DlgField label="Address Line 2">
                <DlgInput value={addrDraft.addressLine2} onChange={(v) => setAddrDraft((p) => ({ ...p, addressLine2: v }))} placeholder="Area / Landmark (optional)" />
              </DlgField>

              <div className="grid gap-4 md:grid-cols-5">
                <DlgField label="Pincode *">
                  <DlgInput value={addrDraft.pincode} onChange={(v) => setAddrDraft((p) => ({ ...p, pincode: v }))} placeholder="400001" />
                </DlgField>
                <DlgField label="Country">
                  <DlgInput value={addrDraft.country} onChange={(v) => setAddrDraft((p) => ({ ...p, country: v }))} />
                </DlgField>
                <DlgField label="State *">
                  <DlgInput value={addrDraft.state} onChange={(v) => setAddrDraft((p) => ({ ...p, state: v }))} placeholder="Maharashtra" />
                </DlgField>
                <DlgField label="City *">
                  <DlgInput value={addrDraft.city} onChange={(v) => setAddrDraft((p) => ({ ...p, city: v }))} placeholder="Mumbai" />
                </DlgField>
                <DlgField label="GSTIN">
                  <DlgInput value={addrDraft.gstin} onChange={(v) => setAddrDraft((p) => ({ ...p, gstin: v }))} placeholder="27AAPFU…" />
                </DlgField>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  const d = deliveries[addrDialogDeliveryIdx]
                  const city = addrDialogTarget === 'origin' ? (d?.originCity ?? '') : (d?.destinationCity ?? '')
                  setAddrDraft({ ...emptyAddressDraft(city), usage: addrDialogTarget === 'origin' ? 'ORIGIN' : 'DESTINATION' })
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Clear / Reset
              </button>
              <Button onClick={saveAddress} disabled={addrSaving}>
                {addrSaving ? 'Saving…' : 'Save Address'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-30 -mx-4 flex items-center justify-between border-t border-gray-200 bg-white/95 px-6 py-3.5 backdrop-blur sm:-mx-6 lg:-mx-8">
        <div>
          <p className="text-xs text-gray-400">Total Freight</p>
          {draft.commercialType === 'SPOT' && Number(draft.enteredRate) > 0 ? (
            <p className="text-sm font-bold text-gray-900">₹{Number(draft.enteredRate).toLocaleString('en-IN')}</p>
          ) : draft.commercialType === 'CONTRACT' && matchedRateCard ? (
            <p className="text-sm font-bold text-gray-900">₹{matchedRateCard.rate.toLocaleString('en-IN')}</p>
          ) : (
            <p className="text-sm font-semibold text-gray-400">To be calculated</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => onCreated('')} disabled={saving}>
            ← Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
            {saving ? 'Saving…' : 'Save Draft'}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Submitting…' : deliveries.length > 1 ? `Submit ${deliveries.length} Bookings` : 'Submit Booking'}
          </Button>
        </div>
      </div>

    </div>
  )
}
