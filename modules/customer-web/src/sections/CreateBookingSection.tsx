import { ArrowRight, ClipboardList } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import type { CustomerDataBridge } from '../integration/customer-data-bridge'
import { CustomerCreateBookingForm } from './CustomerCreateBookingForm'

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  bridge:            CustomerDataBridge | null
  displayName:       string
  onCreated:         (id: string) => void
  editingBookingId?: string
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
      {children}
      {required && <span className="ml-1 text-danger" aria-hidden>*</span>}
    </span>
  )
}

// ─── Standalone preview (no bridge — standalone build or preview mode) ────────

function StandaloneForm(_: { displayName: string }) {
  const ghostInput = (ph: string) => (
    <input
      disabled
      placeholder={ph}
      className="h-11 w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 text-sm text-gray-400 placeholder:text-gray-300"
    />
  )

  return (
    <div className="space-y-8 pb-24">
      {/* Preview notice */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-bold text-text">Preview mode</p>
          <p className="mt-0.5 text-sm text-gray-600">
            When embedded in your tenant workspace all dropdowns will be pre-loaded with your
            registered locations, materials, and vehicle types.
          </p>
        </div>
      </div>

      {/* Route */}
      <div>
        <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Route</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label className="flex flex-col gap-1.5">
            <FieldLabel required>Origin</FieldLabel>
            {ghostInput('Select from your registered pickup locations')}
          </label>
          <div className="flex h-11 items-center justify-center text-gray-300">
            <ArrowRight className="h-5 w-5" />
          </div>
          <label className="flex flex-col gap-1.5">
            <FieldLabel required>Destination</FieldLabel>
            {ghostInput('Select from your registered delivery locations')}
          </label>
        </div>
      </div>

      {/* Cargo */}
      <div>
        <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Cargo Details</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <FieldLabel required>Commodity</FieldLabel>
            {ghostInput('Select commodity / material')}
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel required>Quantity</FieldLabel>
            {ghostInput('e.g. 980')}
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel required>Weight (MT)</FieldLabel>
            {ghostInput('e.g. 24.5')}
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <FieldLabel>Goods Value (₹)</FieldLabel>
            {ghostInput('Declared value — e-way bill required above ₹50,000')}
          </label>
        </div>
      </div>

      {/* Schedule */}
      <div>
        <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Schedule</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Loading Date</FieldLabel>
            {ghostInput('Select pickup date')}
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Vehicle Type</FieldLabel>
            {ghostInput('Select preferred vehicle type (optional)')}
          </label>
        </div>
      </div>

      {/* Additional */}
      <div>
        <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-gray-400">Additional</p>
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Special Instructions</FieldLabel>
          {ghostInput('Hazmat, fragile, temperature-sensitive…')}
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" disabled size="lg" className="sm:min-w-[140px]">Save Draft</Button>
        <Button disabled size="lg" className="sm:min-w-[180px]">Submit Booking</Button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CreateBookingSection({ bridge, displayName, onCreated, editingBookingId }: Props) {
  if (bridge) {
    return <CustomerCreateBookingForm bridge={bridge} onCreated={onCreated} editingBookingId={editingBookingId} />
  }

  return (
    <section className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-text">{editingBookingId ? `Edit Booking — ${editingBookingId}` : 'New Booking'}</h2>
        <p className="mt-1 text-sm text-gray-500">
          Fields marked <span className="text-danger font-bold" aria-hidden>*</span> are required.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Booking Details</CardTitle></CardHeader>
        <CardContent>
          <StandaloneForm displayName={displayName} />
        </CardContent>
      </Card>
    </section>
  )
}
