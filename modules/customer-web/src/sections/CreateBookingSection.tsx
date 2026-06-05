import { Button } from '@shared-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@shared-ui/card'
import { CheckCircle2, Send } from 'lucide-react'
import type { CustomerDataBridge } from '../integration/customer-data-bridge'
import type { useCreateBooking } from '../hooks/useCreateBooking'

type Props = {
  bridge: CustomerDataBridge | null
  displayName: string
  form: ReturnType<typeof useCreateBooking>['form']
  setForm: ReturnType<typeof useCreateBooking>['setForm']
  message: string
  onSubmit: () => void
  onCreated: (id: string) => void
}

export function CreateBookingSection({ bridge, displayName, form, setForm, message, onSubmit, onCreated }: Props) {
  return (
    <>
      {bridge?.renderCreateBooking ? (
        <section className="space-y-4">
          {bridge.renderCreateBooking(onCreated)}
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Customer Booking Creation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {bridge ? (
                <>
                  {message && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">{message}</div>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Customer</span>
                      <input disabled value={displayName} className="h-11 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 text-sm text-gray-600" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Vehicle Type</span>
                      <select value={form.vehicleTypeId} onChange={(e) => setForm((f) => ({ ...f, vehicleTypeId: e.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20">
                        <option value="">Select vehicle type</option>
                        {bridge.vehicleTypes.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Origin</span>
                      <select value={form.originAddressId} onChange={(e) => setForm((f) => ({ ...f, originAddressId: e.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20">
                        <option value="">Select origin</option>
                        {bridge.addresses.filter((a) => a.usage !== 'DESTINATION').map((a) => <option key={a.id} value={a.id}>{a.label} - {a.city}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Destination</span>
                      <select value={form.destinationAddressId} onChange={(e) => setForm((f) => ({ ...f, destinationAddressId: e.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20">
                        <option value="">Select destination</option>
                        {bridge.addresses.filter((a) => a.usage !== 'ORIGIN').map((a) => <option key={a.id} value={a.id}>{a.label} - {a.city}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Commodity / Material</span>
                      <select value={form.materialId} onChange={(e) => { const m = bridge.materials.find((x) => x.id === e.target.value); setForm((f) => ({ ...f, materialId: e.target.value, uom: m?.uom ?? f.uom })) }} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20">
                        <option value="">Select material</option>
                        {bridge.materials.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Loading Date</span>
                      <input type="date" value={form.pickupDate} onChange={(e) => setForm((f) => ({ ...f, pickupDate: e.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Quantity</span>
                      <input type="number" min="0" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 980" className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">UOM</span>
                      <input value={form.uom} onChange={(e) => setForm((f) => ({ ...f, uom: e.target.value }))} placeholder="e.g. NOS / bags" className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Weight (MTS)</span>
                      <input type="number" min="0" step="0.001" value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} placeholder="e.g. 24.5" className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Goods Value (Rs)</span>
                      <input type="number" min="0" value={form.goodsValue} onChange={(e) => setForm((f) => ({ ...f, goodsValue: e.target.value }))} placeholder="E-way bill required above Rs 50,000" className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20" />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Special Instructions</span>
                      <input value={form.specialInstructions} onChange={(e) => setForm((f) => ({ ...f, specialInstructions: e.target.value }))} placeholder="Hazmat, fragile, temperature-sensitive" className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20" />
                    </label>
                  </div>
                  <div className="rounded-lg border border-primary/10 bg-primary/5 p-4">
                    <p className="text-sm font-bold text-text">Post-submission routing</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Your booking is sent to operations for rate approval, then enters the standard shipment lifecycle. Track it under My Trips / Shipments.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button onClick={onSubmit}><Send className="h-4 w-4" /> Submit Booking</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      ['Customer', displayName],
                      ['Origin', 'Select from Location Master'],
                      ['Destination', 'Select from Location Master'],
                      ['Lane', 'Auto-derived from origin and destination'],
                      ['Commodity Type', 'Select from Commodity Master'],
                      ['Vehicle Type', 'Select from Vehicle Type Master'],
                      ['Loading Date/Time', 'Future date-time picker'],
                      ['Material Quantity & UOM', 'Numeric input with UOM'],
                      ['Goods Value', 'E-way bill required above Rs 50,000'],
                      ['Special Instructions', 'Hazmat, fragile, temperature-sensitive'],
                    ].map(([label, placeholder]) => (
                      <label key={label} className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
                        <input className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20" placeholder={placeholder} />
                      </label>
                    ))}
                  </div>
                  <div className="rounded-lg border border-primary/10 bg-primary/5 p-4">
                    <p className="text-sm font-bold text-text">Post-submission routing</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Rate deviation sends the booking to Processing. Approved vendor sourcing moves to Vendor Selection. Own-fleet shipments move to Assigning Vehicle.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline">Save Draft</Button>
                    <Button><Send className="h-4 w-4" /> Submit Booking</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validation Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {['Customer Master', 'Location Master', 'Lane Master', 'Commodity Master', 'Vehicle Type Master', 'Finance AR rules'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm font-semibold text-gray-700">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </>
  )
}
